import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import workflowSchemaData from '../../../specs/contracts/WORKFLOW_SCHEMA_V1.json'

export interface WorkflowSchema {
  $schema: string
  $id: string
  title: string
  type: string
  required: string[]
  properties: Record<string, unknown>
  additionalProperties: boolean
}

export interface WorkflowValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface ValidationError {
  instancePath: string
  schemaPath: string
  keyword: string
  params: Record<string, unknown>
  message?: string
}

export interface WorkflowNode {
  id: string
  name: string
  type: string
  position?: { x: number; y: number }
  data?: Record<string, unknown>
  [key: string]: unknown
}

export interface WorkflowEdge {
  id: string
  from?: string
  to?: string
  source?: string
  target?: string
  [key: string]: unknown
}

class WorkflowValidationService {
  private ajv: Ajv
  private schema: WorkflowSchema = workflowSchemaData as WorkflowSchema
  private validateWorkflowFn: ReturnType<Ajv['compile']>

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      allowUnionTypes: true
    })
    addFormats(this.ajv)

    // Compile the schema for validation
    this.validateWorkflowFn = this.ajv.compile(this.schema)
  }

  validateWorkflow(workflow: unknown): WorkflowValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!workflow || typeof workflow !== 'object') {
      errors.push('Workflow must be an object')
      return { valid: false, errors, warnings }
    }

    const wf = workflow as Record<string, unknown>

    // Use AJV for comprehensive schema validation
    const isValid = this.validateWorkflowFn(workflow)

    if (!isValid && this.validateWorkflowFn.errors) {
      this.validateWorkflowFn.errors.forEach((error: ValidationError) => {
        const path = error.instancePath || 'root'
        const message = error.message || 'Validation error'
        errors.push(`${path}: ${message}`)
      })
    }

    // Additional business logic validations
    this.validateWorkflowLogic(wf, errors, warnings)

    return { valid: errors.length === 0, errors, warnings }
  }

  private validateWorkflowLogic(wf: Record<string, unknown>, errors: string[], warnings: string[]) {
    // Validate nodes and edges relationships
    this.validateNodesAndEdges(wf.nodes, wf.edges, errors, warnings)

    // Validate node connectivity
    this.validateNodeConnectivity(wf.nodes, wf.edges, warnings)

    // Validate for cycles
    this.validateNoCycles(wf.edges, errors)
  }

  private validateNodesAndEdges(nodes: unknown, edges: unknown, errors: string[], warnings: string[]) {
    if (!Array.isArray(nodes) || !Array.isArray(edges)) return

    const nodeIds = new Set(nodes.map((node: WorkflowNode) => node.id))

    edges.forEach((edge: WorkflowEdge, index: number) => {
      const fromId = edge.from || edge.source
      const toId = edge.to || edge.target
      if (fromId && !nodeIds.has(fromId)) {
        errors.push(`edges[${index}].from references non-existent node: ${fromId}`)
      }
      if (toId && !nodeIds.has(toId)) {
        errors.push(`edges[${index}].to references non-existent node: ${toId}`)
      }
    })

    // Check for orphaned nodes
    const referencedNodes = new Set<string>()
    edges.forEach((edge: WorkflowEdge) => {
      const fromId = edge.from || edge.source
      const toId = edge.to || edge.target
      if (fromId) referencedNodes.add(fromId)
      if (toId) referencedNodes.add(toId)
    })

    nodes.forEach((node: WorkflowNode) => {
      if (!referencedNodes.has(node.id)) {
        warnings.push(`Node '${node.id}' is not connected to any edges`)
      }
    })
  }

  private validateNodeConnectivity(nodes: unknown, edges: unknown, warnings: string[]) {
    if (!Array.isArray(nodes) || !Array.isArray(edges)) return

    const adjacencyList: Record<string, string[]> = {}
    const inDegree: Record<string, number> = {}

    // Build adjacency list and in-degree count
    nodes.forEach((node: WorkflowNode) => {
      adjacencyList[node.id] = []
      inDegree[node.id] = 0
    })

    edges.forEach((edge: WorkflowEdge) => {
      const from = edge.from || edge.source
      const to = edge.to || edge.target
      if (from && adjacencyList[from]) {
        adjacencyList[from].push(to || '')
      }
      if (to && inDegree[to] !== undefined) {
        inDegree[to]++
      }
    })

    // Find nodes with no incoming edges (potential start nodes)
    const startNodes = Object.keys(inDegree).filter(id => inDegree[id] === 0)

    if (startNodes.length === 0 && nodes.length > 0) {
      warnings.push('No clear start node found - workflow may have circular dependencies')
    }
  }

  private validateNoCycles(edges: unknown, errors: string[]) {
    if (!Array.isArray(edges)) return

    const adjacencyList: Record<string, string[]> = {}
    const visited = new Set<string>()
    const recStack = new Set<string>()

    // Build adjacency list
    edges.forEach((edge: WorkflowEdge) => {
      const from = edge.from || edge.source
      const to = edge.to || edge.target
      if (from) {
        if (!adjacencyList[from]) {
          adjacencyList[from] = []
        }
        if (to) {
          adjacencyList[from].push(to)
        }
      }
    })

    const hasCycleDFS = (nodeId: string): boolean => {
      if (recStack.has(nodeId)) return true
      if (visited.has(nodeId)) return false

      visited.add(nodeId)
      recStack.add(nodeId)

      const neighbors = adjacencyList[nodeId] || []
      for (const neighbor of neighbors) {
        if (hasCycleDFS(neighbor)) return true
      }

      recStack.delete(nodeId)
      return false
    }

    // Check for cycles starting from each node
    for (const nodeId of Object.keys(adjacencyList)) {
      if (hasCycleDFS(nodeId)) {
        errors.push('Workflow contains circular dependencies')
        break
      }
    }
  }

  private validateId(id: unknown, errors: string[]) {
    if (id !== undefined && typeof id !== 'string') {
      errors.push('id must be a string')
    }
  }

  private validateName(name: unknown, errors: string[]) {
    if (name !== undefined && typeof name !== 'string') {
      errors.push('name must be a string')
    }
  }

  private validateNodes(nodes: unknown, errors: string[], _warnings: string[]) {
    if (nodes === undefined) return

    if (!Array.isArray(nodes)) {
      errors.push('nodes must be an array')
      return
    }

    nodes.forEach((node, index) => {
      if (!node || typeof node !== 'object') {
        errors.push(`nodes[${index}] must be an object`)
        return
      }

      const n = node as Record<string, unknown>

      // Check required node fields
      if (!n.id || typeof n.id !== 'string') {
        errors.push(`nodes[${index}].id must be a string`)
      }
      if (!n.name || typeof n.name !== 'string') {
        errors.push(`nodes[${index}].name must be a string`)
      }
      if (!n.type || typeof n.type !== 'string') {
        errors.push(`nodes[${index}].type must be a string`)
      }

      // Validate position if present
      if (n.position && typeof n.position === 'object') {
        const pos = n.position as Record<string, unknown>
        if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
          errors.push(`nodes[${index}].position must have numeric x and y coordinates`)
        }
      }
    })
  }

  private validateEdges(edges: unknown, errors: string[], _warnings: string[]) {
    if (edges === undefined) return

    if (!Array.isArray(edges)) {
      errors.push('edges must be an array')
      return
    }

    edges.forEach((edge, index) => {
      if (!edge || typeof edge !== 'object') {
        errors.push(`edges[${index}] must be an object`)
        return
      }

      const e = edge as Record<string, unknown>

      // Check required edge fields
      if (!e.id || typeof e.id !== 'string') {
        errors.push(`edges[${index}].id must be a string`)
      }
      if (!e.from || typeof e.from !== 'string') {
        errors.push(`edges[${index}].from must be a string`)
      }
      if (!e.to || typeof e.to !== 'string') {
        errors.push(`edges[${index}].to must be a string`)
      }
    })
  }

  validateWorkflowJson(jsonString: string): WorkflowValidationResult {
    try {
      const workflow = JSON.parse(jsonString)
      return this.validateWorkflow(workflow)
    } catch (error) {
      return {
        valid: false,
        errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  // Deep equality check for round-trip validation
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true

    if (a == null || b == null) return a === b

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false
      }
      return true
    }

    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a as Record<string, unknown>)
      const keysB = Object.keys(b as Record<string, unknown>)

      if (keysA.length !== keysB.length) return false

      for (const key of keysA) {
        if (!keysB.includes(key)) return false
        if (!this.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false
      }
      return true
    }

    return false
  }

  // Test round-trip export/import validation
  validateRoundTrip(workflow: unknown): { valid: boolean; errors: string[]; original?: unknown; imported?: unknown } {
    const exportResult = this.exportWorkflow(workflow)

    if (!exportResult.valid || !exportResult.json) {
      return { valid: false, errors: exportResult.errors }
    }

    try {
      const importedWorkflow = JSON.parse(exportResult.json)
      const importValidation = this.validateWorkflow(importedWorkflow)

      if (!importValidation.valid) {
        return { valid: false, errors: [`Import validation failed: ${importValidation.errors.join('; ')}`] }
      }

      // Check deep equality
      if (!this.deepEqual(workflow, importedWorkflow)) {
        return {
          valid: false,
          errors: ['Round-trip validation failed: exported and imported workflows are not identical'],
          original: workflow,
          imported: importedWorkflow
        }
      }

      return { valid: true, errors: [], original: workflow, imported: importedWorkflow }
    } catch (error) {
      return {
        valid: false,
        errors: [`Round-trip import failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  // Export workflow to validated JSON
  exportWorkflow(workflow: unknown): { valid: boolean; json?: string; errors: string[]; warnings: string[] } {
    const validation = this.validateWorkflow(workflow)

    if (!validation.valid) {
      return { valid: false, errors: validation.errors, warnings: validation.warnings }
    }

    try {
      const json = JSON.stringify(workflow, null, 2)
      return { valid: true, json, errors: [], warnings: validation.warnings }
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to serialize workflow: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: validation.warnings
      }
    }
  }
}

export const workflowValidationService = new WorkflowValidationService()
export default workflowValidationService