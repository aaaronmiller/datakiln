import { FastifyPluginAsync } from 'fastify';
import { RegistryLoader } from '../registry/RegistryLoader.js';

interface RegistryRoutesOptions {
  registryLoader: RegistryLoader;
}

export const registryRoutes: FastifyPluginAsync<RegistryRoutesOptions> = async (fastify, options) => {
  const { registryLoader } = options;

  // GET /registry/templates - List all templates by category
  fastify.get('/registry/templates', async (request: any, reply: any) => {
    try {
      const index = await registryLoader.loadIndex();
      const templates: Record<string, any[]> = {};

      for (const [category, files] of Object.entries(index.templates)) {
        templates[category] = [];
        for (const file of files as string[]) {
          const templateName = file.replace('.json', '');
          const templateId = `dk://templates/${category}/${templateName}`;
          try {
            const template = await registryLoader.loadTemplate(templateId);
            templates[category].push({
              id: template.template_id,
              name: template.metadata.name,
              description: template.metadata.description,
              version: template.version,
              category: template.metadata.category
            });
          } catch (error) {
            fastify.log.warn(`Failed to load template ${templateId}:`, error as any);
          }
        }
      }

      return { templates };
    } catch (error) {
      fastify.log.error('Error loading templates:', error as any);
      return reply.code(500).send({ error: 'Failed to load templates' });
    }
  });

  // GET /registry/templates/:category - List templates in a specific category
  fastify.get('/registry/templates/:category', async (request: any, reply: any) => {
    const { category } = request.params as { category: string };

    try {
      const templates = await registryLoader.getTemplatesByCategory(category);
      return {
        category,
        templates: templates.map((template: any) => ({
          id: template.template_id,
          name: template.metadata.name,
          description: template.metadata.description,
          version: template.version,
          category: template.metadata.category
        }))
      };
    } catch (error) {
      fastify.log.error(`Error loading templates for category ${category}:`, error as any);
      return reply.code(500).send({ error: `Failed to load templates for category ${category}` });
    }
  });

  // GET /registry/templates/:category/:templateId - Get a specific template
  fastify.get('/registry/templates/:category/:templateId', async (request: any, reply: any) => {
    const { category, templateId } = request.params as { category: string; templateId: string };
    const fullTemplateId = `dk://templates/${category}/${templateId}`;

    try {
      const template = await registryLoader.loadTemplate(fullTemplateId);
      return { template };
    } catch (error) {
      fastify.log.error(`Error loading template ${fullTemplateId}:`, error as any);
      return reply.code(404).send({ error: 'Template not found' });
    }
  });

  // GET /registry/types - List all types
  fastify.get('/registry/types', async (request: any, reply: any) => {
    try {
      const types = await registryLoader.getAllTypes();
      return {
        types: types.map((type: any) => ({
          id: type.type_id,
          version: type.version,
          schema: type.schema
        }))
      };
    } catch (error) {
      fastify.log.error('Error loading types:', error as any);
      return reply.code(500).send({ error: 'Failed to load types' });
    }
  });

  // GET /registry/types/:typeId - Get a specific type
  fastify.get('/registry/types/:typeId', async (request: any, reply: any) => {
    const { typeId } = request.params as { typeId: string };
    const fullTypeId = `dk://types/${typeId}`;

    try {
      const type = await registryLoader.loadType(fullTypeId);
      return { type };
    } catch (error) {
      fastify.log.error(`Error loading type ${fullTypeId}:`, error as any);
      return reply.code(404).send({ error: 'Type not found' });
    }
  });

  // GET /registry/adapters - List all adapters
  fastify.get('/registry/adapters', async (request: any, reply: any) => {
    try {
      const adapters = await registryLoader.getAllAdapters();
      return {
        adapters: adapters.map((adapter: any) => ({
          id: adapter.adapter_id,
          name: adapter.metadata.name,
          description: adapter.metadata.description,
          version: adapter.selector_version,
          provider: adapter.metadata.provider_url
        }))
      };
    } catch (error) {
      fastify.log.error('Error loading adapters:', error as any);
      return reply.code(500).send({ error: 'Failed to load adapters' });
    }
  });

  // GET /registry/adapters/:provider/:surface - Get a specific adapter
  fastify.get('/registry/adapters/:provider/:surface', async (request: any, reply: any) => {
    const { provider, surface } = request.params as { provider: string; surface: string };
    const adapterId = `dk://adapter/${provider}/${surface}`;

    try {
      const adapter = await registryLoader.loadAdapter(adapterId);
      return { adapter };
    } catch (error) {
      fastify.log.error(`Error loading adapter ${adapterId}:`, error as any);
      return reply.code(404).send({ error: 'Adapter not found' });
    }
  });

  // GET /registry/index - Get the registry index
  fastify.get('/registry/index', async (request: any, reply: any) => {
    try {
      const index = await registryLoader.loadIndex();
      return { index };
    } catch (error) {
      fastify.log.error('Error loading registry index:', error as any);
      return reply.code(500).send({ error: 'Failed to load registry index' });
    }
  });
};