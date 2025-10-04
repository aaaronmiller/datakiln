import {
  WorkflowExecution,
  WorkflowExecutionManager,
  WorkflowExecutionProgress,
  WorkflowExecutionResult,
  WorkflowExecutionStatus,
  WorkflowExecutionStorage
} from '../types/workflow.js';
import { WorkflowRunner } from '../execution/workflow-runner.js';
import { WorkflowStorage } from '../types/workflow.js';

export class WorkflowExecutionManagerService implements WorkflowExecutionManager {
  private activeExecutions: Map<string, { runner: WorkflowRunner; execution: WorkflowExecution }> = new Map();

  constructor(
    private executionStorage: WorkflowExecutionStorage,
    private workflowStorage: WorkflowStorage
  ) {}

  async start(executionId: string): Promise<void> {
    const execution = await this.executionStorage.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status === WorkflowExecutionStatus.RUNNING) {
      throw new Error(`Execution ${executionId} is already running`);
    }

    if (execution.status === WorkflowExecutionStatus.COMPLETED) {
      throw new Error(`Execution ${executionId} is already completed`);
    }

    if (execution.status === WorkflowExecutionStatus.FAILED) {
      throw new Error(`Execution ${executionId} has failed and cannot be restarted`);
    }

    // Get the workflow
    const workflow = await this.workflowStorage.get(execution.workflow_id);
    if (!workflow) {
      throw new Error(`Workflow ${execution.workflow_id} not found`);
    }

    // Create workflow runner
    const runner = new WorkflowRunner();

    // Store reference to active execution
    this.activeExecutions.set(executionId, { runner, execution });

    // Update execution status
    await this.executionStorage.update(executionId, {
      status: WorkflowExecutionStatus.RUNNING,
      start_time: Date.now()
    });

    try {
      // Start the execution asynchronously
      runner.executeWorkflow(workflow as any, execution.inputs || {}).then(async (result) => {
        // Update execution status on completion
        await this.executionStorage.update(executionId, {
          status: result.status === 'completed' ? WorkflowExecutionStatus.COMPLETED :
                 result.status === 'failed' ? WorkflowExecutionStatus.FAILED :
                 WorkflowExecutionStatus.CANCELLED,
          end_time: Date.now(),
          duration: result.duration,
          outputs: result.results,
          progress: 100
        });

        // Remove from active executions
        this.activeExecutions.delete(executionId);
      }).catch(async (error: any) => {
        console.error(`Execution ${executionId} failed:`, error);

        // Update execution status on failure
        await this.executionStorage.update(executionId, {
          status: WorkflowExecutionStatus.FAILED,
          end_time: Date.now(),
          error: error.message
        });

        // Remove from active executions
        this.activeExecutions.delete(executionId);
      });
    } catch (error: any) {
      // Clean up on immediate failure
      this.activeExecutions.delete(executionId);
      await this.executionStorage.update(executionId, {
        status: WorkflowExecutionStatus.FAILED,
        end_time: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async stop(executionId: string): Promise<void> {
    const activeExecution = this.activeExecutions.get(executionId);
    if (!activeExecution) {
      throw new Error(`Execution ${executionId} is not currently running`);
    }

    try {
      await activeExecution.runner.cancelWorkflow(executionId);

      // Update execution status
      await this.executionStorage.update(executionId, {
        status: WorkflowExecutionStatus.CANCELLED,
        end_time: Date.now()
      });

      // Remove from active executions
      this.activeExecutions.delete(executionId);
    } catch (error: any) {
      console.error(`Failed to stop execution ${executionId}:`, error);
      throw error;
    }
  }

  async pause(executionId: string): Promise<void> {
    const activeExecution = this.activeExecutions.get(executionId);
    if (!activeExecution) {
      throw new Error(`Execution ${executionId} is not currently running`);
    }

    try {
      await activeExecution.runner.pauseWorkflow(executionId);

      // Update execution status
      await this.executionStorage.update(executionId, {
        status: WorkflowExecutionStatus.PAUSED
      });
    } catch (error: any) {
      console.error(`Failed to pause execution ${executionId}:`, error);
      throw error;
    }
  }

  async resume(executionId: string): Promise<void> {
    const execution = await this.executionStorage.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== WorkflowExecutionStatus.PAUSED) {
      throw new Error(`Execution ${executionId} is not paused`);
    }

    const activeExecution = this.activeExecutions.get(executionId);
    if (!activeExecution) {
      throw new Error(`Execution ${executionId} runner not found`);
    }

    try {
      // Resume the execution
      const workflow = await this.workflowStorage.get(execution.workflow_id);
      if (!workflow) {
        throw new Error(`Workflow ${execution.workflow_id} not found`);
      }

      await activeExecution.runner.resumeWorkflow(executionId);

      // Update execution status
      await this.executionStorage.update(executionId, {
        status: WorkflowExecutionStatus.RUNNING
      });
    } catch (error: any) {
      console.error(`Failed to resume execution ${executionId}:`, error);
      throw error;
    }
  }

  async getProgress(executionId: string): Promise<WorkflowExecutionProgress> {
    const execution = await this.executionStorage.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const activeExecution = this.activeExecutions.get(executionId);
    let currentNodeName: string | undefined;

    if (activeExecution) {
      try {
        const progress = activeExecution.runner.getExecutionProgress(executionId);
        if (progress) {
          currentNodeName = progress.currentNodeId; // This might not be the name, but we can work with it
        }
      } catch (error: any) {
        console.warn(`Failed to get progress from runner for ${executionId}:`, error);
      }
    }

    return {
      execution_id: execution.id,
      status: execution.status,
      progress: execution.progress,
      current_node_id: execution.current_node_id,
      completed_nodes: execution.completed_nodes,
      pending_nodes: execution.pending_nodes,
      failed_nodes: execution.failed_nodes,
      estimated_time_remaining: this.calculateEstimatedTimeRemaining(execution),
      current_node_name: currentNodeName,
      last_updated: Date.now()
    };
  }

  async getResult(executionId: string): Promise<WorkflowExecutionResult> {
    const execution = await this.executionStorage.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== WorkflowExecutionStatus.COMPLETED) {
      throw new Error(`Execution ${executionId} is not completed yet`);
    }

    return {
      execution_id: execution.id,
      workflow_id: execution.workflow_id,
      status: execution.status,
      outputs: execution.outputs || {},
      start_time: execution.start_time,
      end_time: execution.end_time!,
      duration: execution.duration!,
      node_results: execution.node_results,
      error: execution.error,
      metadata: execution.metadata
    };
  }

  async listActive(): Promise<WorkflowExecution[]> {
    const activeExecutionIds = Array.from(this.activeExecutions.keys());
    const activeExecutions: WorkflowExecution[] = [];

    for (const executionId of activeExecutionIds) {
      try {
        const execution = await this.executionStorage.get(executionId);
        if (execution && execution.status === WorkflowExecutionStatus.RUNNING) {
          activeExecutions.push(execution);
        }
      } catch (error: any) {
        console.warn(`Failed to get active execution ${executionId}:`, error);
      }
    }

    return activeExecutions;
  }

  private calculateEstimatedTimeRemaining(execution: WorkflowExecution): number | undefined {
    if (!execution.start_time || execution.progress >= 100) {
      return undefined;
    }

    const elapsed = Date.now() - execution.start_time;
    const remainingProgress = 100 - execution.progress;

    if (execution.progress > 0) {
      const timePerPercent = elapsed / execution.progress;
      return timePerPercent * remainingProgress;
    }

    return undefined;
  }

  // Cleanup method for graceful shutdown
  async cleanup(): Promise<void> {
    const stopPromises = Array.from(this.activeExecutions.entries()).map(
      async ([executionId, { runner }]) => {
        try {
          await runner.cancelWorkflow(executionId);
          await this.executionStorage.update(executionId, {
            status: WorkflowExecutionStatus.CANCELLED,
            end_time: Date.now()
          });
        } catch (error: any) {
          console.error(`Failed to cleanup execution ${executionId}:`, error);
        }
      }
    );

    await Promise.all(stopPromises);
    this.activeExecutions.clear();
  }
}