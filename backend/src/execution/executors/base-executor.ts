import {
  ExecutionContext,
  NodeExecutionResult,
  NodeExecutionStatus,
  ExecutionError
} from '../../types/execution.js';

export interface NodeExecutor {
  readonly type: string;
  execute(context: ExecutionContext): Promise<Record<string, any>>;
}

export abstract class BaseNodeExecutor implements NodeExecutor {
  abstract readonly type: string;

  async execute(context: ExecutionContext): Promise<Record<string, any>> {
    const startTime = Date.now();

    try {
      // Validate context
      this.validateContext(context);

      // Execute the node
      const outputs = await this.executeNode(context);

      // Validate outputs
      this.validateOutputs(outputs);

      return outputs;

    } catch (error) {
      const executionError = error instanceof ExecutionError ? error :
        new ExecutionError(
          `Node execution failed: ${error instanceof Error ? error.message : String(error)}`,
          context.executionId,
          context.nodeId,
          error instanceof Error ? error : undefined
        );

      throw executionError;
    }
  }

  protected abstract executeNode(context: ExecutionContext): Promise<Record<string, any>>;

  protected validateContext(context: ExecutionContext): void {
    if (!context.executionId) {
      throw new ExecutionError('Missing execution ID', context.executionId, context.nodeId);
    }

    if (!context.nodeId) {
      throw new ExecutionError('Missing node ID', context.executionId, context.nodeId);
    }

    if (!context.nodeInputs) {
      throw new ExecutionError('Missing node inputs', context.executionId, context.nodeId);
    }
  }

  protected validateOutputs(outputs: Record<string, any>): void {
    // Default validation - can be overridden by subclasses
    if (typeof outputs !== 'object' || outputs === null) {
      throw new ExecutionError('Node outputs must be an object');
    }
  }

  protected getInputValue<T>(
    context: ExecutionContext,
    key: string,
    defaultValue?: T
  ): T {
    const value = context.nodeInputs[key];
    if (value === undefined && defaultValue === undefined) {
      throw new ExecutionError(
        `Required input '${key}' is missing`,
        context.executionId,
        context.nodeId
      );
    }
    return value !== undefined ? value : defaultValue!;
  }

  protected getGlobalInput<T>(
    context: ExecutionContext,
    key: string,
    defaultValue?: T
  ): T {
    const value = context.globalInputs[key];
    if (value === undefined && defaultValue === undefined) {
      throw new ExecutionError(
        `Required global input '${key}' is missing`,
        context.executionId,
        context.nodeId
      );
    }
    return value !== undefined ? value : defaultValue!;
  }
}