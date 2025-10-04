import { EventEmitter } from 'events';
import {
  Workflow,
  ExecutionStatus,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
  ExecutionProgress,
  ExecutionEvent,
  ValidationResult,
  WorkflowExecutionOptions as WFOptions,
  ExecutionStateManager,
  MetricsCollector,
  ExecutionEventEmitter,
  ExecutionError,
  ValidationError,
  ExecutionEventType,
  OperationalState
} from '../types/execution.js';
import { OperationalSemanticsExecutor, FileArtifactStore, WebSocketEventStream } from './index.js';

export class WorkflowRunner implements ExecutionEventEmitter {
  private eventEmitter: EventEmitter;
  private operationalExecutor: OperationalSemanticsExecutor;
  private webSocketStream: WebSocketEventStream;
  private activeExecutions: Map<string, WorkflowExecutionResult>;
  private executionProgress: Map<string, ExecutionProgress>;
  private operationalStates: Map<string, OperationalState>;

  constructor(
    operationalExecutor?: OperationalSemanticsExecutor,
    webSocketStream?: WebSocketEventStream,
    private stateManager?: ExecutionStateManager,
    private metricsCollector?: MetricsCollector
  ) {
    this.eventEmitter = new EventEmitter();

    // Initialize with operational semantics executor
    if (operationalExecutor) {
      this.operationalExecutor = operationalExecutor;
    } else {
      const artifactStore = new FileArtifactStore();
      this.operationalExecutor = new OperationalSemanticsExecutor(artifactStore);
    }

    // Initialize WebSocket event streaming
    this.webSocketStream = webSocketStream || new WebSocketEventStream();

    // Forward events from operational executor to WebSocket stream
    this.operationalExecutor.on(ExecutionEventType.WORKFLOW_STARTED, (event: ExecutionEvent) => {
      this.webSocketStream.emit(event);
    });
    this.operationalExecutor.on(ExecutionEventType.NODE_STARTED, (event: ExecutionEvent) => {
      this.webSocketStream.emit(event);
    });
    this.operationalExecutor.on(ExecutionEventType.STEP_STARTED, (event: ExecutionEvent) => {
      this.webSocketStream.emit(event);
    });
    this.operationalExecutor.on(ExecutionEventType.STEP_LOG, (event: ExecutionEvent) => {
      this.webSocketStream.emit(event);
    });
    this.operationalExecutor.on(ExecutionEventType.STEP_SUCCEEDED, (event: ExecutionEvent) => {
      this.webSocketStream.emit(event);
    });
    this.operationalExecutor.on(ExecutionEventType.NODE_SUCCEEDED, (event: ExecutionEvent) => {
      this.webSocketStream.emit(event);
    });
    this.operationalExecutor.on(ExecutionEventType.NODE_FAILED, (event: ExecutionEvent) => {
      this.webSocketStream.emit(event);
    });
    this.operationalExecutor.on(ExecutionEventType.EXECUTION_COMPLETED, (event: ExecutionEvent) => {
      this.webSocketStream.emit(event);
    });

    this.activeExecutions = new Map();
    this.executionProgress = new Map();
    this.operationalStates = new Map();
  }

  /**
   * Execute a workflow with full orchestration using operational semantics
   */
  async executeWorkflow(
    workflow: Workflow,
    globalInputs: Record<string, any> = {},
    options: Partial<WFOptions> = {}
  ): Promise<WorkflowExecutionResult> {
    const executionId = this.generateExecutionId();

    try {
      // Initialize execution tracking
      const initialProgress: ExecutionProgress = {
        executionId,
        status: ExecutionStatus.PENDING,
        progress: 0,
        completedNodes: [],
        pendingNodes: workflow.nodes.map((n: any) => n.id),
        failedNodes: [],
        metrics: {
          startTime: Date.now(),
          nodeCount: workflow.nodes.length,
          completedNodes: 0,
          failedNodes: 0,
          skippedNodes: 0,
          retryCount: 0
        }
      };

      this.executionProgress.set(executionId, initialProgress);

      // Initialize operational state
      const operationalState = await this.operationalExecutor.initializeState(
        workflow,
        executionId,
        globalInputs
      );
      this.operationalStates.set(executionId, operationalState);

      // Emit workflow started event
      const startEvent: ExecutionEvent = {
        type: ExecutionEventType.WORKFLOW_STARTED,
        executionId,
        workflowId: workflow.id,
        timestamp: Date.now(),
        data: { globalInputs, options }
      };
      await this.operationalExecutor.transition(operationalState, startEvent);

      // Execute workflow using operational semantics
      const result = await this.executeWithOperationalSemantics(
        workflow,
        operationalState,
        {
          parallelExecution: true,
          maxParallelNodes: 5,
          stopOnFailure: true,
          enableCheckpointing: true,
          checkpointInterval: 30000,
          retryConfig: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
            retryableErrors: ['TimeoutError', 'NetworkError', 'TemporaryFailure']
          },
          timeoutConfig: {
            nodeTimeout: 300000,
            workflowTimeout: 3600000,
            gracePeriod: 5000
          },
          enableMetrics: true,
          logLevel: 'info',
          ...options
        }
      );

      // Update tracking
      this.activeExecutions.set(executionId, result);
      this.updateProgress(executionId, {
        ...initialProgress,
        status: result.status,
        progress: 100,
        completedNodes: result.executionOrder,
        pendingNodes: [],
        failedNodes: result.status === ExecutionStatus.FAILED ? [] : [], // Would need to track failed nodes
        metrics: result.metrics
      });

      return result;

    } catch (error) {
      const executionError = error instanceof ExecutionError ? error : new ExecutionError(
        `Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`,
        executionId,
        undefined,
        error instanceof Error ? error : undefined
      );

      // Update progress with failure
      const progress = this.executionProgress.get(executionId);
      if (progress) {
        this.updateProgress(executionId, {
          ...progress,
          status: ExecutionStatus.FAILED,
          failedNodes: [] // Would need to track which nodes failed
        });
      }

      return {
        executionId,
        workflowId: workflow.id,
        status: ExecutionStatus.FAILED,
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        results: {},
        executionOrder: [],
        metrics: {
          startTime: Date.now(),
          nodeCount: 0,
          completedNodes: 0,
          failedNodes: 0,
          skippedNodes: 0,
          retryCount: 0
        },
        error: executionError.message
      };
    }
  }

  /**
   * Execute workflow using operational semantics with event-driven transitions
   */
  private async executeWithOperationalSemantics(
    workflow: Workflow,
    state: OperationalState,
    options: WFOptions
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const nodeMap = new Map(workflow.nodes.map((n: any) => [n.id, n]));

    // Main execution loop - process ready nodes until completion
    while (!this.operationalExecutor.isExecutionComplete(state)) {
      const readyNodes = this.operationalExecutor.getReadyNodes(state);

      if (readyNodes.length === 0) {
        // No ready nodes but execution not complete - potential deadlock
        break;
      }

      // Execute ready nodes (for now, execute one at a time for simplicity)
      // In a full implementation, this would handle parallel execution
      const nodeId = readyNodes[0];
      const node = nodeMap.get(nodeId);

      if (!node) continue;

      try {
        // Allocate resources for the node
        const requirements = this.getNodeRequirements(node);
        const allocated = await this.operationalExecutor.allocateResources(
          state,
          nodeId,
          requirements
        );

        if (!allocated) {
          // Resources not available - would need to wait or handle differently
          break;
        }

        // Emit node started event
        const nodeStartEvent: ExecutionEvent = {
          type: ExecutionEventType.NODE_STARTED,
          executionId: state.runId,
          workflowId: workflow.id,
          nodeId,
          timestamp: Date.now(),
          data: { nodeType: node.type }
        };
        await this.operationalExecutor.transition(state, nodeStartEvent);

        // Simulate node execution (in real implementation, this would call actual node executors)
        await this.simulateNodeExecution(workflow, state, nodeId, node);

        // Emit node succeeded event
        const nodeSuccessEvent: ExecutionEvent = {
          type: ExecutionEventType.NODE_SUCCEEDED,
          executionId: state.runId,
          workflowId: workflow.id,
          nodeId,
          timestamp: Date.now(),
          data: { outputs: { result: `Node ${nodeId} completed` } }
        };
        await this.operationalExecutor.transition(state, nodeSuccessEvent);

      } catch (error) {
        // Emit node failed event
        const nodeFailEvent: ExecutionEvent = {
          type: ExecutionEventType.NODE_FAILED,
          executionId: state.runId,
          workflowId: workflow.id,
          nodeId,
          timestamp: Date.now(),
          data: { error: error instanceof Error ? error.message : String(error) }
        };
        await this.operationalExecutor.transition(state, nodeFailEvent);

        if (options.stopOnFailure) {
          break;
        }
      }
    }

    // Emit execution completed event
    const endTime = Date.now();
    const completionEvent: ExecutionEvent = {
      type: ExecutionEventType.EXECUTION_COMPLETED,
      executionId: state.runId,
      workflowId: workflow.id,
      timestamp: endTime,
      data: { status: 'completed' }
    };
    await this.operationalExecutor.transition(state, completionEvent);

    // Build final result
    return {
      executionId: state.runId,
      workflowId: workflow.id,
      status: ExecutionStatus.COMPLETED,
      startTime,
      endTime,
      duration: endTime - startTime,
      results: {}, // Would need to collect from operational state
      executionOrder: Array.from(state.readySet), // Simplified
      metrics: {
        startTime,
        endTime,
        duration: endTime - startTime,
        nodeCount: workflow.nodes.length,
        completedNodes: state.inFlightTasks.size, // Simplified
        failedNodes: 0,
        skippedNodes: 0,
        retryCount: 0
      }
    };
  }

  /**
   * Get resource requirements for a node (simplified)
   */
  private getNodeRequirements(node: any): any {
    // Simplified - in real implementation, this would analyze node capabilities
    return {
      browserContexts: node.type === 'dom_action' ? 1 : 0,
      memory: 50, // MB
      capabilities: []
    };
  }

  /**
   * Simulate node execution (placeholder for actual node execution logic)
   */
  private async simulateNodeExecution(
    workflow: Workflow,
    state: OperationalState,
    nodeId: string,
    node: any
  ): Promise<void> {
    // Simulate some execution time
    await new Promise(resolve => setTimeout(resolve, 100));

    // Emit step events
    const stepStartEvent: ExecutionEvent = {
      type: ExecutionEventType.STEP_STARTED,
      executionId: state.runId,
      workflowId: workflow.id,
      nodeId,
      stepId: 'main',
      timestamp: Date.now(),
      data: { step: 'main' }
    };
    await this.operationalExecutor.transition(state, stepStartEvent);

    // Simulate step logging
    const stepLogEvent: ExecutionEvent = {
      type: ExecutionEventType.STEP_LOG,
      executionId: state.runId,
      workflowId: workflow.id,
      nodeId,
      stepId: 'main',
      timestamp: Date.now(),
      data: { message: `Executing ${node.type} node` }
    };
    await this.operationalExecutor.transition(state, stepLogEvent);

    // Simulate step success
    const stepSuccessEvent: ExecutionEvent = {
      type: ExecutionEventType.STEP_SUCCEEDED,
      executionId: state.runId,
      workflowId: workflow.id,
      nodeId,
      stepId: 'main',
      timestamp: Date.now(),
      data: { result: 'success' }
    };
    await this.operationalExecutor.transition(state, stepSuccessEvent);
  }

  /**
   * Resume a paused or failed workflow execution
   */
  async resumeWorkflow(
    executionId: string,
    additionalInputs: Record<string, any> = {}
  ): Promise<WorkflowExecutionResult> {
    // Check if execution exists and can be resumed
    const existingResult = this.activeExecutions.get(executionId);
    if (!existingResult) {
      throw new ExecutionError(`Execution ${executionId} not found`, executionId);
    }

    if (existingResult.status === ExecutionStatus.COMPLETED) {
      return existingResult;
    }

    if (existingResult.status !== ExecutionStatus.PAUSED && existingResult.status !== ExecutionStatus.FAILED) {
      throw new ExecutionError(`Execution ${executionId} cannot be resumed (status: ${existingResult.status})`, executionId);
    }

    // Resume logic would depend on checkpoint data
    // For now, throw not implemented
    throw new ExecutionError('Resume functionality not yet implemented', executionId);
  }

  /**
   * Cancel a running workflow execution
   */
  async cancelWorkflow(executionId: string): Promise<void> {
    const progress = this.executionProgress.get(executionId);
    if (!progress || progress.status !== ExecutionStatus.RUNNING) {
      throw new ExecutionError(`Execution ${executionId} is not running`, executionId);
    }

    // Update status to cancelled
    this.updateProgress(executionId, {
      ...progress,
      status: ExecutionStatus.CANCELLED
    });

    this.emitEvent({
      type: 'workflowCancelled',
      executionId,
      workflowId: '', // Would need to track workflow ID
      timestamp: Date.now(),
      data: { reason: 'User requested cancellation' }
    });
  }

  /**
   * Pause a running workflow execution
   */
  async pauseWorkflow(executionId: string): Promise<void> {
    const progress = this.executionProgress.get(executionId);
    if (!progress || progress.status !== ExecutionStatus.RUNNING) {
      throw new ExecutionError(`Execution ${executionId} is not running`, executionId);
    }

    // Update status to paused
    this.updateProgress(executionId, {
      ...progress,
      status: ExecutionStatus.PAUSED
    });

    this.emitEvent({
      type: 'workflowPaused',
      executionId,
      workflowId: '', // Would need to track workflow ID
      timestamp: Date.now(),
      data: { reason: 'User requested pause' }
    });
  }

  /**
   * Get execution progress
   */
  getExecutionProgress(executionId: string): ExecutionProgress | null {
    return this.executionProgress.get(executionId) || null;
  }

  /**
   * Get execution result
   */
  getExecutionResult(executionId: string): WorkflowExecutionResult | null {
    return this.activeExecutions.get(executionId) || null;
  }

  /**
   * List all active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Validate workflow before execution
   */
  validateWorkflow(workflow: Workflow): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!workflow.id) {
      errors.push('Workflow must have an ID');
    }

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
    const validNodeIds = new Set(workflow.nodes.map(n => n.id));
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
   * Get execution statistics
   */
  getExecutionStats(): {
    totalExecutions: number;
    activeExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  } {
    const allExecutions = Array.from(this.activeExecutions.values());
    const completedExecutions = allExecutions.filter(e => e.status === ExecutionStatus.COMPLETED);
    const failedExecutions = allExecutions.filter(e => e.status === ExecutionStatus.FAILED);
    const activeExecutions = allExecutions.filter(e =>
      e.status === ExecutionStatus.RUNNING || e.status === ExecutionStatus.PENDING
    );

    const totalTime = completedExecutions.reduce((sum, e) => sum + e.duration, 0);
    const averageExecutionTime = completedExecutions.length > 0 ? totalTime / completedExecutions.length : 0;

    return {
      totalExecutions: allExecutions.length,
      activeExecutions: activeExecutions.length,
      completedExecutions: completedExecutions.length,
      failedExecutions: failedExecutions.length,
      averageExecutionTime
    };
  }

  /**
   * Clean up completed executions older than specified time
   */
  cleanupExecutions(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - olderThanMs;
    let cleanedCount = 0;

    for (const [executionId, result] of this.activeExecutions) {
      if (result.endTime && result.endTime < cutoffTime) {
        this.activeExecutions.delete(executionId);
        this.executionProgress.delete(executionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Update execution progress
   */
  private updateProgress(executionId: string, progress: ExecutionProgress): void {
    this.executionProgress.set(executionId, progress);
    this.emitEvent({
      type: 'progressUpdate',
      executionId,
      workflowId: '', // Would need to track workflow ID
      timestamp: Date.now(),
      data: progress
    });
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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