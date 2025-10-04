import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  Workflow,
  WorkflowStorage,
  WorkflowListResponse,
  WorkflowSummary,
  CreateWorkflowRequest
} from '../types/workflow.js';

export class FileWorkflowStorage implements WorkflowStorage {
  private readonly workflowsDir: string;

  constructor(dataDir: string = './data') {
    this.workflowsDir = path.join(dataDir, 'workflows');
  }

  async create(workflowData: Omit<Workflow, 'id'>): Promise<Workflow> {
    const workflow: Workflow = {
      ...workflowData,
      id: randomUUID(),
      metadata: {
        ...workflowData.metadata,
        tags: workflowData.metadata?.tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: workflowData.metadata?.version || 1,
        is_public: workflowData.metadata?.is_public || false
      }
    };

    await this.ensureDirectoryExists();
    await this.atomicWrite(workflow.id, workflow);

    return workflow;
  }

  async get(id: string): Promise<Workflow | null> {
    try {
      const filePath = path.join(this.workflowsDir, `${id}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async update(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
    const existing = await this.get(id);
    if (!existing) {
      return null;
    }

    const updated: Workflow = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        tags: updates.metadata?.tags || existing.metadata?.tags || [],
        is_public: updates.metadata?.is_public ?? existing.metadata?.is_public ?? false,
        updated_at: new Date().toISOString(),
        version: (existing.metadata?.version || 1) + 1
      }
    };

    await this.atomicWrite(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.workflowsDir, `${id}.json`);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async list(options: { page?: number; limit?: number; author?: string; tags?: string[] } = {}): Promise<WorkflowListResponse> {
    const { page = 1, limit = 20, author, tags } = options;

    await this.ensureDirectoryExists();

    try {
      const files = await fs.readdir(this.workflowsDir);
      const workflowFiles = files.filter(f => f.endsWith('.json'));

      let workflows: Workflow[] = [];
      for (const file of workflowFiles) {
        try {
          const filePath = path.join(this.workflowsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const workflow: Workflow = JSON.parse(data);
          workflows.push(workflow);
        } catch (error) {
          // Skip corrupted files
          console.warn(`Skipping corrupted workflow file: ${file}`, error);
        }
      }

      // Apply filters
      if (author) {
        workflows = workflows.filter(w => w.metadata?.author === author);
      }

      if (tags && tags.length > 0) {
        workflows = workflows.filter(w =>
          tags.some(tag => w.metadata?.tags.includes(tag))
        );
      }

      // Sort by updated_at desc
      workflows.sort((a, b) =>
        new Date(b.metadata?.updated_at || 0).getTime() -
        new Date(a.metadata?.updated_at || 0).getTime()
      );

      const total = workflows.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedWorkflows = workflows.slice(startIndex, endIndex);

      const summaries: WorkflowSummary[] = paginatedWorkflows.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        version: w.metadata?.version || 1,
        author: w.metadata?.author,
        tags: w.metadata?.tags || [],
        created_at: w.metadata?.created_at || '',
        updated_at: w.metadata?.updated_at || '',
        is_public: w.metadata?.is_public || false,
        node_count: w.nodes.length,
        edge_count: w.edges.length
      }));

      return {
        workflows: summaries,
        total,
        page,
        limit
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { workflows: [], total: 0, page, limit };
      }
      throw error;
    }
  }

  async search(query: string): Promise<Workflow[]> {
    const allWorkflows = await this.list({ limit: 1000 });
    const lowerQuery = query.toLowerCase();

    const matchingSummaries = allWorkflows.workflows
      .filter(w =>
        w.name.toLowerCase().includes(lowerQuery) ||
        w.description?.toLowerCase().includes(lowerQuery) ||
        w.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );

    const results: Workflow[] = [];
    for (const summary of matchingSummaries) {
      const workflow = await this.get(summary.id);
      if (workflow) {
        results.push(workflow);
      }
    }

    return results;
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.workflowsDir);
    } catch {
      await fs.mkdir(this.workflowsDir, { recursive: true });
    }
  }

  private async atomicWrite(id: string, data: Workflow): Promise<void> {
    const filePath = path.join(this.workflowsDir, `${id}.json`);
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
}