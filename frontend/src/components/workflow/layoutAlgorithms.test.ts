// Test file for layout algorithms
import { ForceDirectedLayout, HierarchicalLayout, GridLayout } from './layoutAlgorithms'
import type { Node, Edge } from './layoutAlgorithms'

// Test data
const createTestNodes = (count: number): Node[] => {
  const nodes: Node[] = []
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `node-${i}`,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { name: `Node ${i}` }
    })
  }
  return nodes
}

const createTestEdges = (nodes: Node[]): Edge[] => {
  const edges: Edge[] = []
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `edge-${i}`,
      source: nodes[i].id,
      target: nodes[i + 1].id
    })
  }
  return edges
}

// Test force-directed layout
describe('ForceDirectedLayout', () => {
  test('should layout small graph (5 nodes)', () => {
    const nodes = createTestNodes(5)
    const edges = createTestEdges(nodes)

    const layout = new ForceDirectedLayout(nodes, edges, { algorithm: 'force-directed' })
    const result = layout.layout()

    expect(result).toHaveLength(5)
    result.forEach(node => {
      expect(node.position.x).toBeDefined()
      expect(node.position.y).toBeDefined()
    })
  })

  test('should layout medium graph (20 nodes)', () => {
    const nodes = createTestNodes(20)
    const edges = createTestEdges(nodes)

    const layout = new ForceDirectedLayout(nodes, edges, { algorithm: 'force-directed' })
    const result = layout.layout()

    expect(result).toHaveLength(20)
    result.forEach(node => {
      expect(node.position.x).toBeDefined()
      expect(node.position.y).toBeDefined()
    })
  })

  test('should layout large graph (50 nodes)', () => {
    const nodes = createTestNodes(50)
    const edges = createTestEdges(nodes)

    const layout = new ForceDirectedLayout(nodes, edges, { algorithm: 'force-directed' })
    const result = layout.layout()

    expect(result).toHaveLength(50)
    result.forEach(node => {
      expect(node.position.x).toBeDefined()
      expect(node.position.y).toBeDefined()
    })
  })
})

// Test hierarchical layout
describe('HierarchicalLayout', () => {
  test('should layout linear graph hierarchically', () => {
    const nodes = createTestNodes(5)
    const edges = createTestEdges(nodes)

    const layout = new HierarchicalLayout(nodes, edges, { algorithm: 'hierarchical' })
    const result = layout.layout()

    expect(result).toHaveLength(5)
    // Check that nodes are positioned in levels
    const positions = result.map(node => node.position.y)
    const sortedPositions = [...positions].sort((a, b) => a - b)
    expect(positions).not.toEqual(sortedPositions) // Should be arranged hierarchically
  })

  test('should handle disconnected nodes', () => {
    const nodes = createTestNodes(10)
    // Create edges for only first 5 nodes
    const edges = createTestEdges(nodes.slice(0, 5))

    const layout = new HierarchicalLayout(nodes, edges, { algorithm: 'hierarchical' })
    const result = layout.layout()

    expect(result).toHaveLength(10)
    result.forEach(node => {
      expect(node.position.x).toBeDefined()
      expect(node.position.y).toBeDefined()
    })
  })
})

// Test grid layout
describe('GridLayout', () => {
  test('should layout nodes in grid pattern', () => {
    const nodes = createTestNodes(12) // 3x4 grid
    const edges: Edge[] = [] // No edges for grid layout

    const layout = new GridLayout(nodes, edges, { algorithm: 'grid' })
    const result = layout.layout()

    expect(result).toHaveLength(12)
    result.forEach(node => {
      expect(node.position.x).toBeDefined()
      expect(node.position.y).toBeDefined()
    })
  })

  test('should handle collision avoidance', () => {
    const nodes: Node[] = [
      { id: 'node-1', position: { x: 100, y: 100 }, data: {} },
      { id: 'node-2', position: { x: 100, y: 100 }, data: {} }, // Same position
      { id: 'node-3', position: { x: 100, y: 100 }, data: {} }  // Same position
    ]
    const edges: Edge[] = []

    const layout = new GridLayout(nodes, edges, { algorithm: 'grid' })
    const result = layout.layout()

    expect(result).toHaveLength(3)
    // All nodes should have different positions after collision avoidance
    const positions = result.map(node => `${node.position.x},${node.position.y}`)
    const uniquePositions = new Set(positions)
    expect(uniquePositions.size).toBe(3)
  })
})

// Performance test
describe('Performance Tests', () => {
  test('should handle 100 nodes efficiently', () => {
    const nodes = createTestNodes(100)
    const edges = createTestEdges(nodes)

    const startTime = Date.now()
    const layout = new ForceDirectedLayout(nodes, edges, { algorithm: 'force-directed', iterations: 50 })
    const result = layout.layout()
    const endTime = Date.now()

    expect(result).toHaveLength(100)
    expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
  })

  test('should handle 100+ nodes with hierarchical layout', () => {
    const nodes = createTestNodes(120)
    const edges = createTestEdges(nodes)

    const startTime = Date.now()
    const layout = new HierarchicalLayout(nodes, edges, { algorithm: 'hierarchical' })
    const result = layout.layout()
    const endTime = Date.now()

    expect(result).toHaveLength(120)
    expect(endTime - startTime).toBeLessThan(2000) // Should be very fast
  })
})