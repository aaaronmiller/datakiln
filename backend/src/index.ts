import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import { RegistryLoader } from './registry/RegistryLoader.js';
import { registryRoutes } from './routes/registry.js';
import { websocketRoutes } from './routes/websocket.js';
import { WebSocketEventStream } from './execution/websocket-event-stream.js';
import { SecurityMiddleware } from './security/SecurityMiddleware.js';

const fastify = Fastify({
  logger: true
});

// Initialize security middleware with configuration
const securityConfig = {
  rateLimiter: {
    maxTokens: 100, // 100 requests
    refillRatePerSecond: 10, // refill 10 tokens per second
  },
  domainWhitelist: {
    allowedDomains: [
      'localhost',
      '127.0.0.1',
      'datakiln.example.com', // Replace with actual domain
    ],
    allowSubdomains: true,
    allowLocalhost: true,
  },
  auditLogger: {
    logDirectory: './logs',
    enableConsole: process.env.NODE_ENV !== 'production',
  },
  pathValidation: {
    allowedPaths: [
      './data',
      './logs',
    ],
    baseDirectory: process.cwd(),
  },
  enableRateLimiting: true,
  enableDomainValidation: false, // Enable in production
  enableAuditLogging: true,
  enablePathValidation: true,
};

const securityMiddleware = new SecurityMiddleware(securityConfig);

// Register security middleware first (before other plugins)
fastify.register(securityMiddleware.getPlugin());

// Register other plugins
fastify.register(cors);
fastify.register(helmet);
fastify.register(websocket);

// Initialize registry loader
const registryLoader = new RegistryLoader();

// Initialize WebSocket event stream
const eventStream = new WebSocketEventStream();

// Register routes
fastify.register(registryRoutes, { registryLoader });
fastify.register(websocketRoutes, { eventStream });

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
      external: Math.round(process.memoryUsage().external / 1024 / 1024), // MB
    },
    services: {
      registry: 'ok',
      security: 'ok',
    }
  };

  // Check registry health
  try {
    // Basic registry connectivity check - try to load index
    await registryLoader.loadIndex();
    healthCheck.services.registry = 'ok';
  } catch (error) {
    healthCheck.services.registry = 'error';
    healthCheck.status = 'degraded';
  }

  // Check security middleware health
  try {
    // Security middleware is initialized, so it's healthy
    healthCheck.services.security = 'ok';
  } catch (error) {
    healthCheck.services.security = 'error';
    healthCheck.status = 'degraded';
  }

  // Return appropriate HTTP status
  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  reply.code(statusCode).send(healthCheck);
});

// Detailed health check endpoint for monitoring systems
fastify.get('/health/detailed', async (request, reply) => {
  const startTime = Date.now();

  const detailedHealth = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    responseTime: 0,
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime(),
      pid: process.pid,
      cwd: process.cwd(),
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024), // MB
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      external: Math.round(process.memoryUsage().external / 1024 / 1024), // MB
      arrayBuffers: Math.round(process.memoryUsage().arrayBuffers / 1024 / 1024), // MB
    },
    cpu: {
      usage: process.cpuUsage(),
    },
    services: {
      registry: { status: 'unknown', details: {} },
      security: { status: 'unknown', details: {} },
      puppeteer: { status: 'unknown', details: {} },
    },
    configuration: {
      port: process.env.PORT || 3000,
      dataDir: process.env.DATA_DIR || './data',
      logDir: process.env.LOG_DIR || './logs',
      maxWorkflows: process.env.MAX_PARALLEL_WORKFLOWS || 10,
    }
  };

  // Registry health check
  try {
    const index = await registryLoader.loadIndex();
    detailedHealth.services.registry = {
      status: 'ok',
      details: {
        templates: Object.keys(index.templates || {}).length,
        types: (index.types || []).length,
        adapters: (index.adapters || []).length
      }
    };
  } catch (error) {
    detailedHealth.services.registry = {
      status: 'error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
    detailedHealth.status = 'degraded';
  }

  // Security middleware health check
  try {
    detailedHealth.services.security = {
      status: 'ok',
      details: {
        rateLimiting: securityConfig.enableRateLimiting,
        auditLogging: securityConfig.enableAuditLogging,
        pathValidation: securityConfig.enablePathValidation,
        domainValidation: securityConfig.enableDomainValidation
      }
    };
  } catch (error) {
    detailedHealth.services.security = {
      status: 'error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
    detailedHealth.status = 'degraded';
  }

  // Puppeteer health check (basic connectivity test)
  try {
    // Import puppeteer dynamically to avoid issues if not available
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    await browser.close();

    detailedHealth.services.puppeteer = {
      status: 'ok',
      details: { message: 'Browser launch successful' }
    };
  } catch (error) {
    detailedHealth.services.puppeteer = {
      status: 'error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
    // Puppeteer failure doesn't mark overall health as degraded
  }

  // Calculate response time
  detailedHealth.responseTime = Date.now() - startTime;

  // Return appropriate HTTP status
  const statusCode = detailedHealth.status === 'ok' ? 200 : 503;
  reply.code(statusCode).send(detailedHealth);
});

// Readiness probe endpoint
fastify.get('/health/ready', async (request, reply) => {
  // Check if all critical services are ready
  const readiness = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      registry: false,
      security: true, // Security is always ready once initialized
    }
  };

  // Check registry readiness
  try {
    await registryLoader.loadIndex();
    readiness.checks.registry = true;
  } catch (error) {
    readiness.status = 'not ready';
  }

  const statusCode = readiness.status === 'ready' ? 200 : 503;
  reply.code(statusCode).send(readiness);
});

// Liveness probe endpoint
fastify.get('/health/live', async (request, reply) => {
  // Simple liveness check - if server is responding, it's alive
  reply.send({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Graceful shutdown
const closeGracefully = async (signal: string) => {
  console.log(`Received signal ${signal}, closing gracefully`);
  securityMiddleware.close();
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Data Kiln Backend listening on http://localhost:3001');
    console.log('Security controls enabled: Rate limiting, Audit logging, Path validation');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();