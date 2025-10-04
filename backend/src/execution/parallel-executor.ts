import {
  ParallelExecutor as IParallelExecutor,
  ExtendedExecutionContext,
  FanOutConfig,
  FanInConfig,
  WorkflowPattern,
  ParallelismMode,
  QuorumType,
  ParallelTask,
  PatternInstance
} from '../types/execution.js';
import { EventEmitter } from 'events';

/**
 * Parallel Executor implementing fan-out/fan-in patterns for advanced workflow parallelism
 */
export class ParallelExecutor implements IParallelExecutor {
  private eventEmitter: EventEmitter;
  private activeTasks: Map<string, ParallelTask> = new Map();
  private patternInstances: Map<string, PatternInstance> = new Map();

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Execute fan-out pattern: split input into multiple parallel branches
   */
  async executeFanOut(
    nodeId: string,
    inputs: any[],
    config: FanOutConfig,
    context: ExtendedExecutionContext
  ): Promise<any[]> {
    const taskId = `fanout_${nodeId}_${Date.now()}`;
    const startTime = Date.now();

    // Create parallel task
    const task: ParallelTask = {
      taskId,
      parentNodeId: nodeId,
      subTasks: [],
      mode: ParallelismMode.FAN_OUT,
      config,
      status: 'running',
      results: [],
      startTime
    };

    this.activeTasks.set(taskId, task);

    try {
      // Apply backpressure if enabled
      if (config.backpressure?.enabled) {
        const currentLoad = this.getCurrentLoad();
        if (currentLoad >= config.backpressure.maxQueueSize) {
          switch (config.backpressure.dropPolicy) {
            case 'drop_oldest':
              await this.dropOldestTask();
              break;
            case 'drop_newest':
              throw new Error('Backpressure: queue full, dropping new task');
            case 'reject':
              throw new Error('Backpressure: queue full, rejecting task');
          }
        }
      }

      // Split inputs into batches if batching is enabled
      const batches = config.batchSize
        ? this.chunkArray(inputs, config.batchSize)
        : inputs.map(item => [item]);

      // Execute batches in parallel with concurrency control
      const semaphore = new Semaphore(config.maxConcurrency);
      const promises = batches.map(async (batch, index) => {
        const release = await semaphore.acquire();
        try {
          const subTaskId = `${taskId}_batch_${index}`;
          task.subTasks.push(subTaskId);

          // Process batch (this would typically delegate to individual node executors)
          const result = await this.processBatch(batch, context);
          return result;
        } finally {
          release();
        }
      });

      const results = await Promise.all(promises);

      // Flatten results if needed
      const flattenedResults = results.flat();

      task.results = flattenedResults;
      task.status = 'completed';
      task.endTime = Date.now();

      this.emitEvent('fanOutCompleted', {
        taskId,
        nodeId,
        results: flattenedResults,
        batchCount: batches.length,
        duration: task.endTime - startTime
      });

      return flattenedResults;

    } catch (error) {
      task.status = 'failed';
      task.endTime = Date.now();

      this.emitEvent('fanOutFailed', {
        taskId,
        nodeId,
        error: error instanceof Error ? error.message : String(error),
        duration: task.endTime - startTime
      });

      throw error;
    }
  }

  /**
   * Execute fan-in pattern: merge multiple inputs with configurable quorum
   */
  async executeFanIn(
    nodeId: string,
    inputs: any[],
    config: FanInConfig,
    context: ExtendedExecutionContext
  ): Promise<any> {
    const taskId = `fanin_${nodeId}_${Date.now()}`;
    const startTime = Date.now();

    // Create parallel task
    const task: ParallelTask = {
      taskId,
      parentNodeId: nodeId,
      subTasks: [],
      mode: ParallelismMode.FAN_IN,
      config,
      status: 'running',
      results: [],
      startTime
    };

    this.activeTasks.set(taskId, task);

    try {
      // Wait for quorum based on configuration
      const quorumResult = await this.waitForQuorum(inputs, config.quorum);

      if (!quorumResult.satisfied) {
        throw new Error(`Quorum not satisfied: ${quorumResult.reason}`);
      }

      // Apply aggregation strategy
      const aggregatedResult = await this.aggregateResults(
        quorumResult.availableInputs,
        config.aggregation || { strategy: 'concat' }
      );

      // Apply ordering if specified
      const orderedResult = config.ordering?.preserve
        ? this.applyOrdering(aggregatedResult, config.ordering)
        : aggregatedResult;

      task.results = [orderedResult];
      task.status = 'completed';
      task.endTime = Date.now();

      this.emitEvent('fanInCompleted', {
        taskId,
        nodeId,
        result: orderedResult,
        inputCount: inputs.length,
        quorumSatisfied: quorumResult.availableInputs.length,
        duration: task.endTime - startTime
      });

      return orderedResult;

    } catch (error) {
      task.status = 'failed';
      task.endTime = Date.now();

      this.emitEvent('fanInFailed', {
        taskId,
        nodeId,
        error: error instanceof Error ? error.message : String(error),
        duration: task.endTime - startTime
      });

      throw error;
    }
  }

  /**
   * Execute a workflow pattern as a reusable component
   */
  async executePattern(
    pattern: WorkflowPattern,
    inputs: Record<string, any>,
    context: ExtendedExecutionContext
  ): Promise<Record<string, any>> {
    const instanceId = `pattern_${pattern.id}_${Date.now()}`;
    const startTime = Date.now();

    // Create pattern instance
    const instance: PatternInstance = {
      instanceId,
      patternId: pattern.id,
      executionId: context.executionId,
      inputs,
      status: 'running',
      startTime
    };

    this.patternInstances.set(instanceId, instance);

    try {
      // Validate inputs against pattern signature
      this.validatePatternInputs(pattern, inputs);

      // Create sub-execution context for the pattern
      const patternContext: ExtendedExecutionContext = {
        ...context,
        executionId: instanceId, // Use instance ID as execution ID for the pattern
        nodeId: pattern.id,
        nodeInputs: inputs
      };

      // Execute pattern nodes in topological order
      const results = await this.executePatternNodes(pattern, patternContext);

      // Map outputs according to pattern output ports
      const outputs = this.mapPatternOutputs(pattern, results);

      instance.outputs = outputs;
      instance.status = 'completed';
      instance.endTime = Date.now();

      this.emitEvent('patternCompleted', {
        instanceId,
        patternId: pattern.id,
        inputs,
        outputs,
        nodeCount: pattern.nodes.length,
        duration: instance.endTime - startTime
      });

      return outputs;

    } catch (error) {
      instance.status = 'failed';
      instance.endTime = Date.now();

      this.emitEvent('patternFailed', {
        instanceId,
        patternId: pattern.id,
        error: error instanceof Error ? error.message : String(error),
        duration: instance.endTime - startTime
      });

      throw error;
    }
  }

  /**
   * Process a batch of inputs (placeholder for actual node execution)
   */
  private async processBatch(batch: any[], context: ExtendedExecutionContext): Promise<any[]> {
    // This would typically delegate to the appropriate node executor
    // For now, return the batch as-is
    return batch;
  }

  /**
   * Wait for quorum to be satisfied
   */
  private async waitForQuorum(inputs: any[], quorum: { type: QuorumType; threshold?: number; total?: number; timeout?: number }): Promise<{
    satisfied: boolean;
    availableInputs: any[];
    reason?: string;
  }> {
    const timeout = quorum.timeout || 30000; // Default 30s timeout
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const availableInputs = inputs.filter(input => input !== undefined && input !== null);

      switch (quorum.type) {
        case QuorumType.ALL:
          if (availableInputs.length === inputs.length) {
            return { satisfied: true, availableInputs };
          }
          break;

        case QuorumType.FIRST:
          if (availableInputs.length > 0) {
            return { satisfied: true, availableInputs: [availableInputs[0]] };
          }
          break;

        case QuorumType.MAJORITY:
          const majorityThreshold = Math.ceil(inputs.length / 2);
          if (availableInputs.length >= majorityThreshold) {
            return { satisfied: true, availableInputs };
          }
          break;

        case QuorumType.N_OF_M:
          const required = quorum.threshold || 1;
          const total = quorum.total || inputs.length;
          if (availableInputs.length >= required) {
            return { satisfied: true, availableInputs };
          }
          break;
      }

      // Wait a bit before checking again
      await this.delay(100);
    }

    return {
      satisfied: false,
      availableInputs: inputs.filter(input => input !== undefined && input !== null),
      reason: `Timeout waiting for quorum: ${quorum.type}`
    };
  }

  /**
   * Aggregate results based on strategy
   */
  private async aggregateResults(
    inputs: any[],
    aggregation: { strategy: string; customFunction?: string }
  ): Promise<any> {
    switch (aggregation.strategy) {
      case 'concat':
        return inputs.flat();

      case 'merge':
        return Object.assign({}, ...inputs);

      case 'reduce':
        return inputs.reduce((acc, curr) => {
          if (typeof acc === 'number' && typeof curr === 'number') {
            return acc + curr;
          }
          return acc;
        });

      case 'rank':
        return inputs.sort((a, b) => {
          // Simple ranking by some score field
          const scoreA = a.score || a.confidence || 0;
          const scoreB = b.score || b.confidence || 0;
          return scoreB - scoreA;
        });

      default:
        // Custom function would be evaluated here
        if (aggregation.customFunction) {
          // Evaluate custom aggregation function (simplified)
          return inputs;
        }
        return inputs;
    }
  }

  /**
   * Apply ordering to results
   */
  private applyOrdering(
    results: any,
    ordering: { preserve: boolean; key?: string; direction: 'asc' | 'desc' }
  ): any {
    if (!ordering.key || !Array.isArray(results)) {
      return results;
    }

    return results.sort((a, b) => {
      const aVal = a[ordering.key!];
      const bVal = b[ordering.key!];

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return ordering.direction === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Validate pattern inputs against signature
   */
  private validatePatternInputs(pattern: WorkflowPattern, inputs: Record<string, any>): void {
    for (const port of pattern.inputPorts) {
      if (port.required && !(port.id in inputs)) {
        throw new Error(`Required input port '${port.id}' not provided for pattern '${pattern.id}'`);
      }
    }
  }

  /**
   * Execute pattern nodes in topological order
   */
  private async executePatternNodes(
    pattern: WorkflowPattern,
    context: ExtendedExecutionContext
  ): Promise<Record<string, any>> {
    // Simplified topological execution
    // In a real implementation, this would use the DAG executor
    const results: Record<string, any> = {};

    for (const node of pattern.nodes) {
      // Execute each node (simplified)
      const nodeInputs = this.prepareNodeInputs(node, pattern.edges, results, context);
      // This would call the appropriate executor
      results[node.id] = { /* simulated result */ };
    }

    return results;
  }

  /**
   * Prepare inputs for a pattern node
   */
  private prepareNodeInputs(
    node: any,
    edges: any[],
    results: Record<string, any>,
    context: ExtendedExecutionContext
  ): Record<string, any> {
    const inputs: Record<string, any> = {};

    // Find incoming edges
    const incomingEdges = edges.filter(edge => edge.to === node.id);

    for (const edge of incomingEdges) {
      const sourceResult = results[edge.from];
      if (sourceResult) {
        inputs[edge.target_port || edge.from] = sourceResult;
      }
    }

    return inputs;
  }

  /**
   * Map pattern outputs according to output ports
   */
  private mapPatternOutputs(pattern: WorkflowPattern, results: Record<string, any>): Record<string, any> {
    const outputs: Record<string, any> = {};

    for (const port of pattern.outputPorts) {
      // Find the node that produces this output
      const outputNode = pattern.nodes.find(node =>
        (node as any).output_ports?.some((p: any) => p.id === port.id)
      );

      if (outputNode && results[outputNode.id]) {
        outputs[port.id] = results[outputNode.id];
      }
    }

    return outputs;
  }

  /**
   * Get current system load for backpressure
   */
  private getCurrentLoad(): number {
    return this.activeTasks.size;
  }

  /**
   * Drop the oldest task for backpressure
   */
  private async dropOldestTask(): Promise<void> {
    let oldestTask: ParallelTask | null = null;
    let oldestTime = Date.now();

    for (const task of this.activeTasks.values()) {
      if (task.startTime < oldestTime) {
        oldestTime = task.startTime;
        oldestTask = task;
      }
    }

    if (oldestTask) {
      this.activeTasks.delete(oldestTask.taskId);
      this.emitEvent('taskDropped', {
        taskId: oldestTask.taskId,
        reason: 'backpressure'
      });
    }
  }

  /**
   * Utility to chunk arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Emit events
   */
  private emitEvent(type: string, data: any): void {
    this.eventEmitter.emit(type, { type, data, timestamp: Date.now() });
  }

  /**
   * Event listener methods
   */
  on(event: string, handler: (event: any) => void): void {
    this.eventEmitter.on(event, handler);
  }

  off(event: string, handler: (event: any) => void): void {
    this.eventEmitter.off(event, handler);
  }
}

/**
 * Semaphore for concurrency control
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