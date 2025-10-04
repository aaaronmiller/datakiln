import { EventEmitter } from 'events';

// Import workflow types from the models

// Local type definitions to avoid circular imports
interface WorkflowNodePort {
  id: string;
  name: string;
  dataKind: string;
  required?: boolean;
  description?: string;
  default?: any;
}

interface NodeCapabilities {
  side_effects: string[];
  concurrency: string;
  resources: {
    timeout_ms?: number;
    [key: string]: any;
  };
  retry_policy?: {
    max_attempts?: number;
    base_delay_ms?: number;
    max_delay_ms?: number;
    backoff_multiplier?: number;
  };
}

export enum ExecutorType {
  CODE = 'Code',
  LLM = 'LLM',
  DOM = 'DOM'
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export enum ExecutionEventType {
  WORKFLOW_STARTED = 'execution:started',
  NODE_STARTED = 'node:started',
  STEP_STARTED = 'step:started',
  STEP_LOG = 'step:log',
  STEP_SUCCEEDED = 'step:succeeded',
  NODE_SUCCEEDED = 'node:succeeded',
  NODE_FAILED = 'node:failed',
  EXECUTION_COMPLETED = 'execution:completed',
  // Legacy events for backward compatibility
  WORKFLOW_COMPLETED = 'workflowCompleted',
  WORKFLOW_FAILED = 'workflowFailed',
  NODE_COMPLETED = 'nodeCompleted',
  NODE_RETRYING = 'nodeRetrying'
}

export enum NodeExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled'
}

export interface ExecutionMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  nodeCount: number;
  completedNodes: number;
  failedNodes: number;
  skippedNodes: number;
  retryCount: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface TimeoutConfig {
  nodeTimeout: number;
  workflowTimeout: number;
  gracePeriod: number;
}

export interface CheckpointData {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  currentNodeId?: string;
  completedNodes: string[];
  nodeResults: Record<string, NodeExecutionResult>;
  dataFlow: Record<string, any>;
  metrics: ExecutionMetrics;
  retryStates: Record<string, RetryState>;
  timestamp: number;
}

export interface RetryState {
  nodeId: string;
  attemptCount: number;
  lastError?: string;
  nextRetryTime?: number;
  totalDelay: number;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: NodeExecutionStatus;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: string;
  retryCount: number;
  metadata?: Record<string, any>;
}

export interface DataFlowConnection {
  sourceNodeId: string;
  targetNodeId: string;
  sourceOutputKey?: string;
  targetInputKey?: string;
  transformFunction?: (data: any) => any;
}

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  nodeId: string;
  globalInputs: Record<string, any>;
  nodeInputs: Record<string, any>;
  executionOptions: Record<string, any>;
  services: Record<string, any>;
  timeout: number;
}

export interface WorkflowExecutionOptions {
  parallelExecution: boolean;
  maxParallelNodes: number;
  stopOnFailure: boolean;
  enableCheckpointing: boolean;
  checkpointInterval: number;
  retryConfig: RetryConfig;
  timeoutConfig: TimeoutConfig;
  enableMetrics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface ExecutionEvent {
  type: ExecutionEventType | string; // Allow string for backward compatibility
  executionId: string;
  workflowId: string;
  nodeId?: string;
  stepId?: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface ExecutionProgress {
  executionId: string;
  status: ExecutionStatus;
  progress: number; // 0-100
  currentNodeId?: string;
  completedNodes: string[];
  pendingNodes: string[];
  failedNodes: string[];
  metrics: ExecutionMetrics;
  estimatedTimeRemaining?: number;
}

export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  startTime: number;
  endTime: number;
  duration: number;
  results: Record<string, NodeExecutionResult>;
  executionOrder: string[];
  metrics: ExecutionMetrics;
  error?: string;
  checkpointData?: CheckpointData;
}

export interface NodeExecutor {
  type: ExecutorType;
  execute(context: ExecutionContext): Promise<Record<string, any>>;
  validate?(node: any): ValidationResult;
  getCapabilities?(): string[];
}

export interface ExecutionStateManager {
  saveState(executionId: string, state: CheckpointData): Promise<void>;
  loadState(executionId: string): Promise<CheckpointData | null>;
  deleteState(executionId: string): Promise<void>;
  listStates(workflowId?: string): Promise<string[]>;
}

export interface MetricsCollector {
  recordNodeStart(nodeId: string, executionId: string): void;
  recordNodeComplete(nodeId: string, executionId: string, duration: number, success: boolean): void;
  recordWorkflowStart(executionId: string): void;
  recordWorkflowComplete(executionId: string, duration: number, success: boolean): void;
  getMetrics(executionId: string): ExecutionMetrics;
  getAggregatedMetrics(timeRange?: { start: number; end: number }): Record<string, any>;
}

export interface ExecutionEventEmitter {
  emit(event: ExecutionEvent): void;
  on(eventType: string, handler: (event: ExecutionEvent) => void): void;
  off(eventType: string, handler: (event: ExecutionEvent) => void): void;
  getEventHistory(executionId: string): ExecutionEvent[];
}

export class ExecutionError extends Error {
  constructor(
    message: string,
    public executionId: string,
    public nodeId?: string,
    public cause?: Error,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ExecutionError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: string[],
    public warnings: string[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends ExecutionError {
  constructor(
    executionId: string,
    nodeId: string,
    timeout: number
  ) {
    super(`Node ${nodeId} timed out after ${timeout}ms`, executionId, nodeId, undefined, true);
    this.name = 'TimeoutError';
  }
}

export class RetryExhaustedError extends ExecutionError {
  constructor(
    executionId: string,
    nodeId: string,
    attempts: number,
    lastError: string
  ) {
    super(`Node ${nodeId} failed after ${attempts} attempts: ${lastError}`, executionId, nodeId);
    this.name = 'RetryExhaustedError';
  }
}

export interface WorkflowMetadata {
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  description?: string;
  category?: string;
  author?: string;
  isPublic: boolean;
  version: number;
  thumbnail?: string;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  next?: string | string[];
  retries: number;
  timeout: number;
  retry_delay: number;
  tags: string[];
  created_at?: string;
  updated_at?: string;
  status: string;
  execution_time?: number;
  error_message?: string;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  meta?: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  metadata?: WorkflowMetadata;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ResourceType {
  name: string;
  capacity: number;
  currentUsage: number;
}

// Add new types for Phase 6: Advanced Parallelism, Patterns, and Resource Management

export enum ParallelismMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  FAN_OUT = 'fan_out',
  FAN_IN = 'fan_in'
}

export enum QuorumType {
  ALL = 'all',           // Wait for all inputs
  FIRST = 'first',       // Complete when first input arrives
  MAJORITY = 'majority', // Wait for majority of inputs
  N_OF_M = 'n_of_m'      // Wait for N out of M inputs
}

export interface QuorumConfig {
  type: QuorumType;
  threshold?: number;    // For N_OF_M, the N value
  total?: number;        // For N_OF_M, the M value
  timeout?: number;      // Timeout in milliseconds
}

export interface FanOutConfig {
  maxConcurrency: number;
  batchSize?: number;
  backpressure?: {
    enabled: boolean;
    maxQueueSize: number;
    dropPolicy: 'drop_oldest' | 'drop_newest' | 'reject';
  };
}

export interface FanInConfig {
  quorum: QuorumConfig;
  aggregation?: {
    strategy: 'concat' | 'merge' | 'reduce' | 'rank';
    customFunction?: string; // DKEL expression for custom aggregation
  };
  ordering?: {
    preserve: boolean;
    key?: string; // Field to sort by
    direction: 'asc' | 'desc';
  };
}

export interface PatternNode {
  id: string;
  type: 'pattern';
  patternId: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  configuration: Record<string, any>;
}

export interface WorkflowPattern {
  id: string;
  name: string;
  description?: string;
  version: string;
  category: string;
  tags: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputPorts: WorkflowNodePort[];
  outputPorts: WorkflowNodePort[];
  metadata: {
    author: string;
    createdAt: string;
    updatedAt: string;
    usageCount: number;
    averageExecutionTime?: number;
  };
  capabilities: NodeCapabilities;
  validationRules?: PatternValidationRule[];
}

export interface PatternValidationRule {
  type: 'input_compatibility' | 'output_compatibility' | 'resource_requirements';
  rule: string; // DKEL expression
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface PatternComposition {
  patternId: string;
  instanceId: string;
  inputMappings: Record<string, string>;  // Pattern port -> workflow value/expression
  outputMappings: Record<string, string>; // Pattern port -> workflow variable
  configuration: Record<string, any>;
}

export interface CapabilityBudget {
  browserContexts: number;
  concurrentNodes: number;
  memoryLimit: number; // MB
  timeoutLimit: number; // seconds
  startTime?: number; // Timestamp when budget was set
  costLimits: {
    maxCostPerExecution: number;
    maxTotalCost: number;
    costPerHour: number;
  };
  resourceLimits: Record<string, number>; // Custom resource limits
}

export interface ResourceAllocation {
  resourceType: string;
  amount: number;
  nodeId: string;
  patternId?: string;
  allocatedAt: number;
  expiresAt?: number;
}

export interface ResourceUsage {
  resourceType: string;
  currentUsage: number;
  peakUsage: number;
  allocationHistory: ResourceAllocation[];
  browserContexts?: number;
  concurrentNodes?: number;
  memoryUsage?: number;
  activeAllocations?: number;
  resourceLimits?: Record<string, number>;
}

export interface WorkflowComposition {
  patterns: PatternComposition[];
  workflowNodes: WorkflowNode[];
  workflowEdges: WorkflowEdge[];
  globalInputs: Record<string, any>;
  globalOutputs: Record<string, any>;
}

export interface ParallelExecutionContext {
  mode: ParallelismMode;
  fanOutConfig?: FanOutConfig;
  fanInConfig?: FanInConfig;
  resourceBudget: CapabilityBudget;
  patternInstances: Map<string, WorkflowPattern>;
}

// Extended WorkflowExecutionOptions
export interface ExtendedWorkflowExecutionOptions extends WorkflowExecutionOptions {
  parallelism: {
    enabled: boolean;
    maxConcurrency: number;
    fanOutConfig?: FanOutConfig;
    fanInConfig?: FanInConfig;
  };
  resourceManagement: {
    capabilityBudget: CapabilityBudget;
    enforceBudgets: boolean;
    trackUsage: boolean;
  };
  patternComposition: {
    enabled: boolean;
    patternRegistry: string[]; // Pattern IDs available for composition
  };
}

// Extended ExecutionContext
export interface ExtendedExecutionContext extends ExecutionContext {
  parallelContext?: ParallelExecutionContext;
  patternInstances?: Map<string, WorkflowPattern>;
  resourceAllocations?: ResourceAllocation[];
}

// Pattern Registry Interface
export interface PatternRegistry {
  register(pattern: WorkflowPattern): Promise<void>;
  get(patternId: string): Promise<WorkflowPattern | null>;
  list(category?: string, tags?: string[]): Promise<WorkflowPattern[]>;
  update(patternId: string, updates: Partial<WorkflowPattern>): Promise<WorkflowPattern | null>;
  delete(patternId: string): Promise<boolean>;
  validateComposition(composition: WorkflowComposition): Promise<ValidationResult>;
}

// Resource Manager Interface
export interface ResourceManager {
  allocate(nodeId: string, requirements: ResourceRequirements, patternId?: string): Promise<boolean>;
  deallocate(nodeId: string): Promise<void>;
  checkAvailability(requirements: ResourceRequirements): Promise<boolean>;
  getUsage(): Promise<Record<string, ResourceUsage>>;
  enforceBudgets(budget: CapabilityBudget): Promise<void>;
}

// Parallel Executor Interface
export interface ParallelExecutor {
  executeFanOut(
    nodeId: string,
    inputs: any[],
    config: FanOutConfig,
    context: ExtendedExecutionContext
  ): Promise<any[]>;
  
  executeFanIn(
    nodeId: string,
    inputs: any[],
    config: FanInConfig,
    context: ExtendedExecutionContext
  ): Promise<any>;
  
  executePattern(
    pattern: WorkflowPattern,
    inputs: Record<string, any>,
    context: ExtendedExecutionContext
  ): Promise<Record<string, any>>;
}

// Extended Operational State
export interface ExtendedOperationalState {
  runId: string;
  readySet: Set<string>; // Node IDs ready for execution
  inFlightTasks: Map<string, InFlightTask>; // Node ID -> task details
  artifactStore: ArtifactStore;
  resourceAllocations: Map<string, ResourceAllocation[]>;
  eventHistory: ExecutionEvent[];
  parallelTasks: Map<string, ParallelTask>;
  patternInstances: Map<string, PatternInstance>;
  capabilityBudget: CapabilityBudget;
}

export interface ParallelTask {
  taskId: string;
  parentNodeId: string;
  subTasks: string[];
  mode: ParallelismMode;
  config: FanOutConfig | FanInConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: any[];
  startTime: number;
  endTime?: number;
}

export interface PatternInstance {
  instanceId: string;
  patternId: string;
  executionId: string;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  subExecutionId?: string; // If pattern spawns sub-execution
}

export interface ResourceAllocations {
  allocations: Map<string, ResourceAllocation[]>; // Node ID -> allocations
  resourceTypes: Map<string, ResourceType>;
}

export interface ResourceRequirements {
  browserContexts?: number;
  memory?: number; // MB
  timeout?: number; // seconds
  capabilities?: string[]; // e.g., ['browser-interact', 'network']
}

// Operational Semantics State Structure
export interface OperationalState {
  runId: string;
  readySet: Set<string>; // Node IDs ready for execution
  inFlightTasks: Map<string, InFlightTask>; // Node ID -> task details
  artifactStore: ArtifactStore;
  resourceAllocations: ResourceAllocations;
  eventHistory: ExecutionEvent[];
}

export interface InFlightTask {
  nodeId: string;
  startTime: number;
  currentStep?: string;
  allocatedResources: ResourceAllocation[];
  retryCount: number;
  dependencies: string[]; // Node IDs this task depends on
}

export interface ArtifactStore {
  store(artifact: Artifact): Promise<string>; // Returns artifact reference
  retrieve(ref: string): Promise<Artifact>;
  list(): Promise<string[]>; // List all artifact references
  delete(ref: string): Promise<void>;
}

export interface Artifact {
  id: string;
  data: any;
  metadata: {
    contentType: string;
    size: number;
    createdAt: number;
    provenance?: {
      nodeId: string;
      executionId: string;
      inputs: string[]; // References to input artifacts
    };
  };
}

// Operational Semantics Executor Interface
export interface OperationalSemanticsExecutor extends ExecutionEventEmitter {
  initializeState(workflow: Workflow, executionId: string, globalInputs: Record<string, any>): Promise<OperationalState>;
  transition(state: OperationalState, event: ExecutionEvent): Promise<OperationalState>;
  canExecuteNode(state: OperationalState, nodeId: string): boolean;
  allocateResources(state: OperationalState, nodeId: string, requirements: ResourceRequirements): Promise<boolean>;
  deallocateResources(state: OperationalState, nodeId: string): Promise<void>;
  getReadyNodes(state: OperationalState): string[];
  isExecutionComplete(state: OperationalState): boolean;
}

export interface ResourceLimits {
  browserContexts?: number;
  concurrentNodes?: number;
  memoryLimit?: number; // MB
  timeoutLimit?: number; // seconds
  [key: string]: number | undefined;
}