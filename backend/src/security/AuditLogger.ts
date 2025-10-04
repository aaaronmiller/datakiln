import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEvent {
  timestamp: string;
  correlationId: string;
  eventType: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource: string;
  action: string;
  outcome: 'success' | 'failure' | 'denied';
  details?: Record<string, any>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

export interface AuditLoggerOptions {
  logDirectory?: string;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  enableConsole?: boolean;
  structured?: boolean;
}

/**
 * AuditLogger provides structured JSON logging with correlation IDs for security auditing.
 * Implements comprehensive audit logging for all operations as per Data Kiln v40.0.
 */
export class AuditLogger {
  private logStream: WriteStream | null = null;
  private currentLogFile: string = '';
  private options: Required<AuditLoggerOptions>;

  constructor(options: AuditLoggerOptions = {}) {
    this.options = {
      logDirectory: options.logDirectory || './logs',
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles || 10,
      enableConsole: options.enableConsole ?? true,
      structured: options.structured ?? true,
    };

    this.initializeLogStream();
  }

  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'timestamp' | 'correlationId'> & { correlationId?: string }): void {
    const auditEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      correlationId: event.correlationId || this.generateCorrelationId(),
      ...event,
    };

    this.writeLog(auditEvent);
  }

  /**
   * Log a security violation
   */
  logSecurityViolation(
    resource: string,
    action: string,
    details: Record<string, any>,
    correlationId?: string,
    userId?: string
  ): void {
    this.log({
      correlationId,
      eventType: 'security_violation',
      userId,
      resource,
      action,
      outcome: 'denied',
      details,
    });
  }

  /**
   * Log an authentication event
   */
  logAuthentication(
    outcome: 'success' | 'failure',
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>,
    correlationId?: string
  ): void {
    this.log({
      correlationId,
      eventType: 'authentication',
      userId,
      ipAddress,
      userAgent,
      resource: 'auth',
      action: 'login',
      outcome,
      details,
    });
  }

  /**
   * Log an authorization event
   */
  logAuthorization(
    resource: string,
    action: string,
    outcome: 'success' | 'denied',
    userId?: string,
    details?: Record<string, any>,
    correlationId?: string
  ): void {
    this.log({
      correlationId,
      eventType: 'authorization',
      userId,
      resource,
      action,
      outcome,
      details,
    });
  }

  /**
   * Log a data access event
   */
  logDataAccess(
    resource: string,
    action: string,
    userId?: string,
    details?: Record<string, any>,
    correlationId?: string
  ): void {
    this.log({
      correlationId,
      eventType: 'data_access',
      userId,
      resource,
      action,
      outcome: 'success',
      details,
    });
  }

  /**
   * Log a system event
   */
  logSystemEvent(
    eventType: string,
    resource: string,
    action: string,
    details?: Record<string, any>,
    correlationId?: string
  ): void {
    this.log({
      correlationId,
      eventType: `system_${eventType}`,
      resource,
      action,
      outcome: 'success',
      details,
    });
  }

  /**
   * Log an error event
   */
  logError(
    resource: string,
    action: string,
    error: Error,
    userId?: string,
    correlationId?: string
  ): void {
    this.log({
      correlationId,
      eventType: 'error',
      userId,
      resource,
      action,
      outcome: 'failure',
      error: {
        message: error.message,
        code: (error as any).code,
        stack: error.stack,
      },
    });
  }

  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Get current correlation ID from request context (if available)
   */
  static getCorrelationId(request?: any): string | undefined {
    return request?.headers?.['x-correlation-id'] ||
           request?.correlationId ||
           (global as any).correlationId;
  }

  /**
   * Set correlation ID in request context
   */
  static setCorrelationId(request: any, correlationId: string): void {
    if (request) {
      request.correlationId = correlationId;
      if (request.headers) {
        request.headers['x-correlation-id'] = correlationId;
      }
    }
    (global as any).correlationId = correlationId;
  }

  /**
   * Close the logger and cleanup resources
   */
  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }

  /**
   * Initialize the log stream
   */
  private initializeLogStream(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentLogFile = join(this.options.logDirectory, `audit-${timestamp}.log`);

    this.logStream = createWriteStream(this.currentLogFile, {
      flags: 'a',
      encoding: 'utf8',
    });

    this.logStream.on('error', (error) => {
      console.error('AuditLogger stream error:', error);
    });
  }

  /**
   * Write log entry
   */
  private writeLog(event: AuditEvent): void {
    try {
      const logEntry = this.options.structured
        ? JSON.stringify(event) + '\n'
        : this.formatLogEntry(event);

      if (this.logStream) {
        this.logStream.write(logEntry);
      }

      if (this.options.enableConsole) {
        console.log(`[AUDIT] ${event.eventType}: ${event.resource} ${event.action} - ${event.outcome}`);
      }
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Format log entry for non-structured output
   */
  private formatLogEntry(event: AuditEvent): string {
    const timestamp = event.timestamp;
    const correlationId = event.correlationId;
    const eventType = event.eventType;
    const userId = event.userId || 'anonymous';
    const resource = event.resource;
    const action = event.action;
    const outcome = event.outcome;

    return `${timestamp} [${correlationId}] ${eventType} ${userId} ${resource} ${action} ${outcome}\n`;
  }
}