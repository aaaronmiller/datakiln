// Data Kind Lattice and Type System
// Implements the partially ordered set T of DataKinds with subtyping ⊑
// as specified in workflow_model.md

export enum DataKind {
  // Text hierarchy: text/plain ⊑ text/markdown ⊑ text/semantic
  TEXT_PLAIN = 'text/plain',
  TEXT_MARKDOWN = 'text/markdown',
  TEXT_SEMANTIC = 'text/semantic',

  // URI hierarchy: html/url ⊑ uri
  HTML_URL = 'html/url',
  URI = 'uri',

  // JSON hierarchy: json ⊑ text/plain
  JSON = 'json',

  // Other base types
  FILE_PATH = 'file/path',
  DOM_CLIPBOARD = 'dom/clipboard',
  DOM_ELEMENT = 'dom/element',
  BYTES_BLOB = 'bytes/blob',
  TRANSCRIPT_VTT = 'transcript/vtt',
  ARTIFACT_REF = 'artifact/ref'
}

// Subtyping lattice definition
// Maps each DataKind to its supertypes (kinds it can be subtype of)
export const SUBTYPING_LATTICE: Record<DataKind, DataKind[]> = {
  [DataKind.TEXT_PLAIN]: [],
  [DataKind.TEXT_MARKDOWN]: [DataKind.TEXT_PLAIN],
  [DataKind.TEXT_SEMANTIC]: [DataKind.TEXT_MARKDOWN, DataKind.TEXT_PLAIN],
  [DataKind.HTML_URL]: [DataKind.URI], // html/url ⊑ uri
  [DataKind.URI]: [],
  [DataKind.JSON]: [DataKind.TEXT_PLAIN],
  [DataKind.FILE_PATH]: [],
  [DataKind.DOM_CLIPBOARD]: [],
  [DataKind.DOM_ELEMENT]: [],
  [DataKind.BYTES_BLOB]: [],
  [DataKind.TRANSCRIPT_VTT]: [],
  [DataKind.ARTIFACT_REF]: []
};

// Facets that can be attached to data kinds
export interface DataFacet {
  encoding?: string; // e.g., 'utf-8', 'base64'
  locale?: string;   // e.g., 'en-US', 'zh-CN'
  mime?: string;     // MIME type override
  schema?: string;   // JSON schema reference
  size?: {
    min?: number;
    max?: number;
  };
}

// Port contract combining data kind with facets and constraints
export interface PortContract {
  dataKind: DataKind;
  facets?: DataFacet;
  constraints?: {
    required?: boolean;
    sanitization?: string[]; // e.g., ['html-escape', 'url-encode']
    validation?: string[];   // e.g., ['json-schema', 'url-format']
  };
}

// Coercion represents a type conversion with cost and safety
export interface Coercion {
  from: DataKind;
  to: DataKind;
  cost: number; // Lower cost = preferred conversion
  safe: boolean; // Whether conversion is side-effect free
  adapter?: string; // Name of adapter function/node
  description?: string;
}

// Coercion graph A ⊆ T × T
export const COERCION_GRAPH: Coercion[] = [
  // Safe coercions (side-effect free)
  {
    from: DataKind.TEXT_PLAIN,
    to: DataKind.TEXT_MARKDOWN,
    cost: 1,
    safe: true,
    adapter: 'markdown-wrap',
    description: 'Wrap plain text as markdown'
  },
  {
    from: DataKind.TEXT_MARKDOWN,
    to: DataKind.TEXT_SEMANTIC,
    cost: 2,
    safe: true,
    adapter: 'semantic-extract',
    description: 'Extract semantic content from markdown'
  },
  {
    from: DataKind.HTML_URL,
    to: DataKind.URI,
    cost: 1,
    safe: true,
    adapter: 'url-parse',
    description: 'Parse URL from HTML content'
  },
  {
    from: DataKind.JSON,
    to: DataKind.TEXT_PLAIN,
    cost: 1,
    safe: true,
    adapter: 'json-stringify',
    description: 'Convert JSON to string representation'
  },

  // Unsafe coercions (require user consent or adapters)
  {
    from: DataKind.DOM_CLIPBOARD,
    to: DataKind.HTML_URL,
    cost: 5,
    safe: false,
    adapter: 'clipboard-url-extract',
    description: 'Extract URL from clipboard content (requires parsing)'
  },
  {
    from: DataKind.TEXT_PLAIN,
    to: DataKind.HTML_URL,
    cost: 3,
    safe: false,
    adapter: 'text-to-url',
    description: 'Parse URL from plain text'
  }
];

// Lattice operations
export class DataKindLattice {
  /**
   * Check if kind A is a subtype of kind B (A ⊑ B)
   */
  static isSubtype(a: DataKind, b: DataKind): boolean {
    if (a === b) return true;

    // Check direct supertypes
    const supertypes = SUBTYPING_LATTICE[a];
    if (supertypes.includes(b)) return true;

    // Check transitive supertypes
    return supertypes.some(superType => this.isSubtype(superType, b));
  }

  /**
   * Find the least upper bound (join) of two data kinds
   */
  static join(a: DataKind, b: DataKind): DataKind | null {
    if (this.isSubtype(a, b)) return b;
    if (this.isSubtype(b, a)) return a;

    // Find common supertype
    const aSupertypes = this.getAllSupertypes(a);
    const bSupertypes = this.getAllSupertypes(b);

    const common = aSupertypes.find(type => bSupertypes.includes(type));
    return common || null;
  }

  /**
   * Find the greatest lower bound (meet) of two data kinds
   */
  static meet(a: DataKind, b: DataKind): DataKind | null {
    if (this.isSubtype(a, b)) return a;
    if (this.isSubtype(b, a)) return b;

    // For now, return null if no direct relationship
    // Could be extended for more complex lattice structures
    return null;
  }

  /**
   * Get all supertypes of a data kind (including itself)
   */
  static getAllSupertypes(kind: DataKind): DataKind[] {
    const result = [kind];
    const supertypes = SUBTYPING_LATTICE[kind];

    for (const supertype of supertypes) {
      result.push(...this.getAllSupertypes(supertype));
    }

    return [...new Set(result)]; // Remove duplicates
  }

  /**
   * Check if two port contracts are compatible
   */
  static areCompatible(source: PortContract, target: PortContract): boolean {
    // Direct subtype relationship
    if (this.isSubtype(source.dataKind, target.dataKind)) {
      return true;
    }

    // Check for coercion path
    return this.hasCoercionPath(source.dataKind, target.dataKind);
  }

  /**
   * Check if there's a coercion path from source to target
   */
  static hasCoercionPath(from: DataKind, to: DataKind): boolean {
    return COERCION_GRAPH.some(coercion =>
      coercion.from === from && coercion.to === to
    );
  }

  /**
   * Find the best coercion path from source to target
   */
  static findBestCoercion(from: DataKind, to: DataKind): Coercion | null {
    const candidates = COERCION_GRAPH.filter(coercion =>
      coercion.from === from && coercion.to === to
    );

    if (candidates.length === 0) return null;

    // Return the lowest cost coercion
    return candidates.reduce((best, current) =>
      current.cost < best.cost ? current : best
    );
  }

  /**
   * Find coercion chain using Dijkstra's algorithm for optimal cost path
   */
  static findCoercionChainDijkstra(from: DataKind, to: DataKind, maxCost: number = 10): Coercion[] {
    if (from === to) return [];

    // Priority queue for Dijkstra - [cost, current_kind, path]
    const queue: Array<[number, DataKind, Coercion[]]> = [[0, from, []]];
    const visited = new Set<DataKind>();
    const minCost = new Map<DataKind, number>();

    minCost.set(from, 0);

    while (queue.length > 0) {
      // Sort queue by cost (simple priority queue implementation)
      queue.sort((a, b) => a[0] - b[0]);
      const [currentCost, currentKind, path] = queue.shift()!;

      if (visited.has(currentKind)) continue;
      visited.add(currentKind);

      // Check if we reached the target
      if (currentKind === to) {
        return path;
      }

      // Explore all possible coercions from current kind
      for (const coercion of COERCION_GRAPH) {
        if (coercion.from === currentKind) {
          const newCost = currentCost + coercion.cost;
          
          // Skip if exceeds max cost bound
          if (newCost > maxCost) continue;
          
          const nextKind = coercion.to;
          
          // Only proceed if this path is better
          if (!minCost.has(nextKind) || newCost < minCost.get(nextKind)!) {
            minCost.set(nextKind, newCost);
            const newPath = [...path, coercion];
            queue.push([newCost, nextKind, newPath]);
          }
        }
      }
    }

    return []; // No path found within cost bounds
  }

  /**
   * Find coercion chain with cost-based selection (legacy method updated to use Dijkstra)
   */
  static findCoercionChain(from: DataKind, to: DataKind): Coercion[] {
    return this.findCoercionChainDijkstra(from, to);
  }
}

// Type checking infrastructure for workflow validation
export interface TypeCheckResult {
  compatible: boolean;
  coercionChain?: Coercion[];
  totalCost?: number;
  errors: string[];
  warnings: string[];
}

export interface EdgeCompatibility {
  sourcePort: PortContract;
  targetPort: PortContract;
  result: TypeCheckResult;
}

export class TypeChecker {
  /**
   * Check compatibility between source and target port contracts
   */
  static checkPortCompatibility(source: PortContract, target: PortContract): TypeCheckResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic data kind compatibility
    if (DataKindLattice.isSubtype(source.dataKind, target.dataKind)) {
      return {
        compatible: true,
        errors,
        warnings
      };
    }

    // Check for coercion path using Dijkstra's algorithm
    const coercionChain = DataKindLattice.findCoercionChainDijkstra(source.dataKind, target.dataKind);
    if (coercionChain.length > 0) {
      const totalCost = coercionChain.reduce((sum, c) => sum + c.cost, 0);
      const hasUnsafe = coercionChain.some(c => !c.safe);

      if (hasUnsafe) {
        warnings.push('Coercion chain contains unsafe conversions that may require user consent');
      }

      return {
        compatible: true,
        coercionChain,
        totalCost,
        errors,
        warnings
      };
    }

    // No compatibility found
    errors.push(`No coercion path from ${source.dataKind} to ${target.dataKind}`);
    return {
      compatible: false,
      errors,
      warnings
    };
  }

  /**
   * Validate all edges in a workflow for type compatibility
   */
  static validateWorkflowEdges(
    nodes: Array<{ id: string; input_ports: PortContract[]; output_ports: PortContract[] }>,
    edges: Array<{ source_node_id: string; target_node_id: string; source_port?: string; target_port?: string }>
  ): EdgeCompatibility[] {
    const results: EdgeCompatibility[] = [];

    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source_node_id);
      const targetNode = nodes.find(n => n.id === edge.target_node_id);

      if (!sourceNode || !targetNode) {
        continue; // Skip invalid edges
      }

      // Find source port
      let sourcePort: PortContract | undefined;
      if (edge.source_port) {
        sourcePort = sourceNode.output_ports.find(p => p.dataKind === edge.source_port);
      } else if (sourceNode.output_ports.length === 1) {
        sourcePort = sourceNode.output_ports[0];
      }

      // Find target port
      let targetPort: PortContract | undefined;
      if (edge.target_port) {
        targetPort = targetNode.input_ports.find(p => p.dataKind === edge.target_port);
      } else if (targetNode.input_ports.length === 1) {
        targetPort = targetNode.input_ports[0];
      }

      if (!sourcePort || !targetPort) {
        continue; // Skip if ports not found
      }

      const result = this.checkPortCompatibility(sourcePort, targetPort);
      results.push({
        sourcePort,
        targetPort,
        result
      });
    }

    return results;
  }

  /**
   * Suggest adapter insertions for incompatible edges
   */
  static suggestAdapters(edgeCompatibility: EdgeCompatibility): {
    adapterNodes: Array<{
      type: 'adapter';
      coercion: Coercion;
      position: { x: number; y: number };
    }>;
    newEdges: Array<{
      source_node_id: string;
      target_node_id: string;
      source_port?: string;
      target_port?: string;
    }>;
  } {
    const { result } = edgeCompatibility;

    if (result.compatible && result.coercionChain) {
      // Create adapter nodes for each coercion step
      const adapterNodes = result.coercionChain.map((coercion, index) => ({
        type: 'adapter' as const,
        coercion,
        position: { x: 0, y: index * 100 } // Placeholder positioning
      }));

      // Create edges through adapters
      const newEdges: Array<{
        source_node_id: string;
        target_node_id: string;
        source_port?: string;
        target_port?: string;
      }> = [];

      // First edge from source to first adapter
      if (adapterNodes.length > 0) {
        newEdges.push({
          source_node_id: 'source', // Would be filled in by caller
          target_node_id: `adapter_${result.coercionChain[0].from}_${result.coercionChain[0].to}`,
          source_port: result.coercionChain[0].from,
          target_port: result.coercionChain[0].from
        });

        // Chain adapters together
        for (let i = 0; i < adapterNodes.length - 1; i++) {
          newEdges.push({
            source_node_id: `adapter_${result.coercionChain[i].from}_${result.coercionChain[i].to}`,
            target_node_id: `adapter_${result.coercionChain[i + 1].from}_${result.coercionChain[i + 1].to}`,
            source_port: result.coercionChain[i].to,
            target_port: result.coercionChain[i + 1].from
          });
        }

        // Final edge from last adapter to target
        const lastCoercion = result.coercionChain[result.coercionChain.length - 1];
        newEdges.push({
          source_node_id: `adapter_${lastCoercion.from}_${lastCoercion.to}`,
          target_node_id: 'target', // Would be filled in by caller
          source_port: lastCoercion.to,
          target_port: lastCoercion.to
        });
      }

      return { adapterNodes, newEdges };
    }

    return { adapterNodes: [], newEdges: [] };
  }

  /**
   * Validate facet compatibility between ports
   */
  static validateFacets(source: DataFacet, target: DataFacet): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check encoding compatibility
    if (source.encoding && target.encoding && source.encoding !== target.encoding) {
      warnings.push(`Encoding mismatch: ${source.encoding} → ${target.encoding}`);
    }

    // Check locale compatibility
    if (source.locale && target.locale && source.locale !== target.locale) {
      warnings.push(`Locale mismatch: ${source.locale} → ${target.locale}`);
    }

    // Check size constraints
    if (target.size?.max && source.size?.max && source.size.max > target.size.max) {
      errors.push(`Source size (${source.size.max}) exceeds target maximum (${target.size.max})`);
    }

    if (target.size?.min && source.size?.min && source.size.min < target.size.min) {
      errors.push(`Source size (${source.size.min}) below target minimum (${target.size.min})`);
    }

    return { errors, warnings };
  }
}