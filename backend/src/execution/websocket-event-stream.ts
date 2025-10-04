import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import {
  ExecutionEvent,
  ExecutionEventType,
  ExecutionEventEmitter
} from '../types/execution.js';

export interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  executionId?: string;
  subscribedAt: number;
}

export class WebSocketEventStream implements ExecutionEventEmitter {
  private eventEmitter: EventEmitter;
  private connections: Map<string, WebSocketConnection>;
  private executionSubscriptions: Map<string, Set<string>>; // executionId -> connectionIds

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.connections = new Map();
    this.executionSubscriptions = new Map();
  }

  /**
   * Add a WebSocket connection for execution monitoring
   */
  addConnection(ws: WebSocket, executionId?: string): string {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const connection: WebSocketConnection = {
      id: connectionId,
      ws,
      executionId,
      subscribedAt: Date.now()
    };

    this.connections.set(connectionId, connection);

    // Subscribe to execution if specified
    if (executionId) {
      this.subscribeToExecution(connectionId, executionId);
    }

    // Handle connection close
    ws.on('close', () => {
      this.removeConnection(connectionId);
    });

    // Handle connection errors
    ws.on('error', (error) => {
      console.error(`WebSocket connection ${connectionId} error:`, error);
      this.removeConnection(connectionId);
    });

    // Handle incoming messages (for subscription management)
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(connectionId, message);
      } catch (error) {
        console.error(`Invalid message from connection ${connectionId}:`, error);
      }
    });

    return connectionId;
  }

  /**
   * Remove a WebSocket connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Unsubscribe from executions
    if (connection.executionId) {
      this.unsubscribeFromExecution(connectionId, connection.executionId);
    }

    this.connections.delete(connectionId);
  }

  /**
   * Subscribe a connection to execution events
   */
  subscribeToExecution(connectionId: string, executionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.executionId = executionId;

    if (!this.executionSubscriptions.has(executionId)) {
      this.executionSubscriptions.set(executionId, new Set());
    }

    this.executionSubscriptions.get(executionId)!.add(connectionId);
  }

  /**
   * Unsubscribe a connection from execution events
   */
  unsubscribeFromExecution(connectionId: string, executionId: string): void {
    const subscribers = this.executionSubscriptions.get(executionId);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.executionSubscriptions.delete(executionId);
      }
    }

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.executionId = undefined;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    switch (message.type) {
      case 'subscribe':
        if (message.executionId) {
          this.subscribeToExecution(connectionId, message.executionId);
          this.sendToConnection(connectionId, {
            type: 'subscribed',
            executionId: message.executionId,
            timestamp: Date.now()
          });
        }
        break;

      case 'unsubscribe':
        if (message.executionId) {
          this.unsubscribeFromExecution(connectionId, message.executionId);
          this.sendToConnection(connectionId, {
            type: 'unsubscribed',
            executionId: message.executionId,
            timestamp: Date.now()
          });
        }
        break;

      case 'ping':
        this.sendToConnection(connectionId, {
          type: 'pong',
          timestamp: Date.now()
        });
        break;
    }
  }

  /**
   * Send message to specific connection
   */
  private sendToConnection(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) return;

    try {
      connection.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send message to connection ${connectionId}:`, error);
      this.removeConnection(connectionId);
    }
  }

  /**
   * Broadcast event to all subscribers of an execution
   */
  private broadcastToExecution(executionId: string, event: ExecutionEvent): void {
    const subscribers = this.executionSubscriptions.get(executionId);
    if (!subscribers) return;

    const message = {
      type: 'execution_event',
      executionId,
      event,
      timestamp: Date.now()
    };

    for (const connectionId of subscribers) {
      this.sendToConnection(connectionId, message);
    }
  }

  // ExecutionEventEmitter interface

  emit(event: ExecutionEvent): void {
    // First emit to local event emitter for internal handling
    this.eventEmitter.emit(event.type, event);

    // Then broadcast to WebSocket subscribers
    this.broadcastToExecution(event.executionId, event);
  }

  on(eventType: string, handler: (event: ExecutionEvent) => void): void {
    this.eventEmitter.on(eventType, handler);
  }

  off(eventType: string, handler: (event: ExecutionEvent) => void): void {
    this.eventEmitter.off(eventType, handler);
  }

  getEventHistory(executionId: string): ExecutionEvent[] {
    // For now, return empty array - could be extended to store history
    return [];
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    activeSubscriptions: number;
    executionsWithSubscribers: number;
  } {
    return {
      totalConnections: this.connections.size,
      activeSubscriptions: Array.from(this.executionSubscriptions.values())
        .reduce((sum, subs) => sum + subs.size, 0),
      executionsWithSubscribers: this.executionSubscriptions.size
    };
  }

  /**
   * Clean up inactive connections
   */
  cleanupInactiveConnections(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    for (const [connectionId, connection] of this.connections) {
      if (connection.subscribedAt < cutoffTime) {
        this.removeConnection(connectionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}