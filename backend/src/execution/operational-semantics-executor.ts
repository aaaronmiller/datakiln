import { EventEmitter } from 'events';
import {
  Workflow,
  WorkflowNode as Node,
  WorkflowEdge as Edge,
  ExecutionStatus,
  NodeExecutionStatus,
  ExecutionMetrics,
  ExecutionEvent,
  ExecutionEventType,
  WorkflowExecutionResult,
  NodeExecutionResult,
  ExecutionContext,
  WorkflowExecutionOptions,
  ValidationResult,
  ExecutionEventEmitter,
  ExecutionError,
  ValidationError,
  OperationalState,
  InFlightTask,
  ArtifactStore,
  Artifact,
  ResourceAllocations,
  ResourceAllocation,
  ResourceRequirements,
  OperationalSemanticsExecutor as IOperationalSemanticsExecutor,
  CapabilityBudget
} from '../types/execution.js';

export class OperationalSemanticsExecutor implements IOperationalSemanticsExecutor {
  private eventEmitter: EventEmitter;
  private artifactStore: ArtifactStore;
  private capabilityBudget: CapabilityBudget;
  private activeStates: Map<string, OperationalState>;

  constructor(
    artifactStore: ArtifactStore,
    capabilityBudget: CapabilityBudget = {
      browserContexts: 3,
      concurrentNodes: 5,
      memoryLimit: 1024, // MB
      timeoutLimit: 3600000 // 1 hour
    }
  ) {
    this.eventEmitter = new EventEmitter();
    this.artifactStore = artifactStore;
    this.capabilityBudget = capabilityBudget;
    this.activeStates = new Map();
  }

  /**
   * Initialize operational state for a workflow execution
   */
  async initializeState(
    workflow: Workflow,
    executionId: string,
    globalInputs: Record<string, any>
  ): Promise<OperationalState> {
    // Build dependency graph
    const { dependencyGraph, nodeMap } = this.buildDependencyGraph(workflow);

    // Initialize ready set (nodes with no dependencies)
    const readySet = new Set<string>();
    for (const nodeId of workflow.nodes.map(n => n.id)) {
      if (this.getDependencies(nodeId, dependencyGraph).length === 0) {
        readySet.add(nodeId);
      }
    }

    // Initialize artifact store with global inputs
    for (const [key, value] of Object.entries(globalInputs)) {
      await this.artifactStore.store({
        id: `global_${key}`,
        data: value,
        metadata: {
          contentType: typeof value === 'string' ? 'text/plain' : 'application/json',
          size: JSON.stringify(value).length,
          createdAt: Date.now(),
          provenance: {
            nodeId: 'global',
            executionId,
            inputs: []
          }
        }
      });
    }

    const state: OperationalState = {
      runId: executionId,
      readySet,
      inFlightTasks: new Map(),
      artifactStore: this.artifactStore,
      resourceAllocations: {
        allocations: new Map(),
        resourceTypes: new Map([
          ['browserContexts', { name: 'browserContexts', capacity: this.capabilityBudget.browserContexts, currentUsage: 0 }],
          ['concurrentNodes', { name: 'concurrentNodes', capacity: this.capabilityBudget.concurrentNodes, currentUsage: 0 }],
          ['memory', { name: 'memory', capacity: this.capabilityBudget.memoryLimit, currentUsage: 0 }]
        ])
      },
      eventHistory: []
    };

    this.activeStates.set(executionId, state);
    return state;
  }

  /**
   * Transition the operational state based on an event
   */
  async transition(state: OperationalState, event: ExecutionEvent): Promise<OperationalState> {
    const newState = { ...state };

    // Record event in history
    newState.eventHistory = [...newState.eventHistory, event];

    switch (event.type) {
      case ExecutionEventType.WORKFLOW_STARTED:
        // Emit initial ready nodes
        await this.emitReadyNodes(newState);
        break;

      case ExecutionEventType.NODE_STARTED:
        await this.handleNodeStarted(newState, event);
        break;

      case ExecutionEventType.STEP_STARTED:
        await this.handleStepStarted(newState, event);
        break;

      case ExecutionEventType.STEP_LOG:
        await this.handleStepLog(newState, event);
        break;

      case ExecutionEventType.STEP_SUCCEEDED:
        await this.handleStepSucceeded(newState, event);
        break;

      case ExecutionEventType.NODE_SUCCEEDED:
        await this.handleNodeSucceeded(newState, event);
        break;

      case ExecutionEventType.NODE_FAILED:
        await this.handleNodeFailed(newState, event);
        break;

      case ExecutionEventType.EXECUTION_COMPLETED:
        await this.handleExecutionCompleted(newState, event);
        break;
    }

    // Update active state
    this.activeStates.set(state.runId, newState);
    return newState;
  }

  /**
   * Check if a node can be executed
   */
  canExecuteNode(state: OperationalState, nodeId: string): boolean {
    return state.readySet.has(nodeId) &&
           this.hasAvailableResources(state, nodeId) &&
           !state.inFlightTasks.has(nodeId);
  }

  /**
   * Allocate resources for a node
   */
  async allocateResources(
    state: OperationalState,
    nodeId: string,
    requirements: ResourceRequirements
  ): Promise<boolean> {
    // Check if resources are available
    if (!this.hasAvailableResources(state, nodeId, requirements)) {
      return false;
    }

    const allocations: ResourceAllocation[] = [];

    // Allocate browser contexts
    if (requirements.browserContexts) {
      const resourceType = state.resourceAllocations.resourceTypes.get('browserContexts')!;
      resourceType.currentUsage += requirements.browserContexts;
      allocations.push({
        resourceType: 'browserContexts',
        amount: requirements.browserContexts,
        nodeId,
        allocatedAt: Date.now()
      });
    }

    // Allocate concurrent nodes slot
    const concurrentResource = state.resourceAllocations.resourceTypes.get('concurrentNodes')!;
    concurrentResource.currentUsage += 1;
    allocations.push({
      resourceType: 'concurrentNodes',
      amount: 1,
      nodeId,
      allocatedAt: Date.now()
    });

    // Allocate memory
    if (requirements.memory) {
      const memoryResource = state.resourceAllocations.resourceTypes.get('memory')!;
      memoryResource.currentUsage += requirements.memory;
      allocations.push({
        resourceType: 'memory',
        amount: requirements.memory,
        nodeId,
        allocatedAt: Date.now()
      });
    }

    state.resourceAllocations.allocations.set(nodeId, allocations);

    // Move to in-flight
    const task: InFlightTask = {
      nodeId,
      startTime: Date.now(),
      allocatedResources: allocations,
      retryCount: 0,
      dependencies: [] // Will be set when node starts
    };

    state.inFlightTasks.set(nodeId, task);
    state.readySet.delete(nodeId);

    return true;
  }

  /**
   * Deallocate resources for a node
   */
  async deallocateResources(state: OperationalState, nodeId: string): Promise<void> {
    const allocations = state.resourceAllocations.allocations.get(nodeId);
    if (!allocations) return;

    // Release resources
    for (const allocation of allocations) {
      const resourceType = state.resourceAllocations.resourceTypes.get(allocation.resourceType);
      if (resourceType) {
        resourceType.currentUsage = Math.max(0, resourceType.currentUsage - allocation.amount);
      }
    }

    state.resourceAllocations.allocations.delete(nodeId);
    state.inFlightTasks.delete(nodeId);
  }

  /**
   * Get nodes that are ready for execution
   */
  getReadyNodes(state: OperationalState): string[] {
    return Array.from(state.readySet).filter(nodeId => this.canExecuteNode(state, nodeId));
  }

  /**
   * Check if execution is complete
   */
  isExecutionComplete(state: OperationalState): boolean {
    return state.readySet.size === 0 && state.inFlightTasks.size === 0;
  }

  // Event emitter interface
  emit(event: ExecutionEvent): void {
    this.eventEmitter.emit(event.type, event);
  }

  on(eventType: string, handler: (event: ExecutionEvent) => void): void {
    this.eventEmitter.on(eventType, handler);
  }

  off(eventType: string, handler: (event: ExecutionEvent) => void): void {
    this.eventEmitter.off(eventType, handler);
  }

  getEventHistory(executionId: string): ExecutionEvent[] {
    const state = this.activeStates.get(executionId);
    return state ? state.eventHistory : [];
  }

  // Private helper methods

  private buildDependencyGraph(workflow: Workflow): {
    dependencyGraph: Map<string, string[]>;
    nodeMap: Map<string, Node>;
  } {
    const dependencyGraph = new Map<string, string[]>();
    const nodeMap = new Map<string, Node>();

    // Initialize graph
    for (const node of workflow.nodes) {
      dependencyGraph.set(node.id, []);
      nodeMap.set(node.id, node);
    }

    // Build dependencies from edges
    for (const edge of workflow.edges) {
      const deps = dependencyGraph.get(edge.to) || [];
      deps.push(edge.from);
      dependencyGraph.set(edge.to, deps);
    }

    return { dependencyGraph, nodeMap };
  }

  private getDependencies(nodeId: string, dependencyGraph: Map<string, string[]>): string[] {
    return dependencyGraph.get(nodeId) || [];
  }

  private hasAvailableResources(
    state: OperationalState,
    nodeId: string,
    requirements: ResourceRequirements = {}
  ): boolean {
    const browserContexts = state.resourceAllocations.resourceTypes.get('browserContexts')!;
    const concurrentNodes = state.resourceAllocations.resourceTypes.get('concurrentNodes')!;
    const memory = state.resourceAllocations.resourceTypes.get('memory')!;

    return (
      browserContexts.currentUsage + (requirements.browserContexts || 0) <= browserContexts.capacity &&
      concurrentNodes.currentUsage + 1 <= concurrentNodes.capacity &&
      memory.currentUsage + (requirements.memory || 0) <= memory.capacity
    );
  }

  private async emitReadyNodes(state: OperationalState): Promise<void> {
    const readyNodes = this.getReadyNodes(state);
    for (const nodeId of readyNodes) {
      this.emit({
        type: ExecutionEventType.NODE_STARTED,
        executionId: state.runId,
        workflowId: '', // Will be set by caller
        nodeId,
        timestamp: Date.now(),
        data: { ready: true }
      });
    }
  }

  private async handleNodeStarted(state: OperationalState, event: ExecutionEvent): Promise<void> {
    const nodeId = event.nodeId!;
    const task = state.inFlightTasks.get(nodeId);
    if (!task) return;

    // Set dependencies for the task
    const { dependencyGraph } = this.buildDependencyGraph({} as Workflow); // Need to rebuild or cache
    task.dependencies = this.getDependencies(nodeId, dependencyGraph);

    // Emit step started event
    this.emit({
      type: ExecutionEventType.STEP_STARTED,
      executionId: state.runId,
      workflowId: event.workflowId,
      nodeId,
      stepId: 'main',
      timestamp: Date.now(),
      data: { step: 'main' }
    });
  }

  private async handleStepStarted(state: OperationalState, event: ExecutionEvent): Promise<void> {
    // Log step progress
    this.emit({
      type: ExecutionEventType.STEP_LOG,
      executionId: state.runId,
      workflowId: event.workflowId,
      nodeId: event.nodeId!,
      stepId: event.stepId!,
      timestamp: Date.now(),
      data: { message: `Step ${event.stepId} started` }
    });
  }

  private async handleStepLog(state: OperationalState, event: ExecutionEvent): Promise<void> {
    // Forward log events - could be used for monitoring
  }

  private async handleStepSucceeded(state: OperationalState, event: ExecutionEvent): Promise<void> {
    // Mark step as completed and check if node is done
    const nodeId = event.nodeId!;
    const task = state.inFlightTasks.get(nodeId);
    if (!task) return;

    // For simplicity, assume single-step nodes for now
    this.emit({
      type: ExecutionEventType.NODE_SUCCEEDED,
      executionId: state.runId,
      workflowId: event.workflowId,
      nodeId,
      timestamp: Date.now(),
      data: { outputs: event.data?.outputs || {} }
    });
  }

  private async handleNodeSucceeded(state: OperationalState, event: ExecutionEvent): Promise<void> {
    const nodeId = event.nodeId!;

    // Store outputs as artifacts
    if (event.data?.outputs) {
      for (const [key, value] of Object.entries(event.data.outputs)) {
        await state.artifactStore.store({
          id: `${nodeId}_${key}`,
          data: value,
          metadata: {
            contentType: typeof value === 'string' ? 'text/plain' : 'application/json',
            size: JSON.stringify(value).length,
            createdAt: Date.now(),
            provenance: {
              nodeId,
              executionId: state.runId,
              inputs: [] // Would need to track input artifacts
            }
          }
        });
      }
    }

    // Deallocate resources
    await this.deallocateResources(state, nodeId);

    // Update ready set with dependent nodes
    this.updateReadySet(state, nodeId);

    // Check if execution is complete
    if (this.isExecutionComplete(state)) {
      this.emit({
        type: ExecutionEventType.EXECUTION_COMPLETED,
        executionId: state.runId,
        workflowId: event.workflowId,
        timestamp: Date.now(),
        data: { status: 'completed' }
      });
    }
  }

  private async handleNodeFailed(state: OperationalState, event: ExecutionEvent): Promise<void> {
    const nodeId = event.nodeId!;

    // Deallocate resources
    await this.deallocateResources(state, nodeId);

    // For now, fail the entire execution on node failure
    this.emit({
      type: ExecutionEventType.EXECUTION_COMPLETED,
      executionId: state.runId,
      workflowId: event.workflowId,
      timestamp: Date.now(),
      data: { status: 'failed', error: event.data?.error }
    });
  }

  private async handleExecutionCompleted(state: OperationalState, event: ExecutionEvent): Promise<void> {
    // Clean up state
    this.activeStates.delete(state.runId);
  }

  private updateReadySet(state: OperationalState, completedNodeId: string): void {
    // This would need the full dependency graph to find nodes that now have all dependencies satisfied
    // For now, this is a simplified implementation
    // In a full implementation, we'd track reverse dependencies
  }
}