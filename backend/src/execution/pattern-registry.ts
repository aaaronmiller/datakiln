import {
  WorkflowPattern,
  PatternComposition,
  PatternRegistry as IPatternRegistry,
  WorkflowNode,
  WorkflowEdge,
  PatternInstance
} from '../types/execution.js';

/**
 * Pattern Registry for managing reusable workflow patterns
 */
export class PatternRegistry implements IPatternRegistry {
  private patterns: Map<string, WorkflowPattern> = new Map();
  private patternCompositions: Map<string, PatternComposition> = new Map();

  /**
   * Register a new workflow pattern
   */
  async register(pattern: WorkflowPattern): Promise<void> {
    // Validate pattern structure
    this.validatePattern(pattern);

    // Generate ID if not provided
    if (!pattern.id) {
      pattern.id = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Get a pattern by ID
   */
  async get(id: string): Promise<WorkflowPattern | null> {
    return this.patterns.get(id) || null;
  }

  /**
   * List all registered patterns
   */
  async list(): Promise<WorkflowPattern[]> {
    return Array.from(this.patterns.values());
  }

  /**
   * Search patterns by criteria
   */
  async search(criteria: {
    tags?: string[];
    category?: string;
    name?: string;
  }): Promise<WorkflowPattern[]> {
    const patterns = Array.from(this.patterns.values());

    return patterns.filter(pattern => {
      if (criteria.tags && criteria.tags.length > 0) {
        const hasAllTags = criteria.tags.every(tag => pattern.tags?.includes(tag));
        if (!hasAllTags) return false;
      }

      if (criteria.category && pattern.category !== criteria.category) {
        return false;
      }

      if (criteria.name && !pattern.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }

      return true;
    });
  }

  /**
   * Delete a pattern
   */
  async delete(id: string): Promise<boolean> {
    return this.patterns.delete(id);
  }

  /**
   * Create a pattern from a workflow subgraph
   */
  async createFromSubgraph(
    workflowId: string,
    nodeIds: string[],
    name: string,
    description?: string
  ): Promise<WorkflowPattern> {
    // This would extract nodes and edges from a workflow
    // For now, return a placeholder
    const pattern: WorkflowPattern = {
      id: `pattern_${Date.now()}`,
      name,
      description: description || `Pattern extracted from workflow ${workflowId}`,
      category: 'extracted',
      tags: ['extracted', workflowId],
      inputPorts: [],
      outputPorts: [],
      nodes: [],
      edges: [],
      metadata: {
        sourceWorkflow: workflowId,
        extractedNodes: nodeIds,
        createdAt: new Date().toISOString()
      }
    };

    await this.register(pattern);
    return pattern;
  }

  /**
   * Compose multiple patterns into a larger workflow
   */
  async composePatterns(
    composition: PatternComposition
  ): Promise<WorkflowPattern> {
    const composedPattern: WorkflowPattern = {
      id: `composed_${Date.now()}`,
      name: composition.name,
      description: composition.description,
      category: 'composed',
      tags: ['composed', ...composition.patterns.map(p => p.id)],
      inputPorts: [],
      outputPorts: [],
      nodes: [],
      edges: [],
      metadata: {
        compositionId: composition.id,
        composedPatterns: composition.patterns.map(p => p.id),
        createdAt: new Date().toISOString()
      }
    };

    // Compose the patterns
    let nodeIdCounter = 0;
    const nodeIdMap = new Map<string, string>();

    for (const patternRef of composition.patterns) {
      const pattern = await this.get(patternRef.patternId);
      if (!pattern) {
        throw new Error(`Pattern ${patternRef.patternId} not found`);
      }

      // Add pattern nodes with new IDs
      for (const node of pattern.nodes) {
        const newNodeId = `node_${nodeIdCounter++}`;
        nodeIdMap.set(`${patternRef.patternId}:${node.id}`, newNodeId);

        const newNode: WorkflowNode = {
          ...node,
          id: newNodeId,
          // Apply pattern configuration overrides
          configuration: {
            ...node.configuration,
            ...patternRef.configuration
          }
        };

        composedPattern.nodes.push(newNode);
      }

      // Add pattern edges with remapped node IDs
      for (const edge of pattern.edges) {
        const newSourceId = nodeIdMap.get(`${patternRef.patternId}:${edge.source_node_id}`);
        const newTargetId = nodeIdMap.get(`${patternRef.patternId}:${edge.target_node_id}`);

        if (newSourceId && newTargetId) {
          composedPattern.edges.push({
            ...edge,
            id: `edge_${nodeIdCounter++}`,
            source_node_id: newSourceId,
            target_node_id: newTargetId
          });
        }
      }
    }

    // Add inter-pattern connections
    for (const connection of composition.connections) {
      const sourceNodeId = nodeIdMap.get(`${connection.sourcePatternId}:${connection.sourceNodeId}`);
      const targetNodeId = nodeIdMap.get(`${connection.targetPatternId}:${connection.targetNodeId}`);

      if (sourceNodeId && targetNodeId) {
        composedPattern.edges.push({
          id: `connection_${nodeIdCounter++}`,
          source_node_id: sourceNodeId,
          target_node_id: targetNodeId,
          source_port: connection.sourcePort,
          target_port: connection.targetPort
        });
      }
    }

    await this.register(composedPattern);
    this.patternCompositions.set(composition.id, composition);

    return composedPattern;
  }

  /**
   * Instantiate a pattern with specific inputs
   */
  async instantiate(
    patternId: string,
    inputs: Record<string, any>,
    instanceId?: string
  ): Promise<PatternInstance> {
    const pattern = await this.get(patternId);
    if (!pattern) {
      throw new Error(`Pattern ${patternId} not found`);
    }

    const instance: PatternInstance = {
      instanceId: instanceId || `instance_${Date.now()}`,
      patternId,
      executionId: '', // Set by caller
      inputs,
      status: 'created',
      startTime: Date.now()
    };

    return instance;
  }

  /**
   * Validate pattern structure
   */
  private validatePattern(pattern: WorkflowPattern): void {
    if (!pattern.name) {
      throw new Error('Pattern must have a name');
    }

    if (!pattern.nodes || pattern.nodes.length === 0) {
      throw new Error('Pattern must have at least one node');
    }

    // Check for duplicate node IDs within the pattern
    const nodeIds = new Set<string>();
    for (const node of pattern.nodes) {
      if (nodeIds.has(node.id)) {
        throw new Error(`Duplicate node ID in pattern: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    // Validate edges reference existing nodes
    const validNodeIds = new Set(pattern.nodes.map(n => n.id));
    for (const edge of pattern.edges || []) {
      if (!validNodeIds.has(edge.source_node_id)) {
        throw new Error(`Edge references invalid source node: ${edge.source_node_id}`);
      }
      if (!validNodeIds.has(edge.target_node_id)) {
        throw new Error(`Edge references invalid target node: ${edge.target_node_id}`);
      }
    }
  }

  /**
   * Get pattern composition by ID
   */
  async getComposition(id: string): Promise<PatternComposition | null> {
    return this.patternCompositions.get(id) || null;
  }

  /**
   * List all pattern compositions
   */
  async listCompositions(): Promise<PatternComposition[]> {
    return Array.from(this.patternCompositions.values());
  }
}