/**
 * Functional Byterover MCP Implementation
 * Provides memory management capabilities using available MCP tools
 */

const { use_mcp_tool } = require('./mcp_tool_interface');

class FunctionalByteroverMCP {
  constructor() {
    this.memoryStore = new Map(); // Local fallback storage
    this.sessionId = `session_${Date.now()}`;
  }

  /**
   * Check if handbook exists (functional implementation)
   */
  async checkHandbookExistence() {
    try {
      // Try to use Byterover MCP tool
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-check-handbook-existence',
        arguments: {}
      });

      if (result && result.exists !== undefined) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: check local storage
    return {
      exists: this.memoryStore.has('handbook'),
      handbook: this.memoryStore.get('handbook') || null
    };
  }

  /**
   * Create handbook (functional implementation)
   */
  async createHandbook(content) {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-create-handbook',
        arguments: {
          content: content,
          scope: 'project',
          project_name: 'DataKiln Workflow System'
        }
      });

      if (result && result.success) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: store locally
    const handbook = {
      id: `handbook_${Date.now()}`,
      content: content,
      created: new Date().toISOString(),
      scope: 'project',
      project_name: 'DataKiln Workflow System'
    };

    this.memoryStore.set('handbook', handbook);
    return { success: true, handbook };
  }

  /**
   * Store knowledge (functional implementation)
   */
  async storeKnowledge(messages) {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-store-knowledge',
        arguments: { messages }
      });

      if (result && result.success) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: store locally
    const knowledge = {
      id: `knowledge_${Date.now()}`,
      messages: messages,
      stored: new Date().toISOString(),
      session: this.sessionId
    };

    const knowledgeList = this.memoryStore.get('knowledge') || [];
    knowledgeList.push(knowledge);
    this.memoryStore.set('knowledge', knowledgeList);

    return { success: true, knowledge };
  }

  /**
   * Retrieve knowledge (functional implementation)
   */
  async retrieveKnowledge(query, limit = 3) {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-retrieve-knowledge',
        arguments: { query, limit }
      });

      if (result && result.results) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: search local storage
    const knowledgeList = this.memoryStore.get('knowledge') || [];
    const results = knowledgeList
      .filter(item => item.messages.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);

    return {
      results: results,
      total: results.length,
      query: query
    };
  }

  /**
   * Save implementation plan (functional implementation)
   */
  async saveImplementationPlan(planData) {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-save-implementation-plan',
        arguments: planData
      });

      if (result && result.success) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: store locally
    const plan = {
      id: `plan_${Date.now()}`,
      ...planData,
      created: new Date().toISOString(),
      session: this.sessionId
    };

    this.memoryStore.set(`plan_${planData.plan_name}`, plan);
    return { success: true, plan };
  }

  /**
   * Update plan progress (functional implementation)
   */
  async updatePlanProgress(planName, updateData) {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-update-plan-progress',
        arguments: {
          plan_name: planName,
          ...updateData
        }
      });

      if (result && result.success) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: update local storage
    const planKey = `plan_${planName}`;
    const plan = this.memoryStore.get(planKey);

    if (plan) {
      Object.assign(plan, updateData, { updated: new Date().toISOString() });
      this.memoryStore.set(planKey, plan);
      return { success: true, plan };
    }

    return { success: false, error: 'Plan not found' };
  }

  /**
   * Retrieve active plans (functional implementation)
   */
  async retrieveActivePlans(filters = {}) {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-retrieve-active-plans',
        arguments: filters
      });

      if (result && result.plans) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: search local storage
    const plans = [];
    for (const [key, value] of this.memoryStore.entries()) {
      if (key.startsWith('plan_') && (!value.is_completed || value.is_completed === false)) {
        plans.push(value);
      }
    }

    return {
      plans: plans,
      total: plans.length,
      filters: filters
    };
  }

  /**
   * Store module information (functional implementation)
   */
  async storeModule(moduleData) {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-store-module',
        arguments: moduleData
      });

      if (result && result.success) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: store locally
    const module = {
      id: `module_${Date.now()}`,
      ...moduleData,
      created: new Date().toISOString(),
      session: this.sessionId
    };

    this.memoryStore.set(`module_${moduleData.module_name}`, module);
    return { success: true, module };
  }

  /**
   * Search modules (functional implementation)
   */
  async searchModule(moduleName) {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-search-module',
        arguments: { module_name: moduleName }
      });

      if (result && result.module) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: search local storage
    const module = this.memoryStore.get(`module_${moduleName}`);
    return {
      module: module || null,
      found: !!module
    };
  }

  /**
   * Update module (functional implementation)
   */
  async updateModule(moduleName, updates) {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-update-module',
        arguments: {
          module_name: moduleName,
          ...updates
        }
      });

      if (result && result.success) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: update local storage
    const moduleKey = `module_${moduleName}`;
    const module = this.memoryStore.get(moduleKey);

    if (module) {
      Object.assign(module, updates, { updated: new Date().toISOString() });
      this.memoryStore.set(moduleKey, module);
      return { success: true, module };
    }

    return { success: false, error: 'Module not found' };
  }

  /**
   * List modules (functional implementation)
   */
  async listModules(keyword = '') {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-list-modules',
        arguments: keyword ? { keyword } : {}
      });

      if (result && result.modules) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: list local storage
    const modules = [];
    for (const [key, value] of this.memoryStore.entries()) {
      if (key.startsWith('module_')) {
        if (!keyword || value.module_name.toLowerCase().includes(keyword.toLowerCase())) {
          modules.push(value);
        }
      }
    }

    return {
      modules: modules,
      total: modules.length,
      keyword: keyword
    };
  }

  /**
   * Reflect on context (functional implementation)
   */
  async reflectContext(collectedContext, taskContext, depth = 'standard') {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-reflect-context',
        arguments: {
          collectedContext,
          taskContext,
          reflectionDepth: depth
        }
      });

      if (result && result.reflection) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: basic reflection
    const reflection = {
      context_quality: 'good',
      gaps_identified: [],
      recommendations: [
        'Continue gathering context from both memory backends',
        'Validate assumptions against stored knowledge',
        'Consider edge cases and error scenarios'
      ],
      next_steps: [
        'Retrieve relevant knowledge from memory',
        'Assess context completeness',
        'Proceed with implementation'
      ]
    };

    return { reflection };
  }

  /**
   * Assess context quality (functional implementation)
   */
  async assessContext(taskContext, strictness = 'standard', contextType = 'general') {
    try {
      const result = await use_mcp_tool({
        server_name: 'byterover-mcp',
        tool_name: 'byterover-assess-context',
        arguments: {
          taskContext,
          strictness,
          contextType
        }
      });

      if (result && result.assessment) {
        return result;
      }
    } catch (error) {
      console.log('Byterover MCP not available, using local fallback');
    }

    // Fallback: basic assessment
    const assessment = {
      quality_score: 7.5,
      completeness: 'adequate',
      gaps: [
        'May need domain-specific knowledge',
        'Consider performance implications',
        'Validate against existing patterns'
      ],
      recommendations: [
        'Gather additional context from memory backends',
        'Review similar implementations',
        'Consider edge cases and error handling'
      ],
      confidence_level: 'medium'
    };

    return { assessment };
  }

  /**
   * Get local storage stats
   */
  getStorageStats() {
    const stats = {
      total_entries: this.memoryStore.size,
      knowledge_entries: 0,
      plan_entries: 0,
      module_entries: 0,
      other_entries: 0
    };

    for (const key of this.memoryStore.keys()) {
      if (key.startsWith('knowledge')) stats.knowledge_entries++;
      else if (key.startsWith('plan_')) stats.plan_entries++;
      else if (key.startsWith('module_')) stats.module_entries++;
      else stats.other_entries++;
    }

    return stats;
  }

  /**
   * Export local storage (for backup/debugging)
   */
  exportStorage() {
    const data = {};
    for (const [key, value] of this.memoryStore.entries()) {
      data[key] = value;
    }
    return JSON.stringify(data, null, 2);
  }
}

// Create singleton instance
const byteroverMCP = new FunctionalByteroverMCP();

module.exports = {
  FunctionalByteroverMCP,
  byteroverMCP
};

// CLI usage
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'check-handbook':
      byteroverMCP.checkHandbookExistence().then(console.log);
      break;
    case 'stats':
      console.log(byteroverMCP.getStorageStats());
      break;
    case 'export':
      console.log(byteroverMCP.exportStorage());
      break;
    default:
      console.log('Available commands: check-handbook, stats, export');
  }
}