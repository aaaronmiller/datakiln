// Node Signatures and Capabilities System
// Implements the formal ⟨I,O,C⟩ signature system from workflow_model.md

import { DataKind, PortContract } from './data-kinds.js';

// Node Taxonomy as defined in workflow_model.md
export enum NodeCategory {
  SOURCE_INGEST = 'source/ingest',
  DOM_ACTION = 'dom/action',
  PROVIDER_LLM = 'provider/llm',
  TRANSFORM_PARSE = 'transform/parse',
  CONDITION_GATE = 'condition/gate',
  SPLIT_MAP = 'split/map',
  MERGE_JOIN = 'merge/join',
  TIMER_WAIT = 'timer/wait',
  EXPORT = 'export',
  ADAPTER = 'adapter',
  LOOP_ITERATE = 'loop/iterate'
}

// Side-effect classes for capabilities
export enum SideEffectClass {
  NONE = 'none',           // Pure functions, no side effects
  SYSTEM_READ = 'system-read',     // Read from filesystem, clipboard, etc.
  SYSTEM_WRITE = 'system-write',   // Write to filesystem, clipboard, etc.
  BROWSER_INTERACT = 'browser-interact', // DOM manipulation, navigation
  REMOTE_INVOKE = 'remote-invoke',  // API calls, LLM requests
  NETWORK = 'network'      // General network operations
}

// Concurrency classes
export enum ConcurrencyClass {
  EXCLUSIVE = 'exclusive', // Requires exclusive access (e.g., single browser session)
  SHARED = 'shared',       // Can run concurrently with others
  SERIAL = 'serial'        // Must run serially (e.g., stateful operations)
}

// Resource requirements for capabilities
export interface ResourceRequirements {
  browser_contexts?: number;    // Number of browser contexts needed
  pages?: number;              // Number of pages needed
  sessions?: number;           // Number of provider sessions
  memory_mb?: number;          // Memory requirements
  timeout_ms?: number;         // Maximum execution time
  rate_limit?: {               // Rate limiting
    requests_per_minute?: number;
    burst_limit?: number;
  };
  cost_limits?: {              // Cost limits for paid services
    max_cost_usd?: number;
    cost_per_request_usd?: number;
  };
}

// Node capabilities declaration (C in ⟨I,O,C⟩)
export interface NodeCapabilities {
  side_effects: SideEffectClass[];
  concurrency: ConcurrencyClass;
  resources: ResourceRequirements;
  retry_policy?: {
    max_attempts: number;
    base_delay_ms: number;
    max_delay_ms: number;
    backoff_multiplier: number;
  };
  failure_modes?: ('transient' | 'permanent')[];
  circuit_breaker?: {
    failure_threshold: number;
    recovery_timeout_ms: number;
  };
}

// Port definition with enhanced contract
export interface NodePort extends PortContract {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  default_value?: any;
  validation_rules?: string[];
  transformation_rules?: string[];
}

// Formal node signature ⟨I,O,C⟩
export interface NodeSignature {
  category: NodeCategory;
  inputs: NodePort[];
  outputs: NodePort[];
  capabilities: NodeCapabilities;
  metadata: {
    name: string;
    description: string;
    version: string;
    author?: string;
    tags: string[];
    deprecated?: boolean;
    experimental?: boolean;
  };
  configuration_schema?: any; // JSON Schema for node configuration
  ui_hints?: {
    icon?: string;
    color?: string;
    shape?: 'rectangle' | 'circle' | 'diamond';
    position?: { x: number; y: number };
  };
}

// Node registry entry
export interface NodeRegistryEntry {
  node_type: string;
  signature: NodeSignature;
  implementation: {
    module: string;
    class_name: string;
    config_defaults?: Record<string, any>;
  };
  templates?: NodeTemplate[];
}

// Node template for quick instantiation
export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  configuration: Record<string, any>;
  tags: string[];
}

// Node signature validation result
export interface SignatureValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

// Capability compatibility check
export interface CapabilityCompatibility {
  compatible: boolean;
  conflicts: string[];
  resource_conflicts: string[];
  scheduling_constraints: string[];
}

// Registry of all available node signatures
export interface NodeSignatureRegistry {
  version: string;
  last_updated: string;
  signatures: Record<string, NodeSignature>;
  templates: Record<string, NodeTemplate[]>;
  compatibility_matrix: Record<string, Record<string, CapabilityCompatibility>>;
}

// Helper functions for working with signatures
export class NodeSignatureUtils {
  /**
   * Check if two node signatures are compatible for connection
   */
  static checkCompatibility(
    sourceSig: NodeSignature,
    targetSig: NodeSignature
  ): CapabilityCompatibility {
    const conflicts: string[] = [];
    const resource_conflicts: string[] = [];
    const scheduling_constraints: string[] = [];

    // Check concurrency compatibility
    if (sourceSig.capabilities.concurrency === ConcurrencyClass.EXCLUSIVE &&
        targetSig.capabilities.concurrency === ConcurrencyClass.EXCLUSIVE) {
      conflicts.push('Both nodes require exclusive access');
    }

    // Check resource conflicts
    const sourceResources = sourceSig.capabilities.resources;
    const targetResources = targetSig.capabilities.resources;

    if (sourceResources.browser_contexts && targetResources.browser_contexts) {
      resource_conflicts.push('Both nodes require browser contexts');
    }

    if (sourceResources.sessions && targetResources.sessions) {
      resource_conflicts.push('Both nodes require provider sessions');
    }

    // Check side effect compatibility
    const sourceEffects = new Set(sourceSig.capabilities.side_effects);
    const targetEffects = new Set(targetSig.capabilities.side_effects);

    // Exclusive operations can't run with conflicting side effects
    if (sourceEffects.has(SideEffectClass.BROWSER_INTERACT) &&
        targetEffects.has(SideEffectClass.BROWSER_INTERACT)) {
      scheduling_constraints.push('Concurrent browser interactions may conflict');
    }

    return {
      compatible: conflicts.length === 0,
      conflicts,
      resource_conflicts,
      scheduling_constraints
    };
  }

  /**
   * Validate a node signature for completeness and correctness
   */
  static validateSignature(signature: NodeSignature): SignatureValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!signature.category) {
      errors.push('Node category is required');
    }

    if (!signature.metadata?.name) {
      errors.push('Node name is required');
    }

    if (!signature.capabilities) {
      errors.push('Node capabilities are required');
    }

    // Validate port contracts
    for (const port of [...signature.inputs, ...signature.outputs]) {
      if (!port.id || !port.name) {
        errors.push(`Port ${port.id || 'unknown'} missing required fields`);
      }

      if (!port.dataKind) {
        errors.push(`Port ${port.name} missing data kind`);
      }
    }

    // Validate capabilities
    const caps = signature.capabilities;
    if (!caps.side_effects || caps.side_effects.length === 0) {
      warnings.push('No side effects declared - consider if this is correct');
    }

    if (!caps.resources) {
      warnings.push('No resource requirements specified');
    }

    // Category-specific validations
    switch (signature.category) {
      case NodeCategory.SOURCE_INGEST:
        if (signature.inputs.length > 0) {
          errors.push('Source/Ingest nodes should have no inputs');
        }
        break;

      case NodeCategory.EXPORT:
        if (signature.outputs.length > 0) {
          errors.push('Export nodes should have no outputs');
        }
        break;

      case NodeCategory.CONDITION_GATE:
        if (signature.outputs.length < 2) {
          warnings.push('Condition/Gate nodes typically have multiple outputs');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get resource requirements for a set of signatures
   */
  static aggregateResourceRequirements(signatures: NodeSignature[]): ResourceRequirements {
    const aggregated: ResourceRequirements = {};

    for (const sig of signatures) {
      const resources = sig.capabilities.resources;

      // Sum up resource requirements
      if (resources.browser_contexts) {
        aggregated.browser_contexts = (aggregated.browser_contexts || 0) + resources.browser_contexts;
      }

      if (resources.pages) {
        aggregated.pages = (aggregated.pages || 0) + resources.pages;
      }

      if (resources.sessions) {
        aggregated.sessions = (aggregated.sessions || 0) + resources.sessions;
      }

      // Take maximums for limits
      if (resources.memory_mb) {
        aggregated.memory_mb = Math.max(aggregated.memory_mb || 0, resources.memory_mb);
      }

      if (resources.timeout_ms) {
        aggregated.timeout_ms = Math.max(aggregated.timeout_ms || 0, resources.timeout_ms);
      }
    }

    return aggregated;
  }
}