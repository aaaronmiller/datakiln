import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  WorkflowStorage,
  WorkflowExecutionStorage,
  WorkflowValidator,
  WorkflowExecutionManager,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  StartWorkflowExecutionRequest,
  WorkflowExecutionResponse,
  WorkflowExecutionStatus
} from '../types/workflow.js';
import { ExecutionStatus } from '../types/execution.js';

interface WorkflowRoutesOptions {
  workflowStorage: WorkflowStorage;
  executionStorage: WorkflowExecutionStorage;
  validator: WorkflowValidator;
  executionManager: WorkflowExecutionManager;
}

export async function workflowRoutes(
  fastify: FastifyInstance,
  options: WorkflowRoutesOptions
) {
  const { workflowStorage, executionStorage, validator, executionManager } = options;

  // Workflow CRUD Operations

  // GET /api/v1/workflows - List workflows
  fastify.get('/workflows', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          author: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { page, limit, author, tags } = request.query as any;

    try {
      const result = await workflowStorage.list({
        page: page || 1,
        limit: limit || 20,
        author,
        tags
      });

      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/v1/workflows - Create workflow
  fastify.post('/workflows', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'nodes', 'edges'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          nodes: { type: 'array' },
          edges: { type: 'array' },
          metadata: { type: 'object' },
          input_schema: { type: 'object' },
          output_schema: { type: 'object' },
          variables: { type: 'object' },
          settings: { type: 'object' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const workflowData = request.body as CreateWorkflowRequest;

    try {
      const workflow = await workflowStorage.create(workflowData);
      return reply.code(201).send(workflow);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create workflow' });
    }
  });

  // GET /api/v1/workflows/:id - Get workflow by ID
  fastify.get('/workflows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const workflow = await workflowStorage.get(id);
      if (!workflow) {
        return reply.code(404).send({ error: 'Workflow not found' });
      }

      return reply.send(workflow);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /api/v1/workflows/:id - Update workflow
  fastify.put('/workflows/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          nodes: { type: 'array' },
          edges: { type: 'array' },
          metadata: { type: 'object' },
          input_schema: { type: 'object' },
          output_schema: { type: 'object' },
          variables: { type: 'object' },
          settings: { type: 'object' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as UpdateWorkflowRequest;

    try {
      const workflow = await workflowStorage.update(id, updates);
      if (!workflow) {
        return reply.code(404).send({ error: 'Workflow not found' });
      }

      return reply.send(workflow);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update workflow' });
    }
  });

  // DELETE /api/v1/workflows/:id - Delete workflow
  fastify.delete('/workflows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const deleted = await workflowStorage.delete(id);
      if (!deleted) {
        return reply.code(404).send({ error: 'Workflow not found' });
      }

      return reply.send({ message: 'Workflow deleted successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete workflow' });
    }
  });

  // GET /api/v1/workflows/search - Search workflows
  fastify.get('/workflows/search', {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { q } = request.query as { q: string };

    try {
      const workflows = await workflowStorage.search(q);
      return reply.send(workflows);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Search failed' });
    }
  });

  // Workflow Validation

  // POST /api/v1/workflows/:id/validate - Validate workflow
  fastify.post('/workflows/:id/validate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const workflow = await workflowStorage.get(id);
      if (!workflow) {
        return reply.code(404).send({ error: 'Workflow not found' });
      }

      const validationResult = await validator.validate(workflow);
      return reply.send(validationResult);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Validation failed' });
    }
  });

  // Workflow Execution Management

  // POST /api/v1/workflows/:id/executions - Start workflow execution
  fastify.post('/workflows/:id/executions', {
    schema: {
      body: {
        type: 'object',
        properties: {
          inputs: { type: 'object' },
          variables: { type: 'object' },
          options: { type: 'object' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { inputs, variables, options } = request.body as any;

    try {
      // Check if workflow exists
      const workflow = await workflowStorage.get(id);
      if (!workflow) {
        return reply.code(404).send({ error: 'Workflow not found' });
      }

      // Create execution record
      const execution = await executionStorage.create({
        workflow_id: id,
        status: 'pending',
        inputs: inputs || {},
        start_time: Date.now()
      });

      // Start execution asynchronously
      executionManager.start(execution.id).catch(error => {
        console.error(`Failed to start execution ${execution.id}:`, error);
      });

      const response: WorkflowExecutionResponse = {
        execution_id: execution.id,
        status: 'pending',
        message: 'Workflow execution started'
      };

      return reply.code(202).send(response);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to start workflow execution' });
    }
  });

  // GET /api/v1/executions - List executions
  fastify.get('/executions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          workflow_id: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'] }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { workflow_id, page, limit, status } = request.query as any;

    try {
      const result = await executionStorage.list(workflow_id, {
        page: page || 1,
        limit: limit || 20,
        status
      });

      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/v1/executions/:id - Get execution details
  fastify.get('/executions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const execution = await executionStorage.get(id);
      if (!execution) {
        return reply.code(404).send({ error: 'Execution not found' });
      }

      return reply.send(execution);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/v1/executions/:id/stop - Stop execution
  fastify.post('/executions/:id/stop', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      await executionManager.stop(id);
      return reply.send({ message: 'Execution stopped successfully' });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });

  // POST /api/v1/executions/:id/pause - Pause execution
  fastify.post('/executions/:id/pause', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      await executionManager.pause(id);
      return reply.send({ message: 'Execution paused successfully' });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });

  // POST /api/v1/executions/:id/resume - Resume execution
  fastify.post('/executions/:id/resume', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      await executionManager.resume(id);
      return reply.send({ message: 'Execution resumed successfully' });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });

  // GET /api/v1/executions/:id/progress - Get execution progress
  fastify.get('/executions/:id/progress', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const progress = await executionManager.getProgress(id);
      return reply.send(progress);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });

  // GET /api/v1/executions/:id/result - Get execution result
  fastify.get('/executions/:id/result', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await executionManager.getResult(id);
      return reply.send(result);
    } catch (error: any) {
      request.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });

  // GET /api/v1/executions/active - List active executions
  fastify.get('/executions/active', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const activeExecutions = await executionManager.listActive();
      return reply.send(activeExecutions);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}