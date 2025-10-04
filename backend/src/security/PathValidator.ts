import { resolve, normalize, join, relative } from 'path';
import { statSync } from 'fs';

export interface PathValidationConfig {
  allowedPaths?: string[];
  baseDirectory?: string;
  allowParentTraversal?: boolean;
  maxPathLength?: number;
  allowedExtensions?: string[];
  blockedPatterns?: RegExp[];
}

/**
 * PathValidator provides secure path validation for filesystem access.
 * Implements OWASP path traversal protection and access control.
 */
export class PathValidator {
  private config: Required<PathValidationConfig>;
  private baseDirectory: string;

  constructor(config: PathValidationConfig = {}) {
    this.config = {
      allowedPaths: [],
      baseDirectory: process.cwd(),
      allowParentTraversal: false,
      maxPathLength: 4096,
      allowedExtensions: [],
      blockedPatterns: [
        /\.\./, // Parent directory traversal
        /^\/+/i, // Absolute paths
        /[<>:"|?*]/, // Invalid filename characters
        /\x00/, // Null bytes
      ],
      ...config,
    };

    this.baseDirectory = resolve(this.config.baseDirectory);
  }

  /**
   * Validate if a path is allowed for access
   */
  isAllowed(inputPath: string): boolean {
    try {
      // Basic validation
      if (!this.isValidPath(inputPath)) {
        return false;
      }

      // Resolve the full path
      const fullPath = this.resolvePath(inputPath);

      // Check if path is within allowed boundaries
      if (!this.isWithinAllowedBoundaries(fullPath)) {
        return false;
      }

      // Check against blocked patterns
      if (this.matchesBlockedPattern(inputPath)) {
        return false;
      }

      // Check file extension if restrictions are in place
      if (this.config.allowedExtensions.length > 0) {
        if (!this.hasAllowedExtension(inputPath)) {
          return false;
        }
      }

      // Check if file exists and is accessible (optional)
      if (!this.isAccessible(fullPath)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sanitize a path for safe usage
   */
  sanitizePath(inputPath: string): string {
    // Normalize path separators
    let sanitized = normalize(inputPath);

    // Remove any null bytes
    sanitized = sanitized.replace(/\x00/g, '');

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '');

    return sanitized;
  }

  /**
   * Resolve a path relative to the base directory
   */
  resolvePath(inputPath: string): string {
    const sanitized = this.sanitizePath(inputPath);

    // If it's an absolute path, check if it's within base directory
    if (resolve(sanitized) === sanitized) {
      return resolve(sanitized);
    }

    // Resolve relative to base directory
    return resolve(this.baseDirectory, sanitized);
  }

  /**
   * Check if path is valid according to basic rules
   */
  private isValidPath(inputPath: string): boolean {
    // Check length
    if (inputPath.length > this.config.maxPathLength) {
      return false;
    }

    // Check for empty or null
    if (!inputPath || inputPath.trim() === '') {
      return false;
    }

    // Check for null bytes
    if (inputPath.includes('\x00')) {
      return false;
    }

    return true;
  }

  /**
   * Check if path is within allowed boundaries
   */
  private isWithinAllowedBoundaries(fullPath: string): boolean {
    // Check if path is within base directory
    const relativePath = relative(this.baseDirectory, fullPath);

    // If relative path starts with '..', it's outside base directory
    if (!this.config.allowParentTraversal && relativePath.startsWith('..')) {
      return false;
    }

    // Check against allowed paths if specified
    if (this.config.allowedPaths.length > 0) {
      const isInAllowedPath = this.config.allowedPaths.some(allowedPath => {
        const allowedFullPath = resolve(this.baseDirectory, allowedPath);
        return fullPath.startsWith(allowedFullPath);
      });

      if (!isInAllowedPath) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if path matches blocked patterns
   */
  private matchesBlockedPattern(inputPath: string): boolean {
    return this.config.blockedPatterns.some(pattern => pattern.test(inputPath));
  }

  /**
   * Check if file has allowed extension
   */
  private hasAllowedExtension(inputPath: string): boolean {
    const extension = this.getExtension(inputPath);
    return this.config.allowedExtensions.includes(extension);
  }

  /**
   * Check if path is accessible
   */
  private isAccessible(fullPath: string): boolean {
    try {
      statSync(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file extension from path
   */
  private getExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Add an allowed path
   */
  addAllowedPath(path: string): void {
    const resolvedPath = resolve(this.baseDirectory, path);
    this.config.allowedPaths.push(resolvedPath);
  }

  /**
   * Remove an allowed path
   */
  removeAllowedPath(path: string): void {
    const resolvedPath = resolve(this.baseDirectory, path);
    const index = this.config.allowedPaths.indexOf(resolvedPath);
    if (index > -1) {
      this.config.allowedPaths.splice(index, 1);
    }
  }

  /**
   * Get all allowed paths
   */
  getAllowedPaths(): string[] {
    return [...this.config.allowedPaths];
  }

  /**
   * Validate multiple paths
   */
  validatePaths(paths: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const path of paths) {
      if (this.isAllowed(path)) {
        valid.push(path);
      } else {
        invalid.push(path);
      }
    }

    return { valid, invalid };
  }
}