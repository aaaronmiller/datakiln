import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import {
  Template,
  TypeDefinition,
  Adapter,
  RegistryIndex
} from '../types/registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RegistryLoader {
  private cache: Map<string, any> = new Map();
  private index: RegistryIndex | null = null;
  private ajv: any;
  private registryPath: string;

  constructor(registryPath: string = path.join(__dirname, '../../data/registry')) {
    this.registryPath = registryPath;
    this.ajv = new (Ajv as any)({ allErrors: true });
  }

  /**
   * Load the registry index
   */
  async loadIndex(): Promise<RegistryIndex> {
    if (this.index) {
      return this.index;
    }

    const indexPath = path.join(this.registryPath, 'index.json');
    const indexData = await fs.readFile(indexPath, 'utf-8');
    this.index = JSON.parse(indexData);
    return this.index!;
  }

  /**
   * Load a template by ID
   */
  async loadTemplate(templateId: string): Promise<Template> {
    const cacheKey = `template:${templateId}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Parse template ID to get file path
    const match = templateId.match(/^dk:\/\/templates\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid template ID: ${templateId}`);
    }

    const [, category, templateName] = match;
    const filePath = path.join(this.registryPath, 'templates', category, `${templateName}.json`);

    if (!await fs.pathExists(filePath)) {
      throw new Error(`Template file not found: ${filePath}`);
    }

    const templateData = await fs.readFile(filePath, 'utf-8');
    const template: Template = JSON.parse(templateData);

    // Validate template structure
    this.validateTemplate(template);

    // Cache and return
    this.cache.set(cacheKey, template);
    return template;
  }

  /**
   * Load a type definition by ID
   */
  async loadType(typeId: string): Promise<TypeDefinition> {
    const cacheKey = `type:${typeId}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Parse type ID to get file path
    const match = typeId.match(/^dk:\/\/types\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid type ID: ${typeId}`);
    }

    const typeName = match[1];
    const filePath = path.join(this.registryPath, 'types', `${typeName}.json`);

    if (!await fs.pathExists(filePath)) {
      throw new Error(`Type file not found: ${filePath}`);
    }

    const typeData = await fs.readFile(filePath, 'utf-8');
    const typeDef: TypeDefinition = JSON.parse(typeData);

    // Validate type structure
    this.validateType(typeDef);

    // Cache and return
    this.cache.set(cacheKey, typeDef);
    return typeDef;
  }

  /**
   * Load an adapter by ID
   */
  async loadAdapter(adapterId: string): Promise<Adapter> {
    const cacheKey = `adapter:${adapterId}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Parse adapter ID to get file path
    const match = adapterId.match(/^dk:\/\/adapter\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid adapter ID: ${adapterId}`);
    }

    const [, provider, surface] = match;
    const filePath = path.join(this.registryPath, 'adapters', provider, `${surface}.json`);

    if (!await fs.pathExists(filePath)) {
      throw new Error(`Adapter file not found: ${filePath}`);
    }

    const adapterData = await fs.readFile(filePath, 'utf-8');
    const adapter: Adapter = JSON.parse(adapterData);

    // Validate adapter structure
    this.validateAdapter(adapter);

    // Cache and return
    this.cache.set(cacheKey, adapter);
    return adapter;
  }

  /**
   * Get all templates by category
   */
  async getTemplatesByCategory(category: string): Promise<Template[]> {
    const index = await this.loadIndex();
    const templateFiles = index.templates[category] || [];

    const templates: Template[] = [];
    for (const file of templateFiles) {
      const templateName = file.replace('.json', '');
      const templateId = `dk://templates/${category}/${templateName}`;
      try {
        const template = await this.loadTemplate(templateId);
        templates.push(template);
      } catch (error) {
        console.warn(`Failed to load template ${templateId}:`, error);
      }
    }

    return templates;
  }

  /**
   * Get all types
   */
  async getAllTypes(): Promise<TypeDefinition[]> {
    const index = await this.loadIndex();
    const types: TypeDefinition[] = [];

    for (const file of index.types) {
      const typeName = file.replace('.json', '');
      const typeId = `dk://types/${typeName}`;
      try {
        const typeDef = await this.loadType(typeId);
        types.push(typeDef);
      } catch (error) {
        console.warn(`Failed to load type ${typeId}:`, error);
      }
    }

    return types;
  }

  /**
   * Get all adapters
   */
  async getAllAdapters(): Promise<Adapter[]> {
    const index = await this.loadIndex();
    const adapters: Adapter[] = [];

    for (const file of index.adapters) {
      // Assuming adapter files are named like provider-surface.json
      const [provider, surface] = file.replace('.json', '').split('-');
      const adapterId = `dk://adapter/${provider}/${surface}`;
      try {
        const adapter = await this.loadAdapter(adapterId);
        adapters.push(adapter);
      } catch (error) {
        console.warn(`Failed to load adapter ${adapterId}:`, error);
      }
    }

    return adapters;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.index = null;
  }

  /**
   * Validate template structure
   */
  private validateTemplate(template: Template): void {
    if (!template.template_id || !template.version || !template.metadata) {
      throw new Error('Invalid template: missing required fields');
    }

    if (!template.metadata.name || !template.metadata.category) {
      throw new Error('Invalid template metadata: missing required fields');
    }

    // Validate template ID format
    if (!template.template_id.startsWith('dk://templates/')) {
      throw new Error('Invalid template ID format');
    }
  }

  /**
   * Validate type definition structure
   */
  private validateType(typeDef: TypeDefinition): void {
    if (!typeDef.type_id || !typeDef.version || !typeDef.schema) {
      throw new Error('Invalid type definition: missing required fields');
    }

    // Validate type ID format
    if (!typeDef.type_id.startsWith('dk://types/')) {
      throw new Error('Invalid type ID format');
    }
  }

  /**
   * Validate adapter structure
   */
  private validateAdapter(adapter: Adapter): void {
    if (!adapter.adapter_id || !adapter.selector_version || !adapter.metadata) {
      throw new Error('Invalid adapter: missing required fields');
    }

    if (!adapter.capabilities || typeof adapter.capabilities !== 'object') {
      throw new Error('Invalid adapter: capabilities must be an object');
    }

    // Validate adapter ID format
    if (!adapter.adapter_id.startsWith('dk://adapter/')) {
      throw new Error('Invalid adapter ID format');
    }
  }
}