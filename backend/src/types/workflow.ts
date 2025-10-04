import { PortContract } from './data-kinds.js';
import { Coercion } from './data-kinds.js';

export interface WorkflowNodePort extends PortContract {
  id: string;
  name: string;
  schema_ref?: string; // Legacy field for backward compatibility
  description?: string;
  required?: boolean;
  default?: any;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  template_id?: string;
  description?: string;
  position?: {
    x: number;
    y: number;
  };
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  configuration: Record<string, any>;
  input_ports: WorkflowNodePort[];
  output_ports: WorkflowNodePort[];
  retries: number;
  timeout: number;
  retry_delay: number;
  tags: string[];
  created_at?: string;
  updated_at?: string;
  status?: string;
  execution_time?: number;
  error_message?: string;
}

export interface WorkflowEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  source_port?: string;
  target_port?: string;
  condition?: string; // DKEL expression
  transform?: string; // JSONPath or transform function
  metadata?: WorkflowEdgeMetadata;
}

export interface WorkflowEdgeMetadata {
  // Type compatibility information
  typeCompatibility?: {
    sourceKind: string;
    targetKind: string;
    compatible: boolean;
    subtyping: boolean; // true if sourceKind ⊑ targetKind
    coercionChain?: CoercionMetadata[];
    totalCost?: number;
    maxCostBound?: number;
  };
  
  // Adapter insertion information
  adapters?: AdapterInsertion[];
  
  // Execution metadata
  execution?: {
    coercionApplied?: boolean;
    adapterNodes?: string[]; // IDs of inserted adapter nodes
    performance?: {
      coercionTime?: number;
      adapterOverhead?: number;
    };
  };
}

export interface CoercionMetadata {
  from: string;
  to: string;
  cost: number;
  safe: boolean;
  adapter?: string;
  description?: string;
}

export interface AdapterInsertion {
  id: string;
  type: 'adapter';
  coercion: CoercionMetadata;
  position: { x: number; y: number };
  inserted: boolean;
  source_edge_id: string;
  target_edge_id?: string;
}

export interface WorkflowMetadata {
  created_at?: string;
  updated_at?: string;
  tags: string[];
  description?: string;
  category?: string;
  author?: string;
  is_public: boolean;
  version: number;
  thumbnail?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  metadata?: WorkflowMetadata;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  variables?: Record<string, any>;
  settings?: {
    max_execution_time?: number;
    max_parallel_nodes?: number;
    enable_checkpointing?: boolean;
    retry_policy?: {
      max_retries: number;
      base_delay: number;
      max_delay: number;
    };
  };
}

export enum WorkflowExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: WorkflowExecutionStatus;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  start_time: number;
  end_time?: number;
  duration?: number;
  progress: number; // 0-100
  current_node_id?: string;
  completed_nodes: string[];
  failed_nodes: string[];
  pending_nodes: string[];
  node_results: Record<string, NodeExecutionResult>;
  error?: string;
  checkpoint_data?: any;
  metadata?: Record<string, any>;
}

export interface NodeExecutionResult {
  node_id: string;
  status: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  start_time: number;
  end_time?: number;
  duration?: number;
  error?: string;
  retry_count: number;
  metadata?: Record<string, any>;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: string[];
}

export interface ValidationError {
  type: 'dag' | 'type_compatibility' | 'dkel' | 'schema' | 'configuration';
  message: string;
  node_id?: string;
  edge_id?: string;
  details?: Record<string, any>;
}

export interface ValidationWarning {
  type: 'performance' | 'best_practice' | 'deprecated';
  message: string;
  node_id?: string;
  edge_id?: string;
  suggestion?: string;
}

export interface WorkflowExecutionOptions {
  inputs?: Record<string, any>;
  variables?: Record<string, any>;
  enable_checkpointing?: boolean;
  max_execution_time?: number;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface WorkflowExecutionProgress {
  execution_id: string;
  status: WorkflowExecutionStatus;
  progress: number;
  current_node_id?: string;
  completed_nodes: string[];
  pending_nodes: string[];
  failed_nodes: string[];
  estimated_time_remaining?: number;
  current_node_name?: string;
  last_updated: number;
}

export interface WorkflowExecutionResult {
  execution_id: string;
  workflow_id: string;
  status: WorkflowExecutionStatus;
  outputs: Record<string, any>;
  start_time: number;
  end_time: number;
  duration: number;
  node_results: Record<string, NodeExecutionResult>;
  error?: string;
  metadata?: Record<string, any>;
}

// API Request/Response Types

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: Partial<WorkflowMetadata>;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  variables?: Record<string, any>;
  settings?: Workflow['settings'];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  metadata?: Partial<WorkflowMetadata>;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  variables?: Record<string, any>;
  settings?: Workflow['settings'];
}

export interface StartWorkflowExecutionRequest {
  workflow_id: string;
  inputs?: Record<string, any>;
  variables?: Record<string, any>;
  options?: WorkflowExecutionOptions;
}

export interface WorkflowExecutionResponse {
  execution_id: string;
  status: WorkflowExecutionStatus;
  message: string;
}

export interface WorkflowListResponse {
  workflows: WorkflowSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  version: number;
  author?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  is_public: boolean;
  node_count: number;
  edge_count: number;
}

export interface WorkflowExecutionListResponse {
  executions: WorkflowExecutionSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface WorkflowExecutionSummary {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: WorkflowExecutionStatus;
  progress: number;
  start_time: number;
  end_time?: number;
  duration?: number;
  error?: string;
}

// Service Interfaces

export interface WorkflowStorage {
  create(workflow: Omit<Workflow, 'id'>): Promise<Workflow>;
  get(id: string): Promise<Workflow | null>;
  update(id: string, updates: Partial<Workflow>): Promise<Workflow | null>;
  delete(id: string): Promise<boolean>;
  list(options?: { page?: number; limit?: number; author?: string; tags?: string[] }): Promise<WorkflowListResponse>;
  search(query: string): Promise<Workflow[]>;
}

export interface WorkflowExecutionStorage {
  create(execution: Omit<WorkflowExecution, 'id'>): Promise<WorkflowExecution>;
  get(id: string): Promise<WorkflowExecution | null>;
  update(id: string, updates: Partial<WorkflowExecution>): Promise<WorkflowExecution | null>;
  delete(id: string): Promise<boolean>;
  list(workflowId?: string, options?: { page?: number; limit?: number; status?: WorkflowExecutionStatus }): Promise<WorkflowExecutionListResponse>;
  getByWorkflow(workflowId: string): Promise<WorkflowExecution[]>;
}

export interface WorkflowValidator {
  validate(workflow: Workflow): Promise<WorkflowValidationResult>;
  validateDAG(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationError[];
  validateTypeCompatibility(nodes: WorkflowNode[], edges: WorkflowEdge[]): Promise<ValidationError[]>;
  validateDKELExpressions(workflow: Workflow): Promise<ValidationError[]>;
}

export interface WorkflowExecutionManager {
  start(executionId: string): Promise<void>;
  stop(executionId: string): Promise<void>;
  pause(executionId: string): Promise<void>;
  resume(executionId: string): Promise<void>;
  getProgress(executionId: string): Promise<WorkflowExecutionProgress>;
  getResult(executionId: string): Promise<WorkflowExecutionResult>;
  listActive(): Promise<WorkflowExecution[]>;
}