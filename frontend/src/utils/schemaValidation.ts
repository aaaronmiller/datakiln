import workflowSchema from '../../../old-specs/contracts/WORKFLOW_SCHEMA_V1.json'

interface JsonSchema {
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
  items?: JsonSchema;
  type?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  [key: string]: unknown;
}

interface WorkflowNode {
  id?: string;
  name?: string;
  type?: string;
  description?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  next?: string | string[];
  retries?: number;
  timeout?: number;
  retry_delay?: number;
  tags?: string[];
  status?: string;
  execution_time?: number;
  error_message?: string;
  [key: string]: unknown;
}

interface WorkflowEdge {
  id?: string;
  from?: string;
  to?: string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Workflow {
  id?: string;
  name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class SchemaValidator {
  private schema: JsonSchema

  constructor(schema: JsonSchema = workflowSchema as JsonSchema) {
    this.schema = schema
  }

  validateWorkflow(workflow: Record<string, unknown>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required top-level properties
    const required = this.schema.required || []
    for (const prop of required) {
      if (!(prop in workflow)) {
        errors.push(`Missing required property: ${prop}`)
      }
    }

    // Validate id
    if (workflow.id !== undefined) {
      if (typeof workflow.id !== 'string') {
        errors.push('id must be a string')
      }
    }

    // Validate name
    if (workflow.name !== undefined) {
      if (typeof workflow.name !== 'string') {
        errors.push('name must be a string')
      }
    }

    // Validate description
    if (workflow.description !== undefined) {
      if (typeof workflow.description !== 'string') {
        errors.push('description must be a string')
      }
    }

    // Validate metadata
 if (workflow.metadata !== undefined) {
   if (typeof workflow.metadata !== 'object' || workflow.metadata === null) {
     errors.push('metadata must be an object')
   } else {
     // Validate metadata properties
     const metadataSchema = this.schema.properties?.metadata
     if (metadataSchema) {
       this.validateObject(workflow.metadata as Record<string, unknown>, metadataSchema, 'metadata', errors, warnings)
     }
   }
 }

    // Validate nodes
    if (!Array.isArray(workflow.nodes)) {
      errors.push('nodes must be an array')
    } else {
       const nodeSchema = this.schema.properties?.nodes?.items
       if (nodeSchema) {
         workflow.nodes.forEach((node: Record<string, unknown>, index: number) => {
           this.validateNode(node, nodeSchema, `nodes[${index}]`, errors, warnings)
         })
       }
     }

    // Validate edges
    if (!Array.isArray(workflow.edges)) {
      errors.push('edges must be an array')
    } else {
       const edgeSchema = this.schema.properties?.edges?.items
       if (edgeSchema) {
         workflow.edges.forEach((edge: Record<string, unknown>, index: number) => {
           this.validateEdge(edge, edgeSchema, `edges[${index}]`, errors, warnings)
         })
       }
     }

    // Check for additional properties
     if (!this.schema.additionalProperties) {
       const allowedProps = new Set(Object.keys(this.schema.properties ?? {}))
       for (const prop in workflow) {
         if (!allowedProps.has(prop)) {
           errors.push(`Unexpected property: ${prop}`)
         }
       }
     }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  private validateNode(node: Record<string, unknown>, schema: JsonSchema, path: string, errors: string[], warnings: string[]): void {
    // Check required properties
    const required = schema.required || []
    for (const prop of required) {
      if (!(prop in node)) {
        errors.push(`${path}: Missing required property: ${prop}`)
      }
    }

    // Validate id
    if (node.id !== undefined && typeof node.id !== 'string') {
      errors.push(`${path}.id: must be a string`)
    }

    // Validate name
    if (node.name !== undefined && typeof node.name !== 'string') {
      errors.push(`${path}.name: must be a string`)
    }

    // Validate type
    if (node.type !== undefined && typeof node.type !== 'string') {
      errors.push(`${path}.type: must be a string`)
    }

    // Validate description
    if (node.description !== undefined && typeof node.description !== 'string') {
      errors.push(`${path}.description: must be a string`)
    }

    // Validate inputs
    if (node.inputs !== undefined && (typeof node.inputs !== 'object' || node.inputs === null)) {
      errors.push(`${path}.inputs: must be an object`)
    }

    // Validate outputs
    if (node.outputs !== undefined && (typeof node.outputs !== 'object' || node.outputs === null)) {
      errors.push(`${path}.outputs: must be an object`)
    }

    // Validate next
    if (node.next !== undefined) {
      if (typeof node.next !== 'string' && !Array.isArray(node.next)) {
        errors.push(`${path}.next: must be a string or array of strings`)
      } else if (Array.isArray(node.next)) {
        node.next.forEach((item: unknown, idx: number) => {
          if (typeof item !== 'string') {
            errors.push(`${path}.next[${idx}]: must be a string`)
          }
        })
      }
    }

    // Validate retries
    if (node.retries !== undefined) {
      if (typeof node.retries !== 'number' || node.retries < 0 || !Number.isInteger(node.retries)) {
        errors.push(`${path}.retries: must be a non-negative integer`)
      }
    }

    // Validate timeout
    if (node.timeout !== undefined) {
      if (typeof node.timeout !== 'number' || node.timeout < 0 || !Number.isInteger(node.timeout)) {
        errors.push(`${path}.timeout: must be a non-negative integer`)
      }
    }

    // Validate retry_delay
    if (node.retry_delay !== undefined) {
      if (typeof node.retry_delay !== 'number' || node.retry_delay < 0 || !Number.isInteger(node.retry_delay)) {
        errors.push(`${path}.retry_delay: must be a non-negative integer`)
      }
    }

    // Validate tags
    if (node.tags !== undefined) {
      if (!Array.isArray(node.tags)) {
        errors.push(`${path}.tags: must be an array`)
      } else {
        node.tags.forEach((tag: unknown, idx: number) => {
          if (typeof tag !== 'string') {
            errors.push(`${path}.tags[${idx}]: must be a string`)
          }
        })
      }
    }

    // Validate status
     if (node.status !== undefined && typeof node.status === 'string') {
       const validStatuses = ['pending', 'running', 'completed', 'failed']
       if (!validStatuses.includes(node.status)) {
         errors.push(`${path}.status: must be one of: ${validStatuses.join(', ')}`)
       }
     }

    // Validate execution_time
    if (node.execution_time !== undefined && typeof node.execution_time !== 'number') {
      errors.push(`${path}.execution_time: must be a number`)
    }

    // Validate error_message
    if (node.error_message !== undefined && typeof node.error_message !== 'string') {
      errors.push(`${path}.error_message: must be a string`)
    }

    // Check for additional properties
    if (!schema.additionalProperties) {
      const allowedProps = new Set(Object.keys(schema.properties ?? {}))
      for (const prop in node) {
        if (!allowedProps.has(prop)) {
          errors.push(`${path}: Unexpected property: ${prop}`)
        }
      }
    }
  }

  private validateEdge(edge: Record<string, unknown>, schema: JsonSchema, path: string, errors: string[], warnings: string[]): void {
    // Check required properties
    const required = schema.required || []
    for (const prop of required) {
      if (!(prop in edge)) {
        errors.push(`${path}: Missing required property: ${prop}`)
      }
    }

    // Validate id
    if (edge.id !== undefined && typeof edge.id !== 'string') {
      errors.push(`${path}.id: must be a string`)
    }

    // Validate from
    if (edge.from !== undefined && typeof edge.from !== 'string') {
      errors.push(`${path}.from: must be a string`)
    }

    // Validate to
    if (edge.to !== undefined && typeof edge.to !== 'string') {
      errors.push(`${path}.to: must be a string`)
    }

    // Validate meta
    if (edge.meta !== undefined && (typeof edge.meta !== 'object' || edge.meta === null)) {
      errors.push(`${path}.meta: must be an object`)
    }

    // Check for additional properties
    if (!schema.additionalProperties) {
      const allowedProps = new Set(Object.keys(schema.properties ?? {}))
      for (const prop in edge) {
        if (!allowedProps.has(prop)) {
          errors.push(`${path}: Unexpected property: ${prop}`)
        }
      }
    }
  }

  private validateObject(obj: Record<string, unknown>, schema: JsonSchema, path: string, errors: string[], warnings: string[]): void {
    if (typeof obj !== 'object' || obj === null) return

    // Check required properties
    const required = schema.required || []
    for (const prop of required) {
      if (!(prop in obj)) {
        errors.push(`${path}: Missing required property: ${prop}`)
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [prop, propSchema] of Object.entries(schema.properties)) {
        if (prop in obj) {
          this.validateProperty(obj[prop], propSchema as JsonSchema, `${path}.${prop}`, errors, warnings)
        }
      }
    }

    // Check additional properties
    if (!schema.additionalProperties) {
      const allowedProps = new Set(Object.keys(schema.properties || {}))
      for (const prop in obj) {
        if (!allowedProps.has(prop)) {
          warnings.push(`${path}: Additional property: ${prop}`)
        }
      }
    }
  }

  private validateProperty(value: unknown, schema: JsonSchema, path: string, errors: string[], warnings: string[]): void {
    // Basic type validation
    if (schema.type) {
      const type = schema.type
      if (type === 'string' && typeof value !== 'string') {
        errors.push(`${path}: must be a string`)
      } else if (type === 'number' && typeof value !== 'number') {
        errors.push(`${path}: must be a number`)
      } else if (type === 'integer' && (typeof value !== 'number' || !Number.isInteger(value))) {
        errors.push(`${path}: must be an integer`)
      } else if (type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${path}: must be a boolean`)
      } else if (type === 'array' && !Array.isArray(value)) {
        errors.push(`${path}: must be an array`)
      } else if (type === 'object' && (typeof value !== 'object' || value === null)) {
        errors.push(`${path}: must be an object`)
      }
    }

    // Enum validation
    if (schema.enum && Array.isArray(schema.enum) && !schema.enum.includes(value)) {
      errors.push(`${path}: must be one of: ${schema.enum.join(', ')}`)
    }

    // Range validation
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path}: must be >= ${schema.minimum}`)
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path}: must be <= ${schema.maximum}`)
    }
    }

    // String validation
    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path}: must be at least ${schema.minLength} characters`)
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(`${path}: must be at most ${schema.maxLength} characters`)
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        errors.push(`${path}: must match pattern ${schema.pattern}`)
      }
    }

    // Array validation
    if (Array.isArray(value) && schema.items) {
      value.forEach((item, index) => {
        this.validateProperty(item, schema.items!, `${path}[${index}]`, errors, warnings)
      })
    }
  }
}

export const workflowValidator = new SchemaValidator()

// Utility function for round-trip validation
export function validateWorkflowRoundTrip(originalWorkflow: Record<string, unknown>, importedWorkflow: Record<string, unknown>): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if they have the same structure
  const originalValidation = workflowValidator.validateWorkflow(originalWorkflow)
  const importedValidation = workflowValidator.validateWorkflow(importedWorkflow)

  if (!originalValidation.valid) {
    errors.push('Original workflow is invalid')
    errors.push(...originalValidation.errors)
  }

  if (!importedValidation.valid) {
    errors.push('Imported workflow is invalid')
    errors.push(...importedValidation.errors)
  }

  // Check structural equivalence (simplified)
  if (originalWorkflow.nodes && Array.isArray(originalWorkflow.nodes) && importedWorkflow.nodes && Array.isArray(importedWorkflow.nodes)) {
    if (originalWorkflow.nodes.length !== importedWorkflow.nodes.length) {
      errors.push(`Node count mismatch: ${originalWorkflow.nodes.length} vs ${importedWorkflow.nodes.length}`)
    }
  }

  if (originalWorkflow.edges && Array.isArray(originalWorkflow.edges) && importedWorkflow.edges && Array.isArray(importedWorkflow.edges)) {
    if (originalWorkflow.edges.length !== importedWorkflow.edges.length) {
      errors.push(`Edge count mismatch: ${originalWorkflow.edges.length} vs ${importedWorkflow.edges.length}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}