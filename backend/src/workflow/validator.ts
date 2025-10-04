import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowValidationResult,
  ValidationError,
  ValidationWarning,
  WorkflowValidator,
  WorkflowEdgeMetadata,
  CoercionMetadata,
  AdapterInsertion
} from '../types/workflow.js';
import { nodeRegistry, getNodeSignature, checkNodeCompatibility } from '../registry/node-registry.js';
import { DKEL } from '../dkel/index.js';
import { TypeChecker, DataKindLattice, Coercion } from '../types/data-kinds.js';
import { NodeSignature, NodeSignatureUtils } from '../types/node-signatures.js';
import { DataKind } from '../types/data-kinds.js';

export class WorkflowValidationService implements WorkflowValidator {
  constructor(
    private dkel: DKEL
  ) {}

  async validate(workflow: Workflow): Promise<WorkflowValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate DAG structure
    errors.push(...this.validateDAG(workflow.nodes, workflow.edges));

    // Validate node signatures and capabilities
    const signatureErrors = await this.validateNodeSignatures(workflow.nodes);
    errors.push(...signatureErrors);

    // Validate type compatibility using new signatures
    const typeErrors = await this.validateTypeCompatibility(workflow.nodes, workflow.edges);
    errors.push(...typeErrors);

    // Validate capability compatibility
    const capabilityErrors = this.validateCapabilityCompatibility(workflow.nodes);
    errors.push(...capabilityErrors);

    // Validate DKEL expressions
    const dkelErrors = await this.validateDKELExpressions(workflow);
    errors.push(...dkelErrors);

    // Validate node configurations against signatures
    const configErrors = await this.validateNodeConfigurations(workflow.nodes);
    errors.push(...configErrors);

    // Generate warnings
    warnings.push(...this.generateWarnings(workflow));

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: this.generateSuggestions(errors, warnings)
    };
  }

  validateDAG(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));
    const edgeIds = new Set<string>();

    // Check for duplicate node IDs
    const seenNodeIds = new Set<string>();
    for (const node of nodes) {
      if (seenNodeIds.has(node.id)) {
        errors.push({
          type: 'dag',
          message: `Duplicate node ID: ${node.id}`,
          node_id: node.id
        });
      }
      seenNodeIds.add(node.id);
    }

    // Check for duplicate edge IDs
    const seenEdgeIds = new Set<string>();
    for (const edge of edges) {
      if (seenEdgeIds.has(edge.id)) {
        errors.push({
          type: 'dag',
          message: `Duplicate edge ID: ${edge.id}`,
          edge_id: edge.id
        });
      }
      seenEdgeIds.add(edge.id);
    }

    // Check for invalid node references in edges
    for (const edge of edges) {
      if (!nodeIds.has(edge.source_node_id)) {
        errors.push({
          type: 'dag',
          message: `Edge ${edge.id} references non-existent source node: ${edge.source_node_id}`,
          edge_id: edge.id
        });
      }

      if (!nodeIds.has(edge.target_node_id)) {
        errors.push({
          type: 'dag',
          message: `Edge ${edge.id} references non-existent target node: ${edge.target_node_id}`,
          edge_id: edge.id
        });
      }
    }

    // Check for cycles using topological sort
    const cycleErrors = this.detectCycles(nodes, edges);
    errors.push(...cycleErrors);

    // Check for disconnected components
    const components = this.findConnectedComponents(nodes, edges);
    if (components.length > 1) {
      errors.push({
        type: 'dag',
        message: `Workflow has ${components.length} disconnected components. All nodes should be connected.`
      });
    }

    return errors;
  }

  private async validateNodeSignatures(nodes: WorkflowNode[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const node of nodes) {
      const signature = getNodeSignature(node.type);

      if (!signature) {
        errors.push({
          type: 'configuration',
          message: `Unknown node type: ${node.type}`,
          node_id: node.id,
          details: { node_type: node.type }
        });
        continue;
      }

      // Validate signature completeness
      const signatureValidation = NodeSignatureUtils.validateSignature(signature);
      if (!signatureValidation.valid) {
        errors.push({
          type: 'configuration',
          message: `Invalid node signature for ${node.type}: ${signatureValidation.errors.join(', ')}`,
          node_id: node.id,
          details: {
            node_type: node.type,
            signature_errors: signatureValidation.errors
          }
        });
      }

      // Validate port counts match signature
      if (node.input_ports.length !== signature.inputs.length) {
        errors.push({
          type: 'configuration',
          message: `Node ${node.id} has ${node.input_ports.length} input ports but signature requires ${signature.inputs.length}`,
          node_id: node.id,
          details: {
            actual_inputs: node.input_ports.length,
            expected_inputs: signature.inputs.length
          }
        });
      }

      if (node.output_ports.length !== signature.outputs.length) {
        errors.push({
          type: 'configuration',
          message: `Node ${node.id} has ${node.output_ports.length} output ports but signature requires ${signature.outputs.length}`,
          node_id: node.id,
          details: {
            actual_outputs: node.output_ports.length,
            expected_outputs: signature.outputs.length
          }
        });
      }
    }

    return errors;
  }

  async validateTypeCompatibility(nodes: WorkflowNode[], edges: WorkflowEdge[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const MAX_COST_BOUND = 10; // Configurable maximum cost for adapter chains

    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source_node_id);
      const targetNode = nodes.find(n => n.id === edge.target_node_id);

      if (!sourceNode || !targetNode) continue;

      const sourceSignature = getNodeSignature(sourceNode.type);
      const targetSignature = getNodeSignature(targetNode.type);

      if (!sourceSignature || !targetSignature) continue;

      // Find the specific ports being connected
      let sourcePort = null;
      let targetPort = null;

      if (edge.source_port) {
        sourcePort = sourceSignature.outputs.find(p => p.id === edge.source_port);
      } else if (sourceSignature.outputs.length === 1) {
        sourcePort = sourceSignature.outputs[0];
      }

      if (edge.target_port) {
        targetPort = targetSignature.inputs.find(p => p.id === edge.target_port);
      } else if (targetSignature.inputs.length === 1) {
        targetPort = targetSignature.inputs[0];
      }

      if (!sourcePort || !targetPort) {
        errors.push({
          type: 'type_compatibility',
          message: `Cannot find compatible ports for edge ${edge.id}`,
          edge_id: edge.id,
          details: {
            source_node: edge.source_node_id,
            target_node: edge.target_node_id,
            source_port: edge.source_port,
            target_port: edge.target_port
          }
        });
        continue;
      }

      // Check port compatibility using enhanced TypeChecker
      const compatibility = TypeChecker.checkPortCompatibility(
        { dataKind: sourcePort.dataKind, facets: sourcePort.facets },
        { dataKind: targetPort.dataKind, facets: targetPort.facets }
      );

      // Initialize or update edge metadata
      if (!edge.metadata) {
        edge.metadata = {};
      }

      // Store type compatibility information
      edge.metadata.typeCompatibility = {
        sourceKind: sourcePort.dataKind,
        targetKind: targetPort.dataKind,
        compatible: compatibility.compatible,
        subtyping: DataKindLattice.isSubtype(sourcePort.dataKind, targetPort.dataKind),
        coercionChain: compatibility.coercionChain?.map(c => ({
          from: c.from,
          to: c.to,
          cost: c.cost,
          safe: c.safe,
          adapter: c.adapter,
          description: c.description
        })),
        totalCost: compatibility.totalCost,
        maxCostBound: MAX_COST_BOUND
      };

      if (!compatibility.compatible) {
        // Check if there's an adapter chain within cost bounds
        const adapterChain = DataKindLattice.findCoercionChainDijkstra(
          sourcePort.dataKind,
          targetPort.dataKind,
          MAX_COST_BOUND
        );

        if (adapterChain.length > 0) {
          // Suggest adapter insertion
          const totalCost = adapterChain.reduce((sum, c) => sum + c.cost, 0);
          const adapterSuggestions = this.generateAdapterSuggestions(edge, adapterChain, sourceNode, targetNode);

          errors.push({
            type: 'type_compatibility',
            message: `Type mismatch: ${sourcePort.dataKind} → ${targetPort.dataKind}. Adapter chain available (cost: ${totalCost})`,
            edge_id: edge.id,
            details: {
              source_type: sourcePort.dataKind,
              target_type: targetPort.dataKind,
              adapter_chain: adapterChain.map(c => `${c.from} → ${c.to} (${c.adapter})`),
              total_cost: totalCost,
              max_cost_bound: MAX_COST_BOUND,
              suggestions: adapterSuggestions
            }
          });

          // Store adapter suggestions in metadata
          edge.metadata.adapters = adapterSuggestions.map(suggestion => ({
            id: suggestion.id,
            type: 'adapter',
            coercion: {
              from: suggestion.coercion.from,
              to: suggestion.coercion.to,
              cost: suggestion.coercion.cost,
              safe: suggestion.coercion.safe,
              adapter: suggestion.coercion.adapter,
              description: suggestion.coercion.description
            },
            position: suggestion.position,
            inserted: false,
            source_edge_id: edge.id
          }));
        } else {
          // No adapter chain available
          errors.push({
            type: 'type_compatibility',
            message: `Incompatible data types: ${sourcePort.dataKind} → ${targetPort.dataKind}. No adapter chain found within cost bound (${MAX_COST_BOUND})`,
            edge_id: edge.id,
            details: {
              source_type: sourcePort.dataKind,
              target_type: targetPort.dataKind,
              errors: compatibility.errors,
              warnings: compatibility.warnings
            }
          });
        }
      }
    }

    return errors;
  }

  private validateCapabilityCompatibility(nodes: WorkflowNode[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check pairwise capability compatibility for nodes that might run concurrently
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        const compatibility = checkNodeCompatibility(nodeA.type, nodeB.type);

        if (!compatibility.compatible) {
          // Only report conflicts that would prevent concurrent execution
          if (compatibility.resource_conflicts.length > 0) {
            errors.push({
              type: 'configuration',
              message: `Resource conflict between ${nodeA.type} and ${nodeB.type}: ${compatibility.resource_conflicts.join(', ')}`,
              node_id: nodeA.id,
              details: {
                node_a: nodeA.type,
                node_b: nodeB.type,
                conflicts: compatibility.conflicts,
                resource_conflicts: compatibility.resource_conflicts
              }
            });
          }
        }
      }
    }

    return errors;
  }

  async validateDKELExpressions(workflow: Workflow): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const edge of workflow.edges) {
      if (edge.condition) {
        try {
          // Parse and evaluate the DKEL expression
          const result = this.dkel.evaluate(edge.condition, {
            input: {},
            workflow: { state: {} },
            node: { config: {} }
          });

          if (result.errors.length > 0) {
            errors.push({
              type: 'dkel',
              message: `Invalid DKEL expression in edge ${edge.id}: ${result.errors.join(', ')}`,
              edge_id: edge.id,
              details: { expression: edge.condition, errors: result.errors }
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            type: 'dkel',
            message: `Invalid DKEL expression in edge ${edge.id}: ${errorMessage}`,
            edge_id: edge.id,
            details: { expression: edge.condition, error: errorMessage }
          });
        }
      }
    }

    return errors;
  }

  private async validateNodeConfigurations(nodes: WorkflowNode[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const node of nodes) {
      const signature = getNodeSignature(node.type);

      if (!signature) {
        // Already validated in validateNodeSignatures
        continue;
      }

      // Validate configuration against signature schema if present
      if (signature.configuration_schema) {
        const configErrors = this.validateConfigurationValues(node.configuration, signature.configuration_schema);
        errors.push(...configErrors.map(err => ({ ...err, node_id: node.id })));
      }

      // Validate required inputs are provided
      for (const inputPort of signature.inputs) {
        if (inputPort.required && !(inputPort.id in node.inputs)) {
          errors.push({
            type: 'configuration',
            message: `Required input '${inputPort.name}' (${inputPort.id}) is missing`,
            node_id: node.id,
            details: { port_id: inputPort.id, port_name: inputPort.name }
          });
        }
      }
    }

    return errors;
  }

  private validateConfigurationValues(config: Record<string, any>, schema: any): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [key, value] of Object.entries(config)) {
      const propSchema = schema.properties?.[key];
      if (propSchema) {
        // Basic type checking
        if (propSchema.type === 'string' && typeof value !== 'string') {
          errors.push({
            type: 'configuration',
            message: `Property '${key}' must be a string`,
            details: { property: key, expected: 'string', actual: typeof value }
          });
        } else if (propSchema.type === 'number' && typeof value !== 'number') {
          errors.push({
            type: 'configuration',
            message: `Property '${key}' must be a number`,
            details: { property: key, expected: 'number', actual: typeof value }
          });
        } else if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
          errors.push({
            type: 'configuration',
            message: `Property '${key}' must be a boolean`,
            details: { property: key, expected: 'boolean', actual: typeof value }
          });
        }

        // Range validation for numbers
        if (propSchema.type === 'number' && typeof value === 'number') {
          if (propSchema.minimum !== undefined && value < propSchema.minimum) {
            errors.push({
              type: 'configuration',
              message: `Property '${key}' must be >= ${propSchema.minimum}`,
              details: { property: key, value, minimum: propSchema.minimum }
            });
          }
          if (propSchema.maximum !== undefined && value > propSchema.maximum) {
            errors.push({
              type: 'configuration',
              message: `Property '${key}' must be <= ${propSchema.maximum}`,
              details: { property: key, value, maximum: propSchema.maximum }
            });
          }
        }
      }
    }

    return errors;
  }

  private detectCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const graph = this.buildAdjacencyList(edges);
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (hasCycle(node.id)) {
        errors.push({
          type: 'dag',
          message: `Workflow contains a cycle involving node ${node.id}`,
          node_id: node.id
        });
        break; // Only report first cycle found
      }
    }

    return errors;
  }

  private findConnectedComponents(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[][] {
    const graph = this.buildAdjacencyList(edges);
    const visited = new Set<string>();
    const components: string[][] = [];

    const dfs = (nodeId: string, component: string[]) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      component.push(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, component);
      }

      // Also check reverse edges
      for (const [from, tos] of graph.entries()) {
        if (tos.includes(nodeId) && !visited.has(from)) {
          dfs(from, component);
        }
      }
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const component: string[] = [];
        dfs(node.id, component);
        components.push(component);
      }
    }

    return components;
  }

  private buildAdjacencyList(edges: WorkflowEdge[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const edge of edges) {
      if (!graph.has(edge.source_node_id)) {
        graph.set(edge.source_node_id, []);
      }
      graph.get(edge.source_node_id)!.push(edge.target_node_id);
    }

    return graph;
  }

  private areTypesCompatible(sourceType: string, targetType: string): boolean {
    // Basic type compatibility - could be enhanced with more sophisticated type checking
    if (sourceType === targetType) return true;

    // Allow any type to be assigned to 'any'
    if (targetType === 'dk://types/any') return true;

    // String compatibility
    if (sourceType === 'dk://types/string' && ['dk://types/string'].includes(targetType)) return true;

    // Number compatibility
    if (sourceType === 'dk://types/number' && ['dk://types/number'].includes(targetType)) return true;

    // Boolean compatibility
    if (sourceType === 'dk://types/boolean' && ['dk://types/boolean'].includes(targetType)) return true;

    return false;
  }

  private generateWarnings(workflow: Workflow): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for nodes without connections
    const connectedNodes = new Set<string>();
    for (const edge of workflow.edges) {
      connectedNodes.add(edge.source_node_id);
      connectedNodes.add(edge.target_node_id);
    }

    for (const node of workflow.nodes) {
      if (!connectedNodes.has(node.id)) {
        warnings.push({
          type: 'best_practice',
          message: `Node ${node.id} is not connected to any other nodes`,
          node_id: node.id,
          suggestion: 'Consider connecting this node or removing it if unused'
        });
      }
    }

    // Check for very long workflows
    if (workflow.nodes.length > 50) {
      warnings.push({
        type: 'performance',
        message: `Workflow has ${workflow.nodes.length} nodes, which may impact performance`,
        suggestion: 'Consider breaking down into smaller sub-workflows'
      });
    }

    return warnings;
  }

  private generateSuggestions(errors: ValidationError[], warnings: ValidationWarning[]): string[] {
    const suggestions: string[] = [];

    if (errors.some(e => e.type === 'dag')) {
      suggestions.push('Fix DAG structure issues by removing cycles and ensuring all nodes are connected');
    }

    if (errors.some(e => e.type === 'type_compatibility')) {
      suggestions.push('Review type mismatches and ensure compatible data types between connected nodes');
    }

    if (errors.some(e => e.type === 'dkel')) {
      suggestions.push('Fix DKEL expression syntax errors and ensure proper variable references');
    }

    if (warnings.some(w => w.type === 'performance')) {
      suggestions.push('Consider optimizing workflow performance by reducing node count or using parallel execution');
    }

    return suggestions;
  }

  private mapSchemaRefToDataKind(schemaRef: string): DataKind {
    // Map legacy schema references to new DataKind enums
    const mapping: Record<string, DataKind> = {
      "dk://types/string": DataKind.TEXT_PLAIN,
      "dk://types/number": DataKind.TEXT_PLAIN, // Numbers as text for now
      "dk://types/boolean": DataKind.TEXT_PLAIN, // Booleans as text for now
      "dk://types/any": DataKind.TEXT_PLAIN, // Default to text/plain
    };

    return mapping[schemaRef] || DataKind.TEXT_PLAIN;
  }

  private generateAdapterSuggestions(
    edge: WorkflowEdge,
    adapterChain: Coercion[],
    sourceNode: WorkflowNode,
    targetNode: WorkflowNode
  ): Array<{
    id: string;
    coercion: Coercion;
    position: { x: number; y: number };
  }> {
    const suggestions: Array<{
      id: string;
      coercion: Coercion;
      position: { x: number; y: number };
    }> = [];

    // Calculate base position between source and target nodes
    const sourcePos = sourceNode.position || { x: 0, y: 0 };
    const targetPos = targetNode.position || { x: 100, y: 0 };
    const midX = (sourcePos.x + targetPos.x) / 2;
    const midY = (sourcePos.y + targetPos.y) / 2;

    // Generate suggestions for each coercion in the chain
    adapterChain.forEach((coercion, index) => {
      const offsetX = (index - (adapterChain.length - 1) / 2) * 150; // Spread adapters horizontally
      const offsetY = Math.abs(index - (adapterChain.length - 1) / 2) * 50; // Slight vertical offset

      suggestions.push({
        id: `adapter_${edge.id}_${index}`,
        coercion,
        position: {
          x: midX + offsetX,
          y: midY + offsetY
        }
      });
    });

    return suggestions;
  }
}
