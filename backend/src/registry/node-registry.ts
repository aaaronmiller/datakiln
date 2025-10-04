// Node Registry with Formal Signatures
// Implements the node registry supporting ⟨I,O,C⟩ signatures from workflow_model.md

import {
  NodeSignature,
  NodeSignatureRegistry,
  NodeRegistryEntry,
  NodeSignatureUtils,
  NodeCategory
} from '../types/node-signatures.js';
import { NODE_SIGNATURES, getNodesByCategory } from '../types/node-definitions.js';
import { TypeChecker } from '../types/data-kinds.js';

export class NodeRegistry {
  private signatures: Map<string, NodeSignature> = new Map();
  private registry!: NodeSignatureRegistry;

  constructor() {
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    // Load all predefined node signatures
    for (const [nodeType, signature] of Object.entries(NODE_SIGNATURES)) {
      this.signatures.set(nodeType, signature);
    }

    // Build compatibility matrix
    const compatibilityMatrix: Record<string, Record<string, any>> = {};
    const nodeTypes = Array.from(this.signatures.keys());

    for (const typeA of nodeTypes) {
      compatibilityMatrix[typeA] = {};
      for (const typeB of nodeTypes) {
        if (typeA !== typeB) {
          const sigA = this.signatures.get(typeA)!;
          const sigB = this.signatures.get(typeB)!;
          compatibilityMatrix[typeA][typeB] = NodeSignatureUtils.checkCompatibility(sigA, sigB);
        }
      }
    }

    this.registry = {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      signatures: Object.fromEntries(this.signatures),
      templates: {}, // Will be populated separately
      compatibility_matrix: compatibilityMatrix
    };
  }

  /**
   * Get a node signature by type
   */
  getSignature(nodeType: string): NodeSignature | null {
    return this.signatures.get(nodeType) || null;
  }

  /**
   * Get all available node types
   */
  getAllNodeTypes(): string[] {
    return Array.from(this.signatures.keys());
  }

  /**
   * Get nodes by category
   */
  getNodesByCategory(category: NodeCategory): Record<string, NodeSignature> {
    return getNodesByCategory(category);
  }

  /**
   * Get all categories
   */
  getAllCategories(): NodeCategory[] {
    return Object.values(NodeCategory);
  }

  /**
   * Check if two node types are compatible for concurrent execution
   */
  checkCompatibility(nodeTypeA: string, nodeTypeB: string): any {
    return this.registry.compatibility_matrix[nodeTypeA]?.[nodeTypeB] || {
      compatible: false,
      conflicts: ['Unknown node types'],
      resource_conflicts: [],
      scheduling_constraints: []
    };
  }

  /**
   * Validate a node signature
   */
  validateSignature(signature: NodeSignature): { valid: boolean; errors: string[]; warnings: string[] } {
    return NodeSignatureUtils.validateSignature(signature);
  }

  /**
   * Register a new custom node signature
   */
  registerCustomNode(nodeType: string, signature: NodeSignature): boolean {
    const validation = this.validateSignature(signature);

    if (!validation.valid) {
      console.error(`Invalid node signature for ${nodeType}:`, validation.errors);
      return false;
    }

    if (this.signatures.has(nodeType)) {
      console.warn(`Node type ${nodeType} already exists, overwriting`);
    }

    this.signatures.set(nodeType, signature);

    // Update compatibility matrix
    this.updateCompatibilityMatrix(nodeType);

    return true;
  }

  private updateCompatibilityMatrix(newNodeType: string): void {
    const newSig = this.signatures.get(newNodeType)!;

    // Add compatibility entries for the new node
    if (!this.registry.compatibility_matrix[newNodeType]) {
      this.registry.compatibility_matrix[newNodeType] = {};
    }

    for (const [existingType, existingSig] of this.signatures) {
      if (existingType !== newNodeType) {
        this.registry.compatibility_matrix[newNodeType][existingType] =
          NodeSignatureUtils.checkCompatibility(newSig, existingSig);

        this.registry.compatibility_matrix[existingType][newNodeType] =
          NodeSignatureUtils.checkCompatibility(existingSig, newSig);
      }
    }
  }

  /**
   * Get resource requirements for a set of node types
   */
  getResourceRequirements(nodeTypes: string[]): any {
    const signatures = nodeTypes
      .map(type => this.signatures.get(type))
      .filter((sig): sig is NodeSignature => sig !== undefined);

    return NodeSignatureUtils.aggregateResourceRequirements(signatures);
  }

  /**
   * Get the complete registry
   */
  getRegistry(): NodeSignatureRegistry {
    return this.registry;
  }

  /**
   * Export registry to JSON
   */
  exportToJson(): string {
    return JSON.stringify(this.registry, null, 2);
  }

  /**
   * Find nodes that can produce a specific data kind
   */
  findProducersForDataKind(dataKind: string): string[] {
    const producers: string[] = [];

    for (const [nodeType, signature] of this.signatures) {
      const producesDataKind = signature.outputs.some(port => port.dataKind === dataKind);
      if (producesDataKind) {
        producers.push(nodeType);
      }
    }

    return producers;
  }

  /**
   * Find nodes that can consume a specific data kind
   */
  findConsumersForDataKind(dataKind: string): string[] {
    const consumers: string[] = [];

    for (const [nodeType, signature] of this.signatures) {
      const consumesDataKind = signature.inputs.some(port => port.dataKind === dataKind);
      if (consumesDataKind) {
        consumers.push(nodeType);
      }
    }

    return consumers;
  }

  /**
   * Get suggested connections between nodes
   */
  getSuggestedConnections(sourceNodeType: string, targetNodeType: string): {
    compatible: boolean;
    suggestions: Array<{
      sourcePort: string;
      targetPort: string;
      adapters?: string[];
    }>;
  } {
    const sourceSig = this.signatures.get(sourceNodeType);
    const targetSig = this.signatures.get(targetNodeType);

    if (!sourceSig || !targetSig) {
      return { compatible: false, suggestions: [] };
    }

    const suggestions: Array<{
      sourcePort: string;
      targetPort: string;
      adapters?: string[];
    }> = [];

    // Check all port combinations
    for (const sourcePort of sourceSig.outputs) {
      for (const targetPort of targetSig.inputs) {
        const compatibility = TypeChecker.checkPortCompatibility(
          { dataKind: sourcePort.dataKind, facets: sourcePort.facets },
          { dataKind: targetPort.dataKind, facets: targetPort.facets }
        );

        if (compatibility.compatible) {
          suggestions.push({
            sourcePort: sourcePort.id,
            targetPort: targetPort.id,
            adapters: compatibility.coercionChain?.map((c: any) => c.adapter).filter(Boolean) as string[]
          });
        }
      }
    }

    return {
      compatible: suggestions.length > 0,
      suggestions
    };
  }

  /**
   * Get nodes with specific capabilities
   */
  findNodesWithCapabilities(capabilities: string[]): string[] {
    const matchingNodes: string[] = [];

    for (const [nodeType, signature] of this.signatures) {
      const hasAllCapabilities = capabilities.every(cap =>
        signature.capabilities.side_effects.includes(cap as any) ||
        signature.capabilities.concurrency === cap ||
        Object.keys(signature.capabilities.resources).includes(cap)
      );

      if (hasAllCapabilities) {
        matchingNodes.push(nodeType);
      }
    }

    return matchingNodes;
  }
}

// Singleton instance
export const nodeRegistry = new NodeRegistry();

// Helper functions for common operations
export function getNodeSignature(nodeType: string): NodeSignature | null {
  return nodeRegistry.getSignature(nodeType);
}

export function validateNodeSignature(signature: NodeSignature): { valid: boolean; errors: string[]; warnings: string[] } {
  return nodeRegistry.validateSignature(signature);
}

export function checkNodeCompatibility(nodeTypeA: string, nodeTypeB: string): any {
  return nodeRegistry.checkCompatibility(nodeTypeA, nodeTypeB);
}

export function getSuggestedNodeConnections(sourceType: string, targetType: string): {
  compatible: boolean;
  suggestions: Array<{
    sourcePort: string;
    targetPort: string;
    adapters?: string[];
  }>;
} {
  return nodeRegistry.getSuggestedConnections(sourceType, targetType);
}