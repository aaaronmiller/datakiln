import { FastifyPluginAsync } from 'fastify';
import { RateLimiter } from '../adapters/rateLimiter.js';
import { DomainWhitelist } from './DomainWhitelist.js';
import { AuditLogger } from './AuditLogger.js';
import { PathValidator } from './PathValidator.js';

export interface SecurityConfig {
  rateLimiter?: {
    maxTokens?: number;
    refillRatePerSecond?: number;
  };
  domainWhitelist?: {
    allowedDomains?: string[];
    allowSubdomains?: boolean;
    allowLocalhost?: boolean;
  };
  auditLogger?: {
    logDirectory?: string;
    enableConsole?: boolean;
  };
  pathValidation?: {
    allowedPaths?: string[];
    baseDirectory?: string;
  };
  enableRateLimiting?: boolean;
  enableDomainValidation?: boolean;
  enableAuditLogging?: boolean;
  enablePathValidation?: boolean;
}

/**
 * SecurityMiddleware provides comprehensive security controls for Fastify applications.
 * Implements OWASP-aligned security patterns including rate limiting, domain whitelisting,
 * audit logging, and path validation as per Data Kiln v40.0 specifications.
 */
export class SecurityMiddleware {
  private rateLimiter: RateLimiter;
  private domainWhitelist: DomainWhitelist;
  private auditLogger: AuditLogger;
  private pathValidator: PathValidator;
  private config: Required<SecurityConfig>;

  constructor(config: SecurityConfig = {}) {
    this.config = {
      rateLimiter: {
        maxTokens: 100,
        refillRatePerSecond: 10,
        ...config.rateLimiter,
      },
      domainWhitelist: {
        allowedDomains: [],
        allowSubdomains: true,
        allowLocalhost: false,
        ...config.domainWhitelist,
      },
      auditLogger: {
        logDirectory: './logs',
        enableConsole: true,
        ...config.auditLogger,
      },
      pathValidation: {
        allowedPaths: [],
        baseDirectory: process.cwd(),
        ...config.pathValidation,
      },
      enableRateLimiting: true,
      enableDomainValidation: false,
      enableAuditLogging: true,
      enablePathValidation: false,
      ...config,
    };

    // Initialize security components
    this.rateLimiter = new RateLimiter(
      this.config.rateLimiter.maxTokens,
      this.config.rateLimiter.refillRatePerSecond
    );

    this.domainWhitelist = new DomainWhitelist(
      this.config.domainWhitelist.allowedDomains,
      {
        allowSubdomains: this.config.domainWhitelist.allowSubdomains,
        allowLocalhost: this.config.domainWhitelist.allowLocalhost,
      }
    );

    this.auditLogger = new AuditLogger(this.config.auditLogger);
    this.pathValidator = new PathValidator(this.config.pathValidation);
  }

  /**
   * Get the Fastify plugin for security middleware
   */
  getPlugin(): FastifyPluginAsync {
    return async (fastify, opts) => {
      // Add correlation ID to all requests
      fastify.addHook('onRequest', async (request, reply) => {
        const correlationId = request.headers['x-correlation-id'] as string ||
                             this.auditLogger.generateCorrelationId();

        AuditLogger.setCorrelationId(request, correlationId);
        reply.header('x-correlation-id', correlationId);
      });

      // Rate limiting hook
      if (this.config.enableRateLimiting) {
        fastify.addHook('onRequest', async (request, reply) => {
          const clientId = this.getClientIdentifier(request);
          const allowed = await this.rateLimiter.checkLimit(clientId);

          if (!allowed) {
            this.auditLogger.logSecurityViolation(
              'api',
              'rate_limit_exceeded',
              {
                clientId,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
              },
              AuditLogger.getCorrelationId(request)
            );

            reply.code(429).send({
              error: 'Too Many Requests',
              message: 'Rate limit exceeded. Please try again later.',
            });
            return;
          }

          await this.rateLimiter.recordRequest(clientId);
        });
      }

      // Domain validation hook
      if (this.config.enableDomainValidation) {
        fastify.addHook('onRequest', async (request, reply) => {
          const origin = request.headers.origin || request.headers.referer;

          if (origin && !this.domainWhitelist.isAllowed(origin)) {
            this.auditLogger.logSecurityViolation(
              'api',
              'domain_not_allowed',
              {
                origin,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
              },
              AuditLogger.getCorrelationId(request)
            );

            reply.code(403).send({
              error: 'Forbidden',
              message: 'Domain not allowed.',
            });
            return;
          }
        });
      }

      // Path validation hook for filesystem operations
      if (this.config.enablePathValidation) {
        fastify.addHook('onRequest', async (request, reply) => {
          // Check if request involves file operations
          if (this.isFileOperation(request)) {
            const pathParam = this.extractPathFromRequest(request);

            if (pathParam && !this.pathValidator.isAllowed(pathParam)) {
              this.auditLogger.logSecurityViolation(
                'filesystem',
                'path_not_allowed',
                {
                  path: pathParam,
                  ipAddress: request.ip,
                  userAgent: request.headers['user-agent'],
                },
                AuditLogger.getCorrelationId(request)
              );

              reply.code(403).send({
                error: 'Forbidden',
                message: 'Path not allowed.',
              });
              return;
            }
          }
        });
      }

      // Audit logging hook
      if (this.config.enableAuditLogging) {
        fastify.addHook('onRequest', async (request, reply) => {
          this.auditLogger.logDataAccess(
            request.url,
            request.method,
            undefined, // userId - would come from auth middleware
            {
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
              query: request.query,
              params: request.params,
            },
            AuditLogger.getCorrelationId(request)
          );
        });

        fastify.addHook('onResponse', async (request, reply) => {
          this.auditLogger.log({
            eventType: 'api_response',
            resource: request.url,
            action: request.method,
            outcome: reply.statusCode < 400 ? 'success' : 'failure',
            details: {
              statusCode: reply.statusCode,
              responseTime: reply.getResponseTime(),
            },
            correlationId: AuditLogger.getCorrelationId(request),
          });
        });

        fastify.addHook('onError', async (request, reply, error) => {
          this.auditLogger.logError(
            request.url,
            request.method,
            error,
            undefined, // userId
            AuditLogger.getCorrelationId(request)
          );
        });
      }
    };
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(request: any): string {
    // Use IP address as primary identifier
    // In production, you might want to use API keys, user IDs, etc.
    return request.ip || 'unknown';
  }

  /**
   * Check if request involves file operations
   */
  private isFileOperation(request: any): boolean {
    // Check URL patterns that might involve file operations
    const fileOperationPatterns = [
      /\/files?\//,
      /\/upload/,
      /\/download/,
      /\/registry/, // Registry operations might involve file access
    ];

    return fileOperationPatterns.some(pattern => pattern.test(request.url));
  }

  /**
   * Extract path from request for validation
   */
  private extractPathFromRequest(request: any): string | null {
    // Extract path from query parameters, body, or URL
    const pathSources = [
      request.query?.path,
      request.body?.path,
      request.params?.path,
      request.query?.file,
      request.body?.file,
    ];

    for (const path of pathSources) {
      if (path && typeof path === 'string') {
        return path;
      }
    }

    return null;
  }

  /**
   * Get security components for external access
   */
  getComponents() {
    return {
      rateLimiter: this.rateLimiter,
      domainWhitelist: this.domainWhitelist,
      auditLogger: this.auditLogger,
      pathValidator: this.pathValidator,
    };
  }

  /**
   * Close all security components
   */
  close(): void {
    this.auditLogger.close();
  }
}