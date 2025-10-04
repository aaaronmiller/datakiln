import { EventEmitter } from 'events';
import {
  Workflow,
  WorkflowNode as Node,
  WorkflowEdge as Edge,
  ExecutionStatus,
  NodeExecutionStatus,
  ExecutionMetrics,
  RetryConfig,
  TimeoutConfig,
  CheckpointData,
  RetryState,
  NodeExecutionResult,
  DataFlowConnection,
  ExecutionContext,
  WorkflowExecutionOptions,
  ValidationResult,
  ExecutionEvent,
  WorkflowExecutionResult,
  NodeExecutor,
  ExecutionStateManager,
  MetricsCollector,
  ExecutionEventEmitter,
  ExecutionError,
  ValidationError,
  TimeoutError,
  RetryExhaustedError
} from '../types/execution.js';

// Import Phase 6 advanced types
import {
  ExtendedExecutionContext,
  ExtendedWorkflowExecutionOptions,
  ParallelExecutor,
  ResourceManager,
  PatternRegistry,
  CapabilityBudget,
  ParallelismMode,
  FanOutConfig,
  FanInConfig,
  WorkflowPattern,
  PatternComposition,
  ResourceAllocation
} from '../types/execution.js';

// Import parallel executor
import { ParallelExecutor as ParallelExecutorImpl } from './parallel-executor.js';

export class DAGExecutor implements ExecutionEventEmitter {
  private eventEmitter: EventEmitter;
  private nodeExecutors: Map<string, NodeExecutor>;
  private stateManager?: ExecutionStateManager;
  private metricsCollector?: MetricsCollector;
  private defaultOptions: WorkflowExecutionOptions;

  // Phase 6: Advanced Parallelism and Resource Management
  private parallelExecutor: ParallelExecutor;
  private resourceManager?: ResourceManager;
  private patternRegistry?: PatternRegistry;
  private defaultCapabilityBudget: CapabilityBudget;

  constructor(
    nodeExecutors: NodeExecutor[] = [],
    stateManager?: ExecutionStateManager,
    metricsCollector?: MetricsCollector,
    resourceManager?: ResourceManager,
    patternRegistry?: PatternRegistry,
    options: Partial<WorkflowExecutionOptions> = {}
  ) {
    this.eventEmitter = new EventEmitter();
    this.nodeExecutors = new Map();
    this.stateManager = stateManager;
    this.metricsCollector = metricsCollector;
    this.resourceManager = resourceManager;
    this.patternRegistry = patternRegistry;

    // Initialize parallel executor
    this.parallelExecutor = new ParallelExecutorImpl();

    // Register node executors
    for (const executor of nodeExecutors) {
      this.nodeExecutors.set(executor.type, executor);
    }

    // Default execution options
    this.defaultOptions = {
      parallelExecution: true,
      maxParallelNodes: 5,
      stopOnFailure: true,
      enableCheckpointing: true,
      checkpointInterval: 30000, // 30 seconds
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        retryableErrors: ['TimeoutError', 'NetworkError', 'TemporaryFailure']
      },
      timeoutConfig: {
        nodeTimeout: 300000, // 5 minutes
        workflowTimeout: 3600000, // 1 hour
        gracePeriod: 5000 // 5 seconds
      },
      enableMetrics: true,
      logLevel: 'info',
      ...options
    };

    // Default capability budget
    this.defaultCapabilityBudget = {
      browserContexts: 3,
      concurrentNodes: 5,
      memoryLimit: 1024, // MB
      timeoutLimit: 3600000, // 1 hour
      costLimits: {
        maxCostPerExecution: 10.0,
        maxTotalCost: 100.0,
        costPerHour: 5.0
      },
      resourceLimits: {
        'gpu': 1,
        'cpu_cores': 4,
        'network_bandwidth': 100 // Mbps
      }
    };
  }

  /**
   * Execute a workflow with DAG-based execution
   */
  async executeWorkflow(
    workflow: Workflow,
    globalInputs: Record<string, any> = {},
    options: Partial<WorkflowExecutionOptions> = {}
  ): Promise<WorkflowExecutionResult> {
    const executionOptions = { ...this.defaultOptions, ...options };
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      // Initialize execution
      this.metricsCollector?.recordWorkflowStart(executionId);
      this.emitEvent({
        type: 'workflowStarted',
        executionId,
        workflowId: workflow.id,
        timestamp: startTime,
        data: { globalInputs, options: executionOptions }
      });

      // Validate workflow structure
      const validation = this.validateWorkflow(workflow);
      if (!validation.valid) {
        throw new ValidationError('Workflow validation failed', validation.errors, validation.warnings);
      }

      // Build execution graph
      const { executionOrder, dataConnections } = this.buildExecutionGraph(workflow);

      // Initialize execution state
      const executionState = this.initializeExecutionState(
        executionId,
        workflow.id,
        executionOrder,
        globalInputs,
        executionOptions
      );

      // Try to resume from checkpoint if available
      const checkpointData = await this.tryResumeFromCheckpoint(executionId, executionState);
      if (checkpointData) {
        this.restoreExecutionState(executionState, checkpointData);
      }

      // Execute nodes
      const result = await this.executeNodes(
        workflow,
        executionOrder,
        dataConnections,
        executionState,
        executionOptions
      );

      // Finalize execution
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.metricsCollector?.recordWorkflowComplete(executionId, duration, result.status === ExecutionStatus.COMPLETED);

      const finalResult: WorkflowExecutionResult = {
        executionId,
        workflowId: workflow.id,
        status: result.status,
        startTime,
        endTime,
        duration,
        results: result.nodeResults,
        executionOrder,
        metrics: result.metrics,
        error: result.error,
        checkpointData: executionOptions.enableCheckpointing ? this.createCheckpointData(executionState) : undefined
      };

      this.emitEvent({
        type: 'workflowCompleted',
        executionId,
        workflowId: workflow.id,
        timestamp: endTime,
        data: finalResult
      });

      return finalResult;

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.metricsCollector?.recordWorkflowComplete(executionId, duration, false);

      const executionError = error instanceof ExecutionError ? error : new ExecutionError(
        `Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`,
        executionId,
        undefined,
        error instanceof Error ? error : undefined
      );

      this.emitEvent({
        type: 'workflowFailed',
        executionId,
        workflowId: workflow.id,
        timestamp: endTime,
        data: { error: executionError.message, cause: error instanceof Error ? error.message : String(error) }
      });

      return {
        executionId,
        workflowId: workflow.id,
        status: ExecutionStatus.FAILED,
        startTime,
        endTime,
        duration,
        results: {},
        executionOrder: [],
        metrics: this.createEmptyMetrics(),
        error: executionError.message
      };
    }
  }

  /**
   * Build execution graph with topological sorting
   */
  private buildExecutionGraph(workflow: Workflow): {
    executionOrder: string[];
    dataConnections: DataFlowConnection[];
  } {
    const graph: Map<string, string[]> = new Map();
    const indegree: Map<string, number> = new Map();
    const dataConnections: DataFlowConnection[] = [];

    // Initialize graph
    for (const node of workflow.nodes) {
      graph.set(node.id, []);
      indegree.set(node.id, 0);
    }

    // Build graph from edges
    for (const edge of workflow.edges) {
      graph.get(edge.from)!.push(edge.to);
      indegree.set(edge.to, indegree.get(edge.to)! + 1);

      // Create data connection
      dataConnections.push({
        sourceNodeId: edge.from,
        targetNodeId: edge.to,
        sourceOutputKey: edge.meta?.sourceHandle,
        targetInputKey: edge.meta?.targetHandle
      });
    }

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const executionOrder: string[] = [];

    // Find nodes with no incoming edges
    for (const [nodeId, degree] of indegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      executionOrder.push(nodeId);

      for (const neighbor of graph.get(nodeId) || []) {
        const newDegree = indegree.get(neighbor)! - 1;
        indegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for cycles
    if (executionOrder.length !== workflow.nodes.length) {
      throw new ValidationError('Workflow contains cycles', ['Graph contains cycles']);
    }

    return { executionOrder, dataConnections };
  }

  /**
   * Execute nodes with parallel processing and error handling
   */
  private async executeNodes(
    workflow: Workflow,
    executionOrder: string[],
    dataConnections: DataFlowConnection[],
    executionState: ExecutionState,
    options: WorkflowExecutionOptions
  ): Promise<{
    status: ExecutionStatus;
    nodeResults: Record<string, NodeExecutionResult>;
    metrics: ExecutionMetrics;
    error?: string;
  }> {
    const nodeMap = new Map(workflow.nodes.map((node: Node) => [node.id, node]));
    const semaphore = new Semaphore(options.maxParallelNodes);
    const executing: Promise<void>[] = [];

    // Process nodes in topological order
    for (const nodeId of executionOrder) {
      if (executionState.completedNodes.has(nodeId)) {
        continue; // Skip already completed nodes
      }

      // Check if all dependencies are satisfied
      if (!this.areDependenciesSatisfied(nodeId, dataConnections, executionState.nodeResults)) {
        continue; // Skip nodes with unsatisfied dependencies
      }

      // Execute node (with parallelism control)
      const executionPromise = semaphore.acquire().then(async (release) => {
        try {
          await this.executeNode(nodeId, nodeMap.get(nodeId)!, dataConnections, executionState, options);
        } finally {
          release();
        }
      });

      executing.push(executionPromise);

      // Handle parallel execution limits
      if (!options.parallelExecution || executing.length >= options.maxParallelNodes) {
        await Promise.race(executing);
        // Remove completed promises
        const completedIndex = executing.findIndex(p => p === Promise.race(executing));
        if (completedIndex !== -1) {
          executing.splice(completedIndex, 1);
        }
      }

      // Checkpoint if enabled
      if (options.enableCheckpointing && Date.now() - executionState.lastCheckpoint > options.checkpointInterval) {
        await this.createCheckpoint(executionState);
      }

      // Check for workflow failure
      if (options.stopOnFailure && executionState.failedNodes.size > 0) {
        break;
      }
    }

    // Wait for all executing nodes to complete
    await Promise.all(executing);

    // Determine final status
    const hasFailures = executionState.failedNodes.size > 0;
    const allCompleted = executionState.completedNodes.size === workflow.nodes.length;

    let status: ExecutionStatus;
    let error: string | undefined;

    if (hasFailures && options.stopOnFailure) {
      status = ExecutionStatus.FAILED;
      error = `Workflow failed due to node failures: ${Array.from(executionState.failedNodes).join(', ')}`;
    } else if (allCompleted) {
      status = ExecutionStatus.COMPLETED;
    } else {
      status = ExecutionStatus.FAILED;
      error = 'Workflow did not complete all nodes';
    }

    return {
      status,
      nodeResults: executionState.nodeResults,
      metrics: this.calculateMetrics(executionState),
      error
    };
  }

  /**
   * Execute a single node with retry logic and timeout handling
   */
  private async executeNode(
    nodeId: string,
    node: Node,
    dataConnections: DataFlowConnection[],
    executionState: ExecutionState,
    options: WorkflowExecutionOptions
  ): Promise<void> {
    const startTime = Date.now();
    let retryState = executionState.retryStates.get(nodeId) || {
      nodeId,
      attemptCount: 0,
      totalDelay: 0
    };

    this.metricsCollector?.recordNodeStart(nodeId, executionState.executionId);
    this.emitEvent({
      type: 'nodeStarted',
      executionId: executionState.executionId,
      workflowId: executionState.workflowId,
      nodeId,
      timestamp: startTime,
      data: { nodeType: node.type, retryCount: retryState.attemptCount }
    });

    // Prepare node inputs
    const nodeInputs = this.prepareNodeInputs(nodeId, dataConnections, executionState);

    while (retryState.attemptCount <= options.retryConfig.maxRetries) {
      try {
        // Create execution context
        const context: ExecutionContext = {
          executionId: executionState.executionId,
          workflowId: executionState.workflowId,
          nodeId,
          globalInputs: executionState.globalInputs,
          nodeInputs,
          executionOptions: options,
          services: executionState.services,
          timeout: options.timeoutConfig.nodeTimeout
        };

        // Get appropriate executor
        const executor = this.getNodeExecutor(node);
        if (!executor) {
          throw new ExecutionError(`No executor found for node type: ${node.type}`, executionState.executionId, nodeId);
        }

        // Execute with timeout
        const outputs = await this.executeWithTimeout(
          () => executor.execute(context),
          options.timeoutConfig.nodeTimeout,
          executionState.executionId,
          nodeId
        );

        // Record successful execution
        const endTime = Date.now();
        const result: NodeExecutionResult = {
          nodeId,
          status: NodeExecutionStatus.COMPLETED,
          inputs: nodeInputs,
          outputs,
          startTime,
          endTime,
          duration: endTime - startTime,
          retryCount: retryState.attemptCount,
          metadata: { executorType: executor.type }
        };

        executionState.nodeResults[nodeId] = result;
        executionState.completedNodes.add(nodeId);

        this.metricsCollector?.recordNodeComplete(nodeId, executionState.executionId, result.duration!, true);
        this.emitEvent({
          type: 'nodeCompleted',
          executionId: executionState.executionId,
          workflowId: executionState.workflowId,
          nodeId,
          timestamp: endTime,
          data: result
        });

        return;

      } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        retryState.attemptCount++;
        retryState.lastError = err.message;

        const isRetryable = this.isRetryableError(err, options.retryConfig);
        const shouldRetry = isRetryable && retryState.attemptCount <= options.retryConfig.maxRetries;

        if (shouldRetry) {
          // Calculate backoff delay
          const delay = Math.min(
            options.retryConfig.baseDelay * Math.pow(options.retryConfig.backoffMultiplier, retryState.attemptCount - 1),
            options.retryConfig.maxDelay
          );

          retryState.totalDelay += delay;
          retryState.nextRetryTime = Date.now() + delay;

          executionState.retryStates.set(nodeId, retryState);

          this.emitEvent({
            type: 'nodeRetrying',
            executionId: executionState.executionId,
            workflowId: executionState.workflowId,
            nodeId,
            timestamp: Date.now(),
            data: { attempt: retryState.attemptCount, delay, error: err.message }
          });

          await this.delay(delay);
        } else {
          // Mark as failed
          const endTime = Date.now();
          const result: NodeExecutionResult = {
            nodeId,
            status: NodeExecutionStatus.FAILED,
            inputs: nodeInputs,
            outputs: {},
            startTime,
            endTime,
            duration: endTime - startTime,
            retryCount: retryState.attemptCount,
            error: err.message,
            metadata: { executorType: node.type }
          };

          executionState.nodeResults[nodeId] = result;
          executionState.failedNodes.add(nodeId);

          this.metricsCollector?.recordNodeComplete(nodeId, executionState.executionId, result.duration!, false);
          this.emitEvent({
            type: 'nodeFailed',
            executionId: executionState.executionId,
            workflowId: executionState.workflowId,
            nodeId,
            timestamp: endTime,
            data: result
          });

          if (retryState.attemptCount > options.retryConfig.maxRetries) {
            throw new RetryExhaustedError(
              executionState.executionId,
              nodeId,
              retryState.attemptCount,
              err.message
            );
          }

          throw err;
        }
      }
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number,
    executionId: string,
    nodeId: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(executionId, nodeId, timeout));
      }, timeout);

      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  /**
   * Prepare inputs for a node based on data connections
   */
  private prepareNodeInputs(
    nodeId: string,
    dataConnections: DataFlowConnection[],
    executionState: ExecutionState
  ): Record<string, any> {
    const inputs: Record<string, any> = {};

    // Get all connections targeting this node
    const targetConnections = dataConnections.filter(conn => conn.targetNodeId === nodeId);

    for (const connection of targetConnections) {
      const sourceResult = executionState.nodeResults[connection.sourceNodeId];
      if (!sourceResult || sourceResult.status !== NodeExecutionStatus.COMPLETED) {
        continue; // Skip if source node hasn't completed successfully
      }

      const sourceOutputs = sourceResult.outputs;

      if (connection.sourceOutputKey) {
        // Specific output key
        const value = sourceOutputs[connection.sourceOutputKey];
        if (connection.targetInputKey) {
          inputs[connection.targetInputKey] = value;
        } else {
          inputs[connection.sourceOutputKey] = value;
        }
      } else {
        // All outputs from source node
        if (connection.targetInputKey) {
          inputs[connection.targetInputKey] = sourceOutputs;
        } else {
          Object.assign(inputs, sourceOutputs);
        }
      }
    }

    return inputs;
  }

  /**
   * Check if all dependencies for a node are satisfied
   */
  private areDependenciesSatisfied(
    nodeId: string,
    dataConnections: DataFlowConnection[],
    nodeResults: Record<string, NodeExecutionResult>
  ): boolean {
    const dependencies = dataConnections
      .filter(conn => conn.targetNodeId === nodeId)
      .map(conn => conn.sourceNodeId);

    return dependencies.every(depId => {
      const result = nodeResults[depId];
      return result && result.status === NodeExecutionStatus.COMPLETED;
    });
  }

  /**
   * Get appropriate executor for a node
   */
  private getNodeExecutor(node: Node): NodeExecutor | undefined {
    // Map node type to executor type
    const executorType = this.mapNodeTypeToExecutor(node.type);
    return this.nodeExecutors.get(executorType);
  }

  /**
   * Map node type to executor type
   */
  private mapNodeTypeToExecutor(nodeType: string): string {
    // This mapping could be configurable
    const typeMapping: Record<string, string> = {
      'llm': 'LLM',
      'code': 'Code',
      'dom_action': 'DOM',
      'condition': 'Code',
      'merge': 'Code',
      'transform': 'Code'
    };

    return typeMapping[nodeType] || 'Code';
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflow(workflow: Workflow): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    if (!workflow.edges) {
      warnings.push('Workflow has no edges defined');
    }

    // Check for duplicate node IDs
    const nodeIds = new Set<string>();
    for (const node of workflow.nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    // Check edge validity
    const validNodeIds = new Set(workflow.nodes.map((n: Node) => n.id));
    for (const edge of workflow.edges || []) {
      if (!validNodeIds.has(edge.from)) {
        errors.push(`Edge references invalid source node: ${edge.from}`);
      }
      if (!validNodeIds.has(edge.to)) {
        errors.push(`Edge references invalid target node: ${edge.to}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Initialize execution state
   */
  private initializeExecutionState(
    executionId: string,
    workflowId: string,
    executionOrder: string[],
    globalInputs: Record<string, any>,
    options: WorkflowExecutionOptions
  ): ExecutionState {
    return {
      executionId,
      workflowId,
      status: ExecutionStatus.RUNNING,
      startTime: Date.now(),
      completedNodes: new Set(),
      failedNodes: new Set(),
      pendingNodes: new Set(executionOrder),
      nodeResults: {},
      retryStates: new Map(),
      globalInputs,
      services: {},
      lastCheckpoint: Date.now()
    };
  }

  /**
   * Try to resume from checkpoint
   */
  private async tryResumeFromCheckpoint(
    executionId: string,
    executionState: ExecutionState
  ): Promise<CheckpointData | null> {
    if (!this.stateManager) return null;

    try {
      const checkpoint = await this.stateManager.loadState(executionId);
      return checkpoint || null;
    } catch (error) {
      // Log warning but continue with fresh execution
      console.warn(`Failed to load checkpoint for execution ${executionId}:`, error);
      return null;
    }
  }

  /**
   * Restore execution state from checkpoint
   */
  private restoreExecutionState(
    executionState: ExecutionState,
    checkpoint: CheckpointData
  ): void {
    executionState.completedNodes = new Set(checkpoint.completedNodes);
    executionState.nodeResults = checkpoint.nodeResults;
    executionState.retryStates = new Map(
      Object.entries(checkpoint.retryStates).map(([k, v]) => [k, v])
    );
  }

  /**
   * Create checkpoint
   */
  private async createCheckpoint(executionState: ExecutionState): Promise<void> {
    if (!this.stateManager) return;

    const checkpoint: CheckpointData = {
      executionId: executionState.executionId,
      workflowId: executionState.workflowId,
      status: executionState.status,
      completedNodes: Array.from(executionState.completedNodes),
      nodeResults: executionState.nodeResults,
      dataFlow: {},
      metrics: this.calculateMetrics(executionState),
      retryStates: Object.fromEntries(executionState.retryStates),
      timestamp: Date.now()
    };

    try {
      await this.stateManager.saveState(executionState.executionId, checkpoint);
      executionState.lastCheckpoint = Date.now();
    } catch (error) {
      console.error(`Failed to create checkpoint for execution ${executionState.executionId}:`, error);
    }
  }

  /**
   * Create checkpoint data from execution state
   */
  private createCheckpointData(executionState: ExecutionState): CheckpointData {
    return {
      executionId: executionState.executionId,
      workflowId: executionState.workflowId,
      status: executionState.status,
      completedNodes: Array.from(executionState.completedNodes),
      nodeResults: executionState.nodeResults,
      dataFlow: {},
      metrics: this.calculateMetrics(executionState),
      retryStates: Object.fromEntries(executionState.retryStates),
      timestamp: Date.now()
    };
  }

  /**
   * Calculate execution metrics
   */
  private calculateMetrics(executionState: ExecutionState): ExecutionMetrics {
    const nodeResults = Object.values(executionState.nodeResults);
    const completedCount = executionState.completedNodes.size;
    const failedCount = executionState.failedNodes.size;
    const totalDuration = nodeResults.reduce((sum, r) => sum + (r.duration || 0), 0);

    return {
      startTime: executionState.startTime,
      endTime: Date.now(),
      duration: Date.now() - executionState.startTime,
      nodeCount: executionState.pendingNodes.size + completedCount + failedCount,
      completedNodes: completedCount,
      failedNodes: failedCount,
      skippedNodes: 0, // Not implemented yet
      retryCount: nodeResults.reduce((sum, r) => sum + r.retryCount, 0),
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: undefined // Would need additional monitoring
    };
  }

  /**
   * Create empty metrics
   */
  private createEmptyMetrics(): ExecutionMetrics {
    return {
      startTime: Date.now(),
      nodeCount: 0,
      completedNodes: 0,
      failedNodes: 0,
      skippedNodes: 0,
      retryCount: 0
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, retryConfig: RetryConfig): boolean {
    const errorName = error.constructor.name;
    return retryConfig.retryableErrors.includes(errorName) ||
           retryConfig.retryableErrors.some((type: string) => error.message.includes(type));
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Emit event using the event emitter
   */
  private emitEvent(event: ExecutionEvent): void {
    this.eventEmitter.emit(event.type, event);
  }

  /**
   * Event emitter interface
   */
  emit(event: ExecutionEvent): void {
    this.emitEvent(event);
  }

  on(eventType: string, handler: (event: ExecutionEvent) => void): void {
    this.eventEmitter.on(eventType, handler);
  }

  off(eventType: string, handler: (event: ExecutionEvent) => void): void {
    this.eventEmitter.off(eventType, handler);
  }

  getEventHistory(executionId: string): ExecutionEvent[] {
    // This would require storing event history
    return [];
  }
}

// ===== PHASE 6: ADVANCED PARALLELISM AND RESOURCE MANAGEMENT =====

/**
 * Validate pattern compositions in workflow
 */
function validatePatternCompositions(
  workflow: Workflow,
  options: ExtendedWorkflowExecutionOptions,
  patternRegistry?: PatternRegistry
): Promise<void> {
  if (!patternRegistry) return Promise.resolve();

  // Check for pattern nodes and validate them
  for (const node of workflow.nodes) {
    if (node.type === 'pattern') {
      const patternId = (node as any).patternId;
      if (patternId) {
        // This would validate the pattern exists
        // For now, just check if it's in the registry list
        if (options.patternComposition?.patternRegistry &&
            !options.patternComposition.patternRegistry.includes(patternId)) {
          throw new ValidationError(`Pattern ${patternId} not found in registry`);
        }
      }
    }
  }
  return Promise.resolve();
}

/**
 * Initialize execution state with Phase 6 features
 */
function initializeExecutionState(
  executionId: string,
  workflowId: string,
  executionOrder: string[],
  globalInputs: Record<string, any>,
  options: WorkflowExecutionOptions,
  extendedOptions: ExtendedWorkflowExecutionOptions,
  defaultCapabilityBudget: CapabilityBudget
): ExecutionState {
  return {
    executionId,
    workflowId,
    status: ExecutionStatus.RUNNING,
    startTime: Date.now(),
    completedNodes: new Set(),
    failedNodes: new Set(),
    pendingNodes: new Set(executionOrder),
    nodeResults: {},
    retryStates: new Map(),
    globalInputs,
    services: {
      // Phase 6 services
      capabilityBudget: extendedOptions.resourceManagement?.capabilityBudget || defaultCapabilityBudget
    },
    lastCheckpoint: Date.now()
  };
}

/**
 * Execute nodes with advanced parallelism and Phase 6 features
 */
async function executeNodesAdvanced(
  workflow: Workflow,
  executionOrder: string[],
  dataConnections: DataFlowConnection[],
  executionState: ExecutionState,
  options: ExtendedWorkflowExecutionOptions,
  parallelExecutor: ParallelExecutor,
  resourceManager?: ResourceManager
): Promise<{
  status: ExecutionStatus;
  nodeResults: Record<string, NodeExecutionResult>;
  metrics: ExecutionMetrics;
  error?: string;
}> {
  const nodeMap = new Map(workflow.nodes.map((node: Node) => [node.id, node]));
  const parallelismEnabled = options.parallelism?.enabled ?? true;
  const maxConcurrency = options.parallelism?.maxConcurrency || options.maxParallelNodes;

  // Phase 6: Initialize resource tracking
  const resourceAllocations: ResourceAllocation[] = [];

  // Process nodes with advanced parallelism
  const executing: Promise<void>[] = [];

  for (const nodeId of executionOrder) {
    if (executionState.completedNodes.has(nodeId)) {
      continue; // Skip already completed nodes
    }

    // Check if all dependencies are satisfied
    if (!areDependenciesSatisfied(nodeId, dataConnections, executionState.nodeResults)) {
      continue; // Skip nodes with unsatisfied dependencies
    }

    // Determine execution mode for this node
    const node = nodeMap.get(nodeId)!;
    const executionMode = determineExecutionMode(node, options);

    // Handle different execution modes
    const executionPromise = executeNodeAdvanced(
      nodeId,
      node,
      dataConnections,
      executionState,
      options,
      executionMode,
      resourceAllocations,
      parallelExecutor,
      resourceManager
    );

    executing.push(executionPromise);

    // Handle parallelism limits
    if (!parallelismEnabled || executing.length >= maxConcurrency) {
      await Promise.race(executing);
      // Remove completed promises (simplified)
      executing.splice(0, executing.length);
    }

    // Check for workflow failure
    if (options.stopOnFailure && executionState.failedNodes.size > 0) {
      break;
    }
  }

  // Wait for all executing nodes to complete
  await Promise.all(executing);

  // Determine final status
  const hasFailures = executionState.failedNodes.size > 0;
  const allCompleted = executionState.completedNodes.size === workflow.nodes.length;

  let status: ExecutionStatus;
  let error: string | undefined;

  if (hasFailures && options.stopOnFailure) {
    status = ExecutionStatus.FAILED;
    error = `Workflow failed due to node failures: ${Array.from(executionState.failedNodes).join(', ')}`;
  } else if (allCompleted) {
    status = ExecutionStatus.COMPLETED;
  } else {
    status = ExecutionStatus.FAILED;
    error = 'Workflow did not complete all nodes';
  }

  return {
    status,
    nodeResults: executionState.nodeResults,
    metrics: calculateMetrics(executionState),
    error
  };
}

/**
 * Determine execution mode for a node based on its type and configuration
 */
function determineExecutionMode(
  node: Node,
  options: ExtendedWorkflowExecutionOptions
): ParallelismMode {
  // Check node configuration for parallelism hints
  const nodeConfig = node.configuration || {};

  if (nodeConfig.parallelismMode) {
    return nodeConfig.parallelismMode as ParallelismMode;
  }

  // Default based on node type
  switch (node.type) {
    case 'split':
    case 'map':
      return ParallelismMode.FAN_OUT;
    case 'merge':
    case 'join':
      return ParallelismMode.FAN_IN;
    case 'pattern':
      return ParallelismMode.SEQUENTIAL; // Patterns handle their own parallelism
    default:
      return options.parallelism?.enabled ? ParallelismMode.PARALLEL : ParallelismMode.SEQUENTIAL;
  }
}

/**
 * Execute a single node with advanced parallelism features
 */
async function executeNodeAdvanced(
  nodeId: string,
  node: Node,
  dataConnections: DataFlowConnection[],
  executionState: ExecutionState,
  options: ExtendedWorkflowExecutionOptions,
  executionMode: ParallelismMode,
  resourceAllocations: ResourceAllocation[],
  parallelExecutor: ParallelExecutor,
  resourceManager?: ResourceManager
): Promise<void> {
  const startTime = Date.now();

  // Phase 6: Allocate resources if needed
  if (resourceManager && options.resourceManagement?.enforceBudgets) {
    const requirements = extractResourceRequirements(node);
    const allocated = await resourceManager.allocate(nodeId, requirements);
    if (!allocated) {
      throw new ExecutionError(`Failed to allocate resources for node ${nodeId}`, executionState.executionId, nodeId);
    }

    resourceAllocations.push({
      resourceType: 'node_execution',
      amount: 1,
      nodeId,
      allocatedAt: startTime
    });
  }

  try {
    // Handle different execution modes
    switch (executionMode) {
      case ParallelismMode.FAN_OUT:
        await executeFanOutNode(nodeId, node, dataConnections, executionState, options, parallelExecutor);
        break;

      case ParallelismMode.FAN_IN:
        await executeFanInNode(nodeId, node, dataConnections, executionState, options, parallelExecutor);
        break;

      case ParallelismMode.SEQUENTIAL:
      default:
        await executeNode(nodeId, node, dataConnections, executionState, options);
        break;
    }

  } finally {
    // Phase 6: Deallocate resources
    if (resourceManager) {
      await resourceManager.deallocate(nodeId);
    }
  }
}

/**
 * Execute a fan-out node (Split/Map)
 */
async function executeFanOutNode(
  nodeId: string,
  node: Node,
  dataConnections: DataFlowConnection[],
  executionState: ExecutionState,
  options: ExtendedWorkflowExecutionOptions,
  parallelExecutor: ParallelExecutor
): Promise<void> {
  const nodeInputs = prepareNodeInputs(nodeId, dataConnections, executionState);

  // Extract fan-out configuration
  const fanOutConfig: FanOutConfig = {
    maxConcurrency: options.parallelism?.maxConcurrency || 5,
    batchSize: node.configuration?.batchSize,
    backpressure: node.configuration?.backpressure
  };

  // Use parallel executor for fan-out
  const results = await parallelExecutor.executeFanOut(
    nodeId,
    Array.isArray(nodeInputs) ? nodeInputs : [nodeInputs],
    fanOutConfig,
    createExtendedContext(executionState, options)
  );

  // Store results
  const result: NodeExecutionResult = {
    nodeId,
    status: NodeExecutionStatus.COMPLETED,
    inputs: nodeInputs,
    outputs: { results },
    startTime: Date.now(),
    endTime: Date.now(),
    duration: 0,
    retryCount: 0,
    metadata: { executionMode: ParallelismMode.FAN_OUT, resultCount: results.length }
  };

  executionState.nodeResults[nodeId] = result;
  executionState.completedNodes.add(nodeId);
}

/**
 * Execute a fan-in node (Merge/Join)
 */
async function executeFanInNode(
  nodeId: string,
  node: Node,
  dataConnections: DataFlowConnection[],
  executionState: ExecutionState,
  options: ExtendedWorkflowExecutionOptions,
  parallelExecutor: ParallelExecutor
): Promise<void> {
  // Collect all inputs from dependencies
  const inputPromises: Promise<any>[] = [];
  const dependencies = dataConnections
    .filter(conn => conn.targetNodeId === nodeId)
    .map(conn => conn.sourceNodeId);

  for (const depId of dependencies) {
    const depResult = executionState.nodeResults[depId];
    if (depResult?.status === NodeExecutionStatus.COMPLETED) {
      inputPromises.push(Promise.resolve(depResult.outputs));
    }
  }

  const inputs = await Promise.all(inputPromises);

  // Extract fan-in configuration
  const fanInConfig: FanInConfig = {
    quorum: node.configuration?.quorum || { type: 'all' },
    aggregation: node.configuration?.aggregation,
    ordering: node.configuration?.ordering
  };

  // Use parallel executor for fan-in
  const result = await parallelExecutor.executeFanIn(
    nodeId,
    inputs,
    fanInConfig,
    createExtendedContext(executionState, options)
  );

  // Store results
  const nodeResult: NodeExecutionResult = {
    nodeId,
    status: NodeExecutionStatus.COMPLETED,
    inputs: { sources: dependencies },
    outputs: { result },
    startTime: Date.now(),
    endTime: Date.now(),
    duration: 0,
    retryCount: 0,
    metadata: { executionMode: ParallelismMode.FAN_IN, inputCount: inputs.length }
  };

  executionState.nodeResults[nodeId] = nodeResult;
  executionState.completedNodes.add(nodeId);
}

/**
 * Create extended execution context for Phase 6 features
 */
function createExtendedContext(
  executionState: ExecutionState,
  options: ExtendedWorkflowExecutionOptions
): ExtendedExecutionContext {
  return {
    executionId: executionState.executionId,
    workflowId: executionState.workflowId,
    nodeId: '', // Set by caller
    globalInputs: executionState.globalInputs,
    nodeInputs: {}, // Set by caller
    executionOptions: options,
    services: executionState.services,
    timeout: options.timeoutConfig?.nodeTimeout || 300000,
    parallelContext: {
      mode: ParallelismMode.SEQUENTIAL, // Default
      resourceBudget: options.resourceManagement?.capabilityBudget || {
        browserContexts: 3,
        concurrentNodes: 5,
        memoryLimit: 1024,
        timeoutLimit: 3600000,
        costLimits: { maxCostPerExecution: 10, maxTotalCost: 100, costPerHour: 5 },
        resourceLimits: {}
      },
      patternInstances: new Map()
    },
    patternInstances: new Map()
  };
}

/**
 * Extract resource requirements from node configuration
 */
function extractResourceRequirements(node: Node): any {
  return {
    browserContexts: node.configuration?.browserContexts || 0,
    memory: node.configuration?.memoryLimit || 0,
    timeout: node.configuration?.timeout || 0,
    capabilities: node.configuration?.capabilities || []
  };
}

/**
 * Semaphore for controlling parallelism
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    if (this.permits > 0) {
      this.permits--;
      return () => this.release();
    }

    return new Promise(resolve => {
      this.waiting.push(() => {
        this.permits--;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    }
  }
}

/**
 * Internal execution state
 */
interface ExecutionState {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  startTime: number;
  completedNodes: Set<string>;
  failedNodes: Set<string>;
  pendingNodes: Set<string>;
  nodeResults: Record<string, NodeExecutionResult>;
  retryStates: Map<string, RetryState>;
  globalInputs: Record<string, any>;
  services: Record<string, any>;
  lastCheckpoint: number;
}