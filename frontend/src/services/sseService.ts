interface SSEMessage extends Record<string, unknown> {
  event: string
  data: Record<string, unknown>
}

class SSEService {
  private eventSource: EventSource | null = null
  private listeners: { [event: string]: ((data: Record<string, unknown>) => void)[] } = {}
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl
  }

  connect(runId: string): void {
    if (this.eventSource) {
      this.disconnect()
    }

    const url = `${this.baseUrl}/api/v1/workflows/runs/${runId}/stream`
    this.eventSource = new EventSource(url)

    this.eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data)
        this.emit('message', message)
      } catch (error) {
        console.error('Failed to parse SSE message:', error)
      }
    }

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      this.emit('error', { event: 'error', data: { error: 'Connection failed' } })
    }

    this.eventSource.onopen = () => {
      console.log('SSE connection opened for run:', runId)
      this.emit('open', { event: 'open', data: { runId } })
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      this.emit('close', { event: 'close', data: {} })
    }
  }

  // Subscribe to events
  on(event: string, callback: (data: SSEMessage) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback as (data: Record<string, unknown>) => void)
  }

  // Unsubscribe from events
  off(event: string, callback?: (data: SSEMessage) => void): void {
    if (!this.listeners[event]) return

    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
    } else {
      delete this.listeners[event]
    }
  }

  // Emit events to listeners
  private emit(event: string, data: SSEMessage): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data))
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }
}

// Create singleton instance
const sseService = new SSEService()

export default sseService