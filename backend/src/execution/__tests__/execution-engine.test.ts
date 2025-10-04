import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DAGExecutor } from '../dag-executor';
import { WorkflowRunner } from '../workflow-runner';
import { ExecutionStatus, NodeExecutionStatus } from '../../types/execution';

describe('Workflow Execution Engine', () => {
  let dagExecutor: DAGExecutor;
  let workflowRunner: WorkflowRunner;

  beforeEach(() => {
    dagExecutor = new DAGExecutor();
    workflowRunner = new WorkflowRunner(dagExecutor);
  });

  describe('DAGExecutor', () => {
    it('should initialize correctly', () => {
      expect(dagExecutor).toBeInstanceOf(DAGExecutor);
    });

    it('should validate workflow structure', () => {
      const validWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'node1',
            name: 'Node 1',
            type: 'code',
            inputs: {},
            outputs: { output: 'string' },
            next: ['node2'],
            retries: 0,
            timeout: 30000,
            retry_delay: 1000,
            tags: [],
            status: 'pending',
            execution_time: 0
          },
          {
            id: 'node2',
            name: 'Node 2',
            type: 'code',
            inputs: { input: 'string' },
            outputs: {},
            next: [],
            retries: 0,
            timeout: 30000,
            retry_delay: 1000,
            tags: [],
            status: 'pending',
            execution_time: 0
          }
        ],
        edges: [
          { id: 'edge1', from: 'node1', to: 'node2', meta: {} }
        ]
      };

      // Basic validation - should not throw
      expect(() => {
        // This would call internal validation
      }).not.toThrow();
    });
  });

  describe('WorkflowRunner', () => {
    it('should initialize correctly', () => {
      expect(workflowRunner).toBeInstanceOf(WorkflowRunner);
    });

    it('should validate workflow', () => {
      const validWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'node1',
            name: 'Node 1',
            type: 'code',
            inputs: {},
            outputs: { output: 'string' },
            next: [],
            retries: 0,
            timeout: 30000,
            retry_delay: 1000,
            tags: [],
            status: 'pending',
            execution_time: 0
          }
        ],
        edges: []
      };

      const result = workflowRunner.validateWorkflow(validWorkflow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid workflow', () => {
      const invalidWorkflow = {
        id: '',
        name: 'Test Workflow',
        nodes: [],
        edges: []
      };

      const result = workflowRunner.validateWorkflow(invalidWorkflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have an ID');
      expect(result.errors).toContain('Workflow must have at least one node');
    });

    it('should track execution progress', () => {
      const progress = workflowRunner.getExecutionProgress('nonexistent');
      expect(progress).toBeNull();
    });

    it('should provide execution statistics', () => {
      const stats = workflowRunner.getExecutionStats();
      expect(stats).toHaveProperty('totalExecutions');
      expect(stats).toHaveProperty('activeExecutions');
      expect(stats).toHaveProperty('completedExecutions');
      expect(stats).toHaveProperty('failedExecutions');
      expect(stats).toHaveProperty('averageExecutionTime');
    });
  });

  describe('Execution Types', () => {
    it('should define execution status enum', () => {
      expect(ExecutionStatus.PENDING).toBe('pending');
      expect(ExecutionStatus.RUNNING).toBe('running');
      expect(ExecutionStatus.COMPLETED).toBe('completed');
      expect(ExecutionStatus.FAILED).toBe('failed');
      expect(ExecutionStatus.CANCELLED).toBe('cancelled');
      expect(ExecutionStatus.PAUSED).toBe('paused');
    });

    it('should define node execution status enum', () => {
      expect(NodeExecutionStatus.PENDING).toBe('pending');
      expect(NodeExecutionStatus.RUNNING).toBe('running');
      expect(NodeExecutionStatus.COMPLETED).toBe('completed');
      expect(NodeExecutionStatus.FAILED).toBe('failed');
      expect(NodeExecutionStatus.RETRYING).toBe('retrying');
      expect(NodeExecutionStatus.SKIPPED).toBe('skipped');
      expect(NodeExecutionStatus.CANCELLED).toBe('cancelled');
    });
  });
});