import * as fs from 'fs-extra';
import * as path from 'path';
import { Adapter } from '../types/adapters.js';

const ADAPTERS_DIR = path.join(process.cwd(), 'data', 'adapters');

export class AdapterLoader {
  private cache: Map<string, Adapter> = new Map();

  /**
   * Load an adapter by its ID with caching
   */
  async load(adapterId: string): Promise<Adapter> {
    // Check cache first
    if (this.cache.has(adapterId)) {
      return this.cache.get(adapterId)!;
    }

    // Parse adapter ID
    const match = adapterId.match(/^dk:\/\/adapter\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid adapter ID: ${adapterId}`);
    }

    const [, provider, surface] = match;
    const filepath = path.join(ADAPTERS_DIR, provider, `${surface}.json`);

    // Check if file exists
    if (!await fs.pathExists(filepath)) {
      throw new Error(`Adapter file not found: ${filepath}`);
    }

    // Load and parse
    const data = await fs.readFile(filepath, 'utf-8');
    let adapter: Adapter;

    try {
      adapter = JSON.parse(data);
    } catch (error) {
      throw new Error(`Invalid JSON in adapter file ${filepath}: ${error}`);
    }

    // Validate
    this.validate(adapter);

    // Cache and return
    this.cache.set(adapterId, adapter);
    return adapter;
  }

  /**
   * Clear the adapter cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get all cached adapters
   */
  getCachedAdapters(): Map<string, Adapter> {
    return new Map(this.cache);
  }

  /**
   * Validate adapter structure
   */
  private validate(adapter: any): void {
    // Validate required fields
    if (!adapter.adapter_id || typeof adapter.adapter_id !== 'string') {
      throw new Error('Invalid adapter: missing or invalid adapter_id');
    }

    if (!adapter.selector_version || typeof adapter.selector_version !== 'string') {
      throw new Error('Invalid adapter: missing or invalid selector_version');
    }

    if (!adapter.metadata || typeof adapter.metadata !== 'object') {
      throw new Error('Invalid adapter: missing or invalid metadata');
    }

    if (!adapter.capabilities || typeof adapter.capabilities !== 'object') {
      throw new Error('Invalid adapter: missing or invalid capabilities');
    }

    if (!adapter.navigation || typeof adapter.navigation !== 'object') {
      throw new Error('Invalid adapter: missing or invalid navigation');
    }

    // Validate metadata
    const metadata = adapter.metadata;
    if (!metadata.name || !metadata.description || !metadata.author || !metadata.provider_url || !metadata.tested_on) {
      throw new Error('Invalid adapter metadata: missing required fields');
    }

    // Validate capabilities
    for (const [name, cap] of Object.entries(adapter.capabilities)) {
      if (!cap || typeof cap !== 'object') {
        throw new Error(`Invalid capability ${name}: not an object`);
      }

      const capability = cap as any;
      if (!capability.selector || typeof capability.selector !== 'string') {
        throw new Error(`Capability ${name} missing selector`);
      }

      if (!['css', 'xpath', 'text'].includes(capability.selector_type)) {
        throw new Error(`Capability ${name} has invalid selector_type: ${capability.selector_type}`);
      }

      if (!capability.wait || typeof capability.wait !== 'object') {
        throw new Error(`Capability ${name} missing or invalid wait configuration`);
      }

      if (typeof capability.wait.timeout_ms !== 'number' || capability.wait.timeout_ms <= 0) {
        throw new Error(`Capability ${name} has invalid timeout_ms`);
      }
    }

    // Validate navigation
    const navigation = adapter.navigation;
    if (!navigation.base_url || typeof navigation.base_url !== 'string') {
      throw new Error('Invalid navigation: missing or invalid base_url');
    }

    // Validate known_issues if present
    if (adapter.known_issues) {
      if (!Array.isArray(adapter.known_issues)) {
        throw new Error('Invalid known_issues: must be an array');
      }

      for (const issue of adapter.known_issues) {
        if (!issue.description || typeof issue.description !== 'string') {
          throw new Error('Invalid known_issue: missing or invalid description');
        }
      }
    }
  }
}