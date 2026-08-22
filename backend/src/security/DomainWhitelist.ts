import { URL } from 'url';

/**
 * DomainWhitelist provides URL validation against a configurable whitelist of allowed domains.
 * Implements OWASP-aligned domain whitelisting for web requests.
 */
export class DomainWhitelist {
  private allowedDomains: Set<string>;
  private allowSubdomains: boolean;
  private allowLocalhost: boolean;

  constructor(
    allowedDomains: string[] = [],
    options: {
      allowSubdomains?: boolean;
      allowLocalhost?: boolean;
    } = {}
  ) {
    this.allowedDomains = new Set(allowedDomains.map(domain => domain.toLowerCase()));
    this.allowSubdomains = options.allowSubdomains ?? true;
    this.allowLocalhost = options.allowLocalhost ?? false;
  }

  /**
   * Validate if a URL's domain is in the whitelist
   */
  isAllowed(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      // Handle localhost specially
      if (this.allowLocalhost && this.isLocalhost(parsedUrl.hostname)) {
        return true;
      }

      const hostname = parsedUrl.hostname.toLowerCase();

      // Check exact domain match
      if (this.allowedDomains.has(hostname)) {
        return true;
      }

      // Check subdomain match if enabled
      if (this.allowSubdomains) {
        for (const allowedDomain of this.allowedDomains) {
          if (hostname.endsWith('.' + allowedDomain)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      // Invalid URL format
      return false;
    }
  }

  /**
   * Add a domain to the whitelist
   */
  addDomain(domain: string): void {
    this.allowedDomains.add(domain.toLowerCase());
  }

  /**
   * Remove a domain from the whitelist
   */
  removeDomain(domain: string): void {
    this.allowedDomains.delete(domain.toLowerCase());
  }

  /**
   * Get all allowed domains
   */
  getAllowedDomains(): string[] {
    return Array.from(this.allowedDomains);
  }

  /**
   * Clear all allowed domains
   */
  clear(): void {
    this.allowedDomains.clear();
  }

  /**
   * Check if hostname is localhost
   */
  private isLocalhost(hostname: string): boolean {
    const normalized = hostname.toLowerCase();
    return normalized === 'localhost' ||
           normalized === '127.0.0.1' ||
           normalized === '[::1]' ||
           normalized === '::1' ||
           /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized);
  }

  /**
   * Validate multiple URLs
   */
  validateUrls(urls: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const url of urls) {
      if (this.isAllowed(url)) {
        valid.push(url);
      } else {
        invalid.push(url);
      }
    }

    return { valid, invalid };
  }
}