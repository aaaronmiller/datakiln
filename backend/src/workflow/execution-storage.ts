import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  WorkflowExecution,
  WorkflowExecutionStorage,
  WorkflowExecutionListResponse,
  WorkflowExecutionSummary,
  WorkflowExecutionStatus
} from '../types/workflow.js';

export class FileWorkflowExecutionStorage implements WorkflowExecutionStorage {
  private readonly executionsDir: string;

  constructor(dataDir: string = './data') {
    this.executionsDir = path.join(dataDir, 'executions');
  }

  async create(executionData: Omit<WorkflowExecution, 'id'>): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      ...executionData,
      id: randomUUID()
    };

    await this.ensureDirectoryExists();
    await this.atomicWrite(execution.id, execution);

    return execution;
  }

  async get(id: string): Promise<WorkflowExecution | null> {
    try {
      const filePath = path.join(this.executionsDir, `${id}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async update(id: string, updates: Partial<WorkflowExecution>): Promise<WorkflowExecution | null> {
    const existing = await this.get(id);
    if (!existing) {
      return null;
    }

    const updated: WorkflowExecution = {
      ...existing,
      ...updates
    };

    await this.atomicWrite(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.executionsDir, `${id}.json`);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async list(workflowId?: string, options: { page?: number; limit?: number; status?: WorkflowExecutionStatus } = {}): Promise<WorkflowExecutionListResponse> {
    const { page = 1, limit = 20, status } = options;

    await this.ensureDirectoryExists();

    try {
      const files = await fs.readdir(this.executionsDir);
      const executionFiles = files.filter(f => f.endsWith('.json'));

      let executions: WorkflowExecution[] = [];
      for (const file of executionFiles) {
        try {
          const filePath = path.join(this.executionsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const execution: WorkflowExecution = JSON.parse(data);
          executions.push(execution);
        } catch (error) {
          // Skip corrupted files
          console.warn(`Skipping corrupted execution file: ${file}`, error);
        }
      }

      // Apply filters
      if (workflowId) {
        executions = executions.filter(e => e.workflow_id === workflowId);
      }

      if (status) {
        executions = executions.filter(e => e.status === status);
      }

      // Sort by start_time desc
      executions.sort((a, b) => b.start_time - a.start_time);

      const total = executions.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedExecutions = executions.slice(startIndex, endIndex);

      const summaries: WorkflowExecutionSummary[] = paginatedExecutions.map(e => ({
        id: e.id,
        workflow_id: e.workflow_id,
        workflow_name: '', // Would need to join with workflow data
        status: e.status,
        progress: e.progress,
        start_time: e.start_time,
        end_time: e.end_time,
        duration: e.duration,
        error: e.error
      }));

      return {
        executions: summaries,
        total,
        page,
        limit
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { executions: [], total: 0, page, limit };
      }
      throw error;
    }
  }

  async getByWorkflow(workflowId: string): Promise<WorkflowExecution[]> {
    const allExecutions = await this.list(workflowId, { limit: 1000 });
    const executions: WorkflowExecution[] = [];

    for (const summary of allExecutions.executions) {
      const execution = await this.get(summary.id);
      if (execution) {
        executions.push(execution);
      }
    }

    return executions;
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.executionsDir);
    } catch {
      await fs.mkdir(this.executionsDir, { recursive: true });
    }
  }

  private async atomicWrite(id: string, data: WorkflowExecution): Promise<void> {
    const filePath = path.join(this.executionsDir, `${id}.json`);
    const tempPath = `${filePath}.tmp`;

    try {
      // Write to temporary file first
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');

      // Atomic move
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
}</content>
</edit_file>