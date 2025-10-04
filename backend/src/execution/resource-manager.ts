import {
  ResourceManager as IResourceManager,
  CapabilityBudget,
  ResourceAllocation,
  ResourceLimits,
  ResourceUsage,
  ResourceRequirements
} from '../types/execution.js';

/**
 * Resource Manager for enforcing capability budgets and resource limits
 */
export class ResourceManager implements IResourceManager {
  private activeAllocations: Map<string, ResourceAllocation> = new Map();
  private capabilityBudgets: Map<string, CapabilityBudget> = new Map();
  private resourceUsage: Map<string, ResourceUsage> = new Map();

  /**
   * Allocate resources for a node execution
   */
  async allocate(nodeId: string, requirements: ResourceRequirements, patternId?: string): Promise<boolean> {
    // Check if resources are available
    const available = this.checkAvailability(requirements);
    if (!available) {
      return false;
    }

    // Create allocation
    const allocation: ResourceAllocation = {
      resourceType: requirements.type || 'node_execution',
      amount: requirements.amount || 1,
      nodeId,
      patternId,
      allocatedAt: Date.now(),
      requirements
    };

    this.activeAllocations.set(nodeId, allocation);

    // Update resource usage
    this.updateResourceUsage(requirements, true);

    return true;
  }

  /**
   * Deallocate resources for a node
   */
  async deallocate(nodeId: string): Promise<void> {
    const allocation = this.activeAllocations.get(nodeId);
    if (allocation) {
      this.activeAllocations.delete(nodeId);
      this.updateResourceUsage(allocation.requirements, false);
    }
  }

  /**
   * Set capability budget for an execution context
   */
  async setCapabilityBudget(executionId: string, budget: CapabilityBudget): Promise<void> {
    this.capabilityBudgets.set(executionId, budget);
  }

  /**
   * Get current resource usage
   */
  async getUsage(): Promise<Record<string, ResourceUsage>> {
    const usage: ResourceUsage = {
      resourceType: 'global',
      currentUsage: 0,
      peakUsage: 0,
      allocationHistory: Array.from(this.activeAllocations.values()),
      browserContexts: 0,
      concurrentNodes: 0,
      memoryUsage: 0,
      activeAllocations: this.activeAllocations.size,
      resourceLimits: {}
    };

    // Count active browser contexts
    for (const allocation of this.activeAllocations.values()) {
      if (allocation.requirements.browserContexts) {
        usage.browserContexts += allocation.requirements.browserContexts;
      }
      if (allocation.requirements.memory) {
        usage.memoryUsage += allocation.requirements.memory;
      }
    }

    usage.concurrentNodes = this.activeAllocations.size;
    usage.currentUsage = usage.activeAllocations || 0;

    return { global: usage };
  }

  /**
   * Check if resources are available for allocation
   */
  async checkAvailability(requirements: ResourceRequirements): Promise<boolean> {
    return this.checkResourceAvailability(requirements);
  }

  /**
   * Update resource usage tracking
   */
  private updateResourceUsage(requirements: any, allocate: boolean): void {
    const multiplier = allocate ? 1 : -1;

    // Update global usage
    const globalUsage = this.resourceUsage.get('global') || {
      resourceType: 'global',
      currentUsage: 0,
      peakUsage: 0,
      allocationHistory: [],
      browserContexts: 0,
      concurrentNodes: 0,
      memoryUsage: 0,
      activeAllocations: 0,
      resourceLimits: {}
    };

    if (requirements.browserContexts) {
      globalUsage.browserContexts = (globalUsage.browserContexts || 0) + requirements.browserContexts * multiplier;
    }

    if (requirements.memory) {
      globalUsage.memoryUsage = (globalUsage.memoryUsage || 0) + requirements.memory * multiplier;
    }

    globalUsage.concurrentNodes = (globalUsage.concurrentNodes || 0) + multiplier;
    globalUsage.activeAllocations = (globalUsage.activeAllocations || 0) + multiplier;

    this.resourceUsage.set('global', globalUsage);
  }

  /**
   * Enforce capability budgets
   */
  async enforceBudgets(budget: CapabilityBudget): Promise<void> {
    // Check current usage against budget
    const currentUsage = await this.getUsage();
    const globalUsage = currentUsage.global;

    // Enforce browser contexts limit
    if ((globalUsage.browserContexts || 0) > budget.browserContexts) {
      throw new Error(`Browser contexts budget exceeded: ${globalUsage.browserContexts || 0}/${budget.browserContexts}`);
    }

    // Enforce concurrent nodes limit
    if ((globalUsage.concurrentNodes || 0) > budget.concurrentNodes) {
      throw new Error(`Concurrent nodes budget exceeded: ${globalUsage.concurrentNodes || 0}/${budget.concurrentNodes}`);
    }

    // Enforce memory limit
    if ((globalUsage.memoryUsage || 0) > budget.memoryLimit) {
      throw new Error(`Memory budget exceeded: ${globalUsage.memoryUsage || 0}MB/${budget.memoryLimit}MB`);
    }

    // Enforce timeout (if applicable)
    const now = Date.now();
    for (const allocation of this.activeAllocations.values()) {
      if (allocation.allocatedAt && (now - allocation.allocatedAt) > (budget.timeoutLimit * 1000)) {
        await this.deallocate(allocation.nodeId);
      }
    }
  }

  /**
   * Check resource availability
   */
  private checkResourceAvailability(requirements: any): boolean {
    const currentUsage = Array.from(this.resourceUsage.values());

    // Check browser contexts
    if (requirements.browserContexts) {
      const usedContexts = currentUsage.reduce((sum, usage) =>
        sum + (usage.browserContexts || 0), 0);
      if (usedContexts + requirements.browserContexts > 3) { // Default limit
        return false;
      }
    }

    // Check memory
    if (requirements.memory) {
      const usedMemory = currentUsage.reduce((sum, usage) =>
        sum + (usage.memoryUsage || 0), 0);
      if (usedMemory + requirements.memory > 1024) { // Default 1GB limit
        return false;
      }
    }

    // Check concurrent nodes
    if (this.activeAllocations.size >= 5) { // Default concurrent limit
      return false;
    }

    return true;
  }

  /**
   * Check if execution is within budget
   */
  async checkBudgetCompliance(executionId: string): Promise<{
    withinBudget: boolean;
    violations: string[];
  }> {
    const budget = this.capabilityBudgets.get(executionId);
    if (!budget) {
      return { withinBudget: true, violations: [] };
    }

    const usage = (await this.getUsage())['global'];
    const violations: string[] = [];

    // Check browser contexts
    if ((usage.browserContexts || 0) > budget.browserContexts) {
      violations.push(`Browser contexts exceeded: ${usage.browserContexts || 0}/${budget.browserContexts}`);
    }

    // Check concurrent nodes
    if ((usage.concurrentNodes || 0) > budget.concurrentNodes) {
      violations.push(`Concurrent nodes exceeded: ${usage.concurrentNodes || 0}/${budget.concurrentNodes}`);
    }

    // Check memory
    if ((usage.memoryUsage || 0) > budget.memoryLimit) {
      violations.push(`Memory limit exceeded: ${usage.memoryUsage || 0}MB/${budget.memoryLimit}MB`);
    }

    // Check timeout
    const executionTime = Date.now() - (budget.startTime || Date.now());
    if (executionTime > budget.timeoutLimit) {
      violations.push(`Execution timeout exceeded: ${executionTime}ms/${budget.timeoutLimit}ms`);
    }

    return {
      withinBudget: violations.length === 0,
      violations
    };
  }

  /**
   * Get resource recommendations for optimization
   */
  async getResourceRecommendations(executionId: string): Promise<string[]> {
    const budget = this.capabilityBudgets.get(executionId);
    const usage = (await this.getUsage())['global'];
    const recommendations: string[] = [];

    if (!budget) {
      return recommendations;
    }

    // Memory optimization
    if ((usage.memoryUsage || 0) > budget.memoryLimit * 0.8) {
      recommendations.push('Consider reducing memory-intensive operations or increasing memory budget');
    }

    // Concurrency optimization
    if ((usage.concurrentNodes || 0) > budget.concurrentNodes * 0.9) {
      recommendations.push('High concurrency detected, consider reducing parallel operations');
    }

    // Browser context optimization
    if ((usage.browserContexts || 0) > budget.browserContexts * 0.8) {
      recommendations.push('Browser context usage is high, consider reusing contexts or reducing browser operations');
    }

    return recommendations;
  }

  /**
   * Force cleanup of stale allocations
   */
  async cleanupStaleAllocations(maxAge: number = 300000): Promise<number> { // 5 minutes default
    const now = Date.now();
    let cleaned = 0;

    for (const [nodeId, allocation] of this.activeAllocations.entries()) {
      if (now - allocation.allocatedAt > maxAge) {
        await this.deallocate(nodeId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get allocation details for monitoring
   */
  async getAllocationDetails(): Promise<ResourceAllocation[]> {
    return Array.from(this.activeAllocations.values());
  }
}