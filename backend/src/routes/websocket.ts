import { FastifyInstance } from 'fastify';
import { WebSocketEventStream } from '../execution/websocket-event-stream.js';

interface WebSocketRoutesOptions {
  eventStream: WebSocketEventStream;
}

export async function websocketRoutes(
  fastify: FastifyInstance,
  options: WebSocketRoutesOptions
) {
  const { eventStream } = options;

  // WebSocket endpoint for execution monitoring
  fastify.get('/executions/:executionId/events', { websocket: true }, (connection, req) => {
    const { executionId } = req.params as { executionId: string };

    // Add connection to event stream
    const connectionId = eventStream.addConnection(connection, executionId);

    // Handle connection close
    connection.on('close', () => {
      eventStream.removeConnection(connectionId);
    });
  });

  // WebSocket endpoint for general workflow events (no specific execution)
  fastify.get('/workflows/events', { websocket: true }, (connection, req) => {
    // Add connection without specific execution ID
    const connectionId = eventStream.addConnection(connection);

    // Handle connection close
    connection.on('close', () => {
      eventStream.removeConnection(connectionId);
    });
  });

  // REST endpoint to get event stream statistics
  fastify.get('/executions/events/stats', async (request, reply) => {
    const stats = eventStream.getStats();
    return reply.send(stats);
  });

  // REST endpoint to get execution event history
  fastify.get('/executions/:executionId/events/history', async (request, reply) => {
    const { executionId } = request.params as { executionId: string };
    const history = eventStream.getEventHistory(executionId);
    return reply.send({ events: history });
  });
}