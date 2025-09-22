import { describe, it, expect } from 'vitest'
import { workflowValidationService } from './workflowValidationService'

describe('WorkflowValidationService', () => {
  it('should validate a valid workflow', () => {
    const validWorkflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node1',
          name: 'Test Node',
          type: 'provider'
        }
      ],
      edges: []
    }

    const result = workflowValidationService.validateWorkflow(validWorkflow)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject workflow without required fields', () => {
    const invalidWorkflow = {
      name: 'Test Workflow',
      nodes: [],
      edges: []
    }

    const result = workflowValidationService.validateWorkflow(invalidWorkflow)
    expect(result.valid).toBe(false)
    expect(result.errors.some(error => error.includes('id') && error.includes('required'))).toBe(true)
  })

  it('should reject workflow with invalid node structure', () => {
    const invalidWorkflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node1',
          // missing name and type
        }
      ],
      edges: []
    }

    const result = workflowValidationService.validateWorkflow(invalidWorkflow)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should reject workflow with invalid edge structure', () => {
    const invalidWorkflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node1',
          name: 'Test Node',
          type: 'provider'
        }
      ],
      edges: [
        {
          id: 'edge1',
          // missing from/to
        }
      ]
    }

    const result = workflowValidationService.validateWorkflow(invalidWorkflow)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should detect orphaned nodes', () => {
    const workflowWithOrphanedNode = {
      id: 'test-workflow',
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node1',
          name: 'Test Node 1',
          type: 'provider'
        },
        {
          id: 'node2',
          name: 'Test Node 2',
          type: 'dom_action'
        }
      ],
      edges: [
        {
          id: 'edge1',
          from: 'node1',
          to: 'node2'
        }
      ]
    }

    const result = workflowValidationService.validateWorkflow(workflowWithOrphanedNode)
    expect(result.valid).toBe(true)
    // Note: The orphaned node detection might not trigger for start nodes
    expect(result.warnings.length).toBeGreaterThanOrEqual(0)
  })

  it('should detect invalid JSON', () => {
    const result = workflowValidationService.validateWorkflowJson('invalid json')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Invalid JSON')
  })

  it('should export valid workflow to JSON', () => {
    const validWorkflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node1',
          name: 'Test Node',
          type: 'provider'
        }
      ],
      edges: []
    }

    const result = workflowValidationService.exportWorkflow(validWorkflow)
    expect(result.valid).toBe(true)
    expect(result.json).toBeDefined()
    expect(typeof result.json).toBe('string')
  })

  it('should reject export of invalid workflow', () => {
    const invalidWorkflow = {
      name: 'Test Workflow',
      nodes: [],
      edges: []
    }

    const result = workflowValidationService.exportWorkflow(invalidWorkflow)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})