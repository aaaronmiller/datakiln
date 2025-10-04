// Layout algorithms for workflow canvas
// Supports force-directed, hierarchical, and grid-based layouts

export interface Node {
  id: string
  position: { x: number; y: number }
  data: Record<string, unknown>
  type?: string
  width?: number
  height?: number
}

export interface Edge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export type LayoutAlgorithm = 'force-directed' | 'hierarchical' | 'grid'

export interface LayoutOptions {
  algorithm: LayoutAlgorithm
  iterations?: number
  repulsionStrength?: number
  attractionStrength?: number
  damping?: number
  centerX?: number
  centerY?: number
  spacing?: number
  respectExecutionOrder?: boolean
}

// Force-directed layout using physics-based positioning
export class ForceDirectedLayout {
  private nodes: Node[]
  private edges: Edge[]
  private options: LayoutOptions

  constructor(nodes: Node[], edges: Edge[], options: LayoutOptions) {
    this.nodes = [...nodes]
    this.edges = [...edges]
    this.options = {
      iterations: 100,
      repulsionStrength: 1000,
      attractionStrength: 0.1,
      damping: 0.9,
      centerX: 400,
      centerY: 300,
      ...options
    }
  }

  // Calculate repulsive force between two nodes
  private calculateRepulsion(node1: Node, node2: Node): { x: number; y: number } {
    const dx = node1.position.x - node2.position.x
    const dy = node1.position.y - node2.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance === 0) return { x: 0, y: 0 }

    const force = this.options.repulsionStrength! / (distance * distance)
    return {
      x: (dx / distance) * force,
      y: (dy / distance) * force
    }
  }

  // Calculate attractive force along an edge
  private calculateAttraction(source: Node, target: Node): { x: number; y: number } {
    const dx = target.position.x - source.position.x
    const dy = target.position.y - source.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance === 0) return { x: 0, y: 0 }

    const force = this.options.attractionStrength! * distance
    return {
      x: (dx / distance) * force,
      y: (dy / distance) * force
    }
  }

  // Apply forces and update positions
  private applyForces(): void {
    const forces = new Map<string, { x: number; y: number }>()

    // Initialize forces
    this.nodes.forEach(node => {
      forces.set(node.id, { x: 0, y: 0 })
    })

    // Calculate repulsive forces between all pairs
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const node1 = this.nodes[i]
        const node2 = this.nodes[j]

        const repulsion = this.calculateRepulsion(node1, node2)
        forces.get(node1.id)!.x += repulsion.x
        forces.get(node1.id)!.y += repulsion.y
        forces.get(node2.id)!.x -= repulsion.x
        forces.get(node2.id)!.y -= repulsion.y
      }
    }

    // Calculate attractive forces along edges
    this.edges.forEach(edge => {
      const sourceNode = this.nodes.find(n => n.id === edge.source)
      const targetNode = this.nodes.find(n => n.id === edge.target)

      if (sourceNode && targetNode) {
        const attraction = this.calculateAttraction(sourceNode, targetNode)
        forces.get(sourceNode.id)!.x += attraction.x
        forces.get(sourceNode.id)!.y += attraction.y
        forces.get(targetNode.id)!.x -= attraction.x
        forces.get(targetNode.id)!.y -= attraction.y
      }
    })

    // Apply forces with damping
    this.nodes.forEach(node => {
      const force = forces.get(node.id)!
      node.position.x += force.x * this.options.damping!
      node.position.y += force.y * this.options.damping!
    })
  }

  // Run the layout algorithm
  public layout(): Node[] {
    // Initialize random positions if not set
    this.nodes.forEach((node, index) => {
      if (!node.position.x && !node.position.y) {
        const angle = (index / this.nodes.length) * 2 * Math.PI
        const radius = 200
        node.position = {
          x: this.options.centerX! + Math.cos(angle) * radius,
          y: this.options.centerY! + Math.sin(angle) * radius
        }
      }
    })

    // Run iterations
    for (let i = 0; i < this.options.iterations!; i++) {
      this.applyForces()
    }

    return this.nodes
  }
}

// Hierarchical layout respecting execution order
export class HierarchicalLayout {
  private nodes: Node[]
  private edges: Edge[]
  private options: LayoutOptions

  constructor(nodes: Node[], edges: Edge[], options: LayoutOptions) {
    this.nodes = [...nodes]
    this.edges = [...edges]
    this.options = {
      spacing: 200,
      centerX: 400,
      centerY: 300,
      respectExecutionOrder: true,
      ...options
    }
  }

  // Calculate topological order (execution order)
  private calculateTopologicalOrder(): string[] {
    const indegree = new Map<string, number>()
    const adjList = new Map<string, string[]>()

    // Initialize
    this.nodes.forEach(node => {
      indegree.set(node.id, 0)
      adjList.set(node.id, [])
    })

    // Build adjacency list and indegree
    this.edges.forEach(edge => {
      adjList.get(edge.source)!.push(edge.target)
      indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1)
    })

    // Kahn's algorithm
    const queue: string[] = []
    const result: string[] = []

    // Start with nodes that have no incoming edges
    indegree.forEach((deg, nodeId) => {
      if (deg === 0) queue.push(nodeId)
    })

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      result.push(nodeId)

      adjList.get(nodeId)!.forEach(neighbor => {
        indegree.set(neighbor, (indegree.get(neighbor) || 0) - 1)
        if (indegree.get(neighbor) === 0) {
          queue.push(neighbor)
        }
      })
    }

    // Add any remaining nodes (cycles)
    this.nodes.forEach(node => {
      if (!result.includes(node.id)) {
        result.push(node.id)
      }
    })

    return result
  }

  // Assign levels to nodes
  private assignLevels(order: string[]): Map<string, number> {
    const levels = new Map<string, number>()
    const visited = new Set<string>()

    // Start from nodes with no incoming edges
    order.forEach(nodeId => {
      if (!visited.has(nodeId)) {
        this.assignLevelRecursive(nodeId, 0, levels, visited)
      }
    })

    return levels
  }

  private assignLevelRecursive(nodeId: string, level: number, levels: Map<string, number>, visited: Set<string>): void {
    if (visited.has(nodeId)) return

    visited.add(nodeId)
    levels.set(nodeId, Math.max(levels.get(nodeId) || 0, level))

    // Process children
    this.edges
      .filter(edge => edge.source === nodeId)
      .forEach(edge => {
        this.assignLevelRecursive(edge.target, level + 1, levels, visited)
      })
  }

  public layout(): Node[] {
    const order = this.calculateTopologicalOrder()
    const levels = this.assignLevels(order)

    // Group nodes by level
    const levelGroups = new Map<number, string[]>()
    levels.forEach((level, nodeId) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, [])
      }
      levelGroups.get(level)!.push(nodeId)
    })

    // Position nodes
    const maxLevel = Math.max(...Array.from(levels.values()))
    const levelHeight = this.options.spacing!

    levelGroups.forEach((nodeIds, level) => {
      const levelWidth = (nodeIds.length - 1) * this.options.spacing!
      const startX = this.options.centerX! - levelWidth / 2
      const y = this.options.centerY! - (maxLevel * levelHeight) / 2 + level * levelHeight

      nodeIds.forEach((nodeId, index) => {
        const node = this.nodes.find(n => n.id === nodeId)
        if (node) {
          node.position = {
            x: startX + index * this.options.spacing!,
            y: y
          }
        }
      })
    })

    return this.nodes
  }
}

// Grid-based layout with collision avoidance
export class GridLayout {
  private nodes: Node[]
  private edges: Edge[]
  private options: LayoutOptions

  constructor(nodes: Node[], edges: Edge[], options: LayoutOptions) {
    this.nodes = [...nodes]
    this.edges = [...edges]
    this.options = {
      spacing: 150,
      centerX: 400,
      centerY: 300,
      ...options
    }
  }

  // Check if position collides with existing nodes
  private hasCollision(x: number, y: number, excludeId?: string): boolean {
    const nodeWidth = 120 // Approximate node width
    const nodeHeight = 80  // Approximate node height

    return this.nodes.some(node => {
      if (excludeId && node.id === excludeId) return false

      const dx = Math.abs(node.position.x - x)
      const dy = Math.abs(node.position.y - y)

      return dx < nodeWidth && dy < nodeHeight
    })
  }

  // Find next available grid position
  private findNextGridPosition(currentX: number, currentY: number, excludeId?: string): { x: number; y: number } {
    let x = currentX
    let y = currentY
    let attempts = 0
    const maxAttempts = 100

    while (this.hasCollision(x, y, excludeId) && attempts < maxAttempts) {
      // Try positions in a spiral pattern
      const angle = attempts * 0.5
      const radius = Math.floor(attempts / 8) + 1
      x = currentX + Math.cos(angle) * radius * this.options.spacing!
      y = currentY + Math.sin(angle) * radius * this.options.spacing!
      attempts++
    }

    return { x, y }
  }

  public layout(): Node[] {
    const spacing = this.options.spacing!

    // Position nodes in a grid with collision avoidance
    this.nodes.forEach((node, index) => {
      const gridX = (index % 5) * spacing
      const gridY = Math.floor(index / 5) * spacing

      const targetX = this.options.centerX! - (2.5 * spacing) + gridX
      const targetY = this.options.centerY! - (Math.floor(this.nodes.length / 5) * spacing / 2) + gridY

      const finalPosition = this.findNextGridPosition(targetX, targetY, node.id)
      node.position = finalPosition
    })

    return this.nodes
  }
}

// Main layout function
export function applyLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions,
  onProgress?: (progress: number) => void
): Promise<Node[]> {
  return new Promise((resolve) => {
    // Run layout in next tick to allow UI updates
    setTimeout(() => {
      let layoutAlgorithm: ForceDirectedLayout | HierarchicalLayout | GridLayout

      switch (options.algorithm) {
        case 'force-directed':
          layoutAlgorithm = new ForceDirectedLayout(nodes, edges, options)
          break
        case 'hierarchical':
          layoutAlgorithm = new HierarchicalLayout(nodes, edges, options)
          break
        case 'grid':
          layoutAlgorithm = new GridLayout(nodes, edges, options)
          break
        default:
          throw new Error(`Unknown layout algorithm: ${options.algorithm}`)
      }

      const result = layoutAlgorithm.layout()

      // Call progress callback if provided
      if (onProgress) {
        onProgress(100)
      }

      resolve(result)
    }, 0)
  })
}

// Web Worker version for performance with large graphs
export function applyLayoutWithWorker(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions,
  onProgress?: (progress: number) => void
): Promise<Node[]> {
  return new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined') {
      // Fallback to main thread
      return applyLayout(nodes, edges, options, onProgress).then(resolve).catch(reject)
    }

    try {
      // Create inline worker
      const workerCode = `
        ${ForceDirectedLayout.toString()}
        ${HierarchicalLayout.toString()}
        ${GridLayout.toString()}
        ${applyLayout.toString()}

        self.onmessage = function(e) {
          const { nodes, edges, options } = e.data

          applyLayout(nodes, edges, options, (progress) => {
            self.postMessage({ type: 'progress', progress })
          }).then((result) => {
            self.postMessage({ type: 'complete', result })
          }).catch((error) => {
            self.postMessage({ type: 'error', error: error.message })
          })
        }
      `

      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const worker = new Worker(URL.createObjectURL(blob))

      worker.onmessage = (e) => {
        const { type, progress, result, error } = e.data

        if (type === 'progress' && onProgress) {
          onProgress(progress)
        } else if (type === 'complete') {
          worker.terminate()
          resolve(result)
        } else if (type === 'error') {
          worker.terminate()
          reject(new Error(error))
        }
      }

      worker.postMessage({ nodes, edges, options })
    } catch (error) {
      // Fallback to main thread
      applyLayout(nodes, edges, options, onProgress).then(resolve).catch(reject)
    }
  })
}