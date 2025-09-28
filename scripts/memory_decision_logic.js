/**
 * Natural Language Memory Usage Protocol v5.0 - Decision Logic Implementation
 * Event-driven read/write gates and memory access control functions
 *
 * This file implements the decision-making logic for when and how much memory
 * should be accessed or stored, based on the DataKiln memory policy framework.
 */

// Configuration constants from memory policy
const MEMORY_CONFIG = {
  retrievalLimits: {
    taskStart: { top_k: 7, summarize: true },
    subtaskPlanning: { top_k: 7, summarize: true },
    errorHandling: { top_k: 5, summarize: false },
    ambiguityResolution: { top_k: 3, summarize: false }
  },
  graduationRules: {
    significanceThreshold: 0.7,
    recurrenceThreshold: 3,
    crossSessionUtility: true,
    projectAgnosticValue: true
  },
  contextWindowLimit: 0.2, // Max 20% of context for memory content
  cacheSize: 100 // LRU cache size for performance optimization
};

// Simple LRU Cache for performance optimization
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

// Global cache instance
const memoryCache = new LRUCache(MEMORY_CONFIG.cacheSize);

/**
 * READ GATE IMPLEMENTATIONS
 * Determine when memory access is permitted
 */

/**
 * Determines if memory should be accessed when starting a task
 * @param {Object} taskContext - Task initiation context
 * @param {string} taskContext.taskType - Type of task (implementation, debugging, planning, etc.)
 * @param {number} taskContext.complexity - Task complexity score (0-1)
 * @param {boolean} taskContext.isNovel - Whether task involves novel concepts
 * @param {boolean} taskContext.hasDependencies - Whether task has complex dependencies
 * @param {string[]} taskContext.keywords - Relevant keywords for memory search
 * @returns {Object} Decision result with boolean and retrieval config
 */
function shouldReadForTaskInitiation(taskContext) {
  const { taskType, complexity, isNovel, hasDependencies, keywords } = taskContext;

  // Always read for complex or novel tasks
  if (complexity > 0.7 || isNovel) {
    return {
      shouldRead: true,
      retrievalConfig: MEMORY_CONFIG.retrievalLimits.taskStart,
      reason: `Task is ${complexity > 0.7 ? 'complex' : 'novel'} - requires context`
    };
  }

  // Read for tasks with dependencies or critical keywords
  if (hasDependencies || (keywords && keywords.some(k => ['error', 'bug', 'security', 'performance'].includes(k)))) {
    return {
      shouldRead: true,
      retrievalConfig: MEMORY_CONFIG.retrievalLimits.taskStart,
      reason: `Task has ${hasDependencies ? 'dependencies' : 'critical keywords'} - requires context`
    };
  }

  // Skip for simple, routine tasks
  return {
    shouldRead: false,
    retrievalConfig: null,
    reason: 'Task appears routine - no memory access needed'
  };
}

/**
 * Determines if memory should be accessed before tool invocation
 * @param {Object} toolContext - Tool selection context
 * @param {string} toolContext.toolName - Name of the tool being invoked
 * @param {string} toolContext.toolCategory - Category (file_ops, network, system, etc.)
 * @param {boolean} toolContext.hasKnownIssues - Whether tool has known issues
 * @param {number} toolContext.complexity - Tool complexity score (0-1)
 * @param {string[]} toolContext.parameters - Tool parameters being used
 * @returns {Object} Decision result with boolean and retrieval config
 */
function shouldReadForToolSelection(toolContext) {
  const { toolName, toolCategory, hasKnownIssues, complexity, parameters } = toolContext;

  // Always read for tools with known issues
  if (hasKnownIssues) {
    return {
      shouldRead: true,
      retrievalConfig: MEMORY_CONFIG.retrievalLimits.errorHandling,
      reason: 'Tool has known issues - requires context for mitigation'
    };
  }

  // Read for complex tools or dangerous operations
  if (complexity > 0.6 || toolCategory === 'system' || toolCategory === 'network') {
    return {
      shouldRead: true,
      retrievalConfig: MEMORY_CONFIG.retrievalLimits.subtaskPlanning,
      reason: `Tool is ${complexity > 0.6 ? 'complex' : 'in sensitive category'} - requires context`
    };
  }

  // Skip for simple, safe tools
  return {
    shouldRead: false,
    retrievalConfig: null,
    reason: 'Tool appears safe and simple - no memory access needed'
  };
}

/**
 * Determines if memory should be accessed during error handling
 * @param {Object} errorContext - Error recovery context
 * @param {string} errorContext.errorType - Type of error (runtime, compilation, logic, etc.)
 * @param {string} errorContext.errorMessage - Error message content
 * @param {number} errorContext.severity - Error severity (0-1)
 * @param {boolean} errorContext.isRecurring - Whether error has occurred before
 * @param {string[]} errorContext.stackTrace - Stack trace keywords
 * @returns {Object} Decision result with boolean and retrieval config
 */
function shouldReadForErrorRecovery(errorContext) {
  const { errorType, errorMessage, severity, isRecurring, stackTrace } = errorContext;

  // Always read for errors - error handling is critical
  return {
    shouldRead: true,
    retrievalConfig: MEMORY_CONFIG.retrievalLimits.errorHandling,
    reason: `Error recovery required - ${severity > 0.7 ? 'high severity' : 'standard'} error handling`
  };
}

/**
 * Determines if memory should be accessed for unclear requirements
 * @param {Object} ambiguityContext - Ambiguity resolution context
 * @param {number} ambiguityContext.clarityScore - Requirements clarity (0-1, lower = more ambiguous)
 * @param {string[]} ambiguityContext.unclearTerms - Unclear terminology found
 * @param {boolean} ambiguityContext.hasMultipleInterpretations - Whether requirements have multiple valid interpretations
 * @param {string} ambiguityContext.domain - Problem domain
 * @param {string[]} ambiguityContext.stakeholders - Involved stakeholders
 * @returns {Object} Decision result with boolean and retrieval config
 */
function shouldReadForAmbiguityResolution(ambiguityContext) {
  const { clarityScore, unclearTerms, hasMultipleInterpretations, domain, stakeholders } = ambiguityContext;

  // Read for highly ambiguous situations
  if (clarityScore < 0.5 || hasMultipleInterpretations || (unclearTerms && unclearTerms.length > 2)) {
    return {
      shouldRead: true,
      retrievalConfig: MEMORY_CONFIG.retrievalLimits.ambiguityResolution,
      reason: `High ambiguity detected - ${clarityScore < 0.5 ? 'low clarity' : 'multiple interpretations'}`
    };
  }

  // Read for domain-specific or stakeholder-related ambiguity
  if (domain === 'security' || domain === 'compliance' || stakeholders.length > 3) {
    return {
      shouldRead: true,
      retrievalConfig: MEMORY_CONFIG.retrievalLimits.ambiguityResolution,
      reason: `Domain/stakeholder complexity requires context - ${domain} domain`
    };
  }

  // Skip for clear requirements
  return {
    shouldRead: false,
    retrievalConfig: null,
    reason: 'Requirements appear clear - no ambiguity resolution needed'
  };
}

/**
 * WRITE GATE IMPLEMENTATIONS
 * Determine when memory storage is permitted
 */

/**
 * Determines if architectural/implementation choices should be stored
 * @param {Object} decisionContext - Decision storage context
 * @param {string} decisionContext.decisionType - Type (architectural, implementation, design)
 * @param {number} decisionContext.significance - Decision significance (0-1)
 * @param {boolean} decisionContext.affectsMultipleComponents - Whether decision affects multiple components
 * @param {boolean} decisionContext.hasTradeoffs - Whether decision involves tradeoffs
 * @param {string[]} decisionContext.alternatives - Alternative options considered
 * @returns {Object} Decision result with boolean and storage metadata
 */
function shouldStoreDecision(decisionContext) {
  const { decisionType, significance, affectsMultipleComponents, hasTradeoffs, alternatives } = decisionContext;

  // Always store significant architectural decisions
  if (decisionType === 'architectural' || significance > 0.8) {
    return {
      shouldStore: true,
      contentType: 'decisions',
      priority: significance > 0.8 ? 'high' : 'medium',
      reason: `${decisionType} decision with ${significance > 0.8 ? 'high' : 'medium'} significance`
    };
  }

  // Store decisions affecting multiple components or with tradeoffs
  if (affectsMultipleComponents || hasTradeoffs || (alternatives && alternatives.length > 1)) {
    return {
      shouldStore: true,
      contentType: 'decisions',
      priority: 'medium',
      reason: `Decision ${affectsMultipleComponents ? 'affects multiple components' : 'involves tradeoffs'}`
    };
  }

  // Skip routine implementation details
  return {
    shouldStore: false,
    contentType: null,
    priority: null,
    reason: 'Decision appears routine - no storage needed'
  };
}

/**
 * Determines if task results should be stored
 * @param {Object} outcomeContext - Outcome storage context
 * @param {string} outcomeContext.outcomeType - Type (success, failure, partial, unexpected)
 * @param {number} outcomeContext.value - Outcome value/lessons learned score (0-1)
 * @param {boolean} outcomeContext.isUnexpected - Whether outcome was unexpected
 * @param {boolean} outcomeContext.hasLessons - Whether outcome provides lessons
 * @param {string[]} outcomeContext.failures - Failure modes encountered
 * @returns {Object} Decision result with boolean and storage metadata
 */
function shouldStoreOutcome(outcomeContext) {
  const { outcomeType, value, isUnexpected, hasLessons, failures } = outcomeContext;

  // Always store failures and unexpected outcomes
  if (outcomeType === 'failure' || isUnexpected) {
    return {
      shouldStore: true,
      contentType: 'lessons',
      priority: 'high',
      reason: `${outcomeType === 'failure' ? 'Failure' : 'Unexpected outcome'} - valuable lessons`
    };
  }

  // Store valuable successes with lessons
  if (outcomeType === 'success' && (value > 0.7 || hasLessons)) {
    return {
      shouldStore: true,
      contentType: 'lessons',
      priority: 'medium',
      reason: `Successful outcome with ${value > 0.7 ? 'high value' : 'lessons learned'}`
    };
  }

  // Skip routine outcomes
  return {
    shouldStore: false,
    contentType: null,
    priority: null,
    reason: 'Outcome appears routine - no storage needed'
  };
}

/**
 * Determines if reusable patterns should be stored
 * @param {Object} patternContext - Pattern storage context
 * @param {string} patternContext.patternType - Type (algorithm, design, workflow, code)
 * @param {number} patternContext.reusability - Pattern reusability score (0-1)
 * @param {number} patternContext.frequency - How often pattern has been used
 * @param {boolean} patternContext.isGeneralizable - Whether pattern applies beyond current context
 * @param {string[]} patternContext.domains - Domains where pattern applies
 * @returns {Object} Decision result with boolean and storage metadata
 */
function shouldStorePattern(patternContext) {
  const { patternType, reusability, frequency, isGeneralizable, domains } = patternContext;

  // Store highly reusable patterns
  if (reusability > 0.8 || isGeneralizable) {
    return {
      shouldStore: true,
      contentType: 'artifacts',
      priority: reusability > 0.8 ? 'high' : 'medium',
      reason: `Highly ${reusability > 0.8 ? 'reusable' : 'generalizable'} ${patternType} pattern`
    };
  }

  // Store frequently used patterns that meet graduation criteria
  if (frequency >= MEMORY_CONFIG.graduationRules.recurrenceThreshold) {
    return {
      shouldStore: true,
      contentType: 'artifacts',
      priority: 'medium',
      reason: `Frequently used pattern (${frequency} occurrences)`
    };
  }

  // Skip non-reusable patterns
  return {
    shouldStore: false,
    contentType: null,
    priority: null,
    reason: 'Pattern appears project-specific - no storage needed'
  };
}

/**
 * Determines if constraints/preferences should be stored
 * @param {Object} constraintContext - Constraint storage context
 * @param {string} constraintContext.constraintType - Type (technical, business, regulatory, preference)
 * @param {number} constraintContext.importance - Constraint importance (0-1)
 * @param {boolean} constraintContext.isNew - Whether constraint is newly discovered
 * @param {boolean} constraintContext.affectsFuture - Whether constraint affects future work
 * @param {string} constraintContext.scope - Constraint scope (project, team, organization)
 * @returns {Object} Decision result with boolean and storage metadata
 */
function shouldStoreConstraint(constraintContext) {
  const { constraintType, importance, isNew, affectsFuture, scope } = constraintContext;

  // Always store important regulatory or business constraints
  if (constraintType === 'regulatory' || constraintType === 'business' || importance > 0.8) {
    return {
      shouldStore: true,
      contentType: 'constraints',
      priority: 'high',
      reason: `${constraintType} constraint with ${importance > 0.8 ? 'high' : 'standard'} importance`
    };
  }

  // Store new constraints that affect future work
  if (isNew && affectsFuture) {
    return {
      shouldStore: true,
      contentType: 'constraints',
      priority: 'medium',
      reason: 'New constraint affecting future work'
    };
  }

  // Store team/organization scope constraints
  if (scope === 'team' || scope === 'organization') {
    return {
      shouldStore: true,
      contentType: 'constraints',
      priority: 'medium',
      reason: `${scope}-level constraint`
    };
  }

  // Skip temporary or trivial constraints
  return {
    shouldStore: false,
    contentType: null,
    priority: null,
    reason: 'Constraint appears temporary/trivial - no storage needed'
  };
}

/**
 * RELEVANCE AND QUALITY ASSESSMENT
 * Score and filter memory results
 */

/**
 * Scores memory results by recency, similarity, and usefulness
 * @param {string} query - Search query used
 * @param {Array} results - Memory results to assess
 * @returns {Array} Results with relevance scores added
 */
function assessRelevance(query, results) {
  const now = Date.now();
  const queryTerms = query.toLowerCase().split(/\s+/);

  return results.map(result => {
    const content = (result.content || '').toLowerCase();
    const title = (result.title || '').toLowerCase();
    const tags = (result.tags || []).join(' ').toLowerCase();

    // Calculate similarity score (term overlap)
    const contentTerms = content.split(/\s+/);
    const titleTerms = title.split(/\s+/);
    const tagTerms = tags.split(/\s+/);

    const allTerms = [...new Set([...contentTerms, ...titleTerms, ...tagTerms])];
    const matchingTerms = queryTerms.filter(term =>
      allTerms.some(resultTerm => resultTerm.includes(term) || term.includes(resultTerm))
    );

    const similarityScore = matchingTerms.length / Math.max(queryTerms.length, 1);

    // Calculate recency score (newer = higher score)
    const createdAt = result.createdAt ? new Date(result.createdAt).getTime() : now;
    const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (ageInDays / 365)); // Decay over year

    // Calculate usefulness score based on metadata
    let usefulnessScore = 0.5; // Base score

    if (result.priority === 'high') usefulnessScore += 0.2;
    if (result.type === 'lessons' || result.type === 'decisions') usefulnessScore += 0.1;
    if (result.recurrenceCount > 2) usefulnessScore += 0.1;
    if (result.significance > 0.7) usefulnessScore += 0.1;

    // Combined relevance score (weighted average)
    const relevanceScore = (
      similarityScore * 0.5 +
      recencyScore * 0.3 +
      usefulnessScore * 0.2
    );

    return {
      ...result,
      relevanceScore,
      similarityScore,
      recencyScore,
      usefulnessScore
    };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Filters results based on quality metrics
 * @param {Array} results - Results with relevance scores
 * @param {number} threshold - Minimum relevance threshold (0-1)
 * @returns {Array} Filtered results
 */
function filterByQuality(results, threshold = 0.3) {
  return results.filter(result => result.relevanceScore >= threshold);
}

/**
 * Determines how much memory content to inject into context
 * @param {number} contextLength - Current context length in tokens
 * @returns {Object} Injection limits and recommendations
 */
function calculateContextInjectionLimit(contextLength) {
  const maxMemoryTokens = Math.floor(contextLength * MEMORY_CONFIG.contextWindowLimit);
  const recommendedLimit = Math.min(maxMemoryTokens, 2000); // Cap at 2000 tokens

  return {
    maxTokens: maxMemoryTokens,
    recommendedLimit,
    percentage: MEMORY_CONFIG.contextWindowLimit * 100,
    strategy: maxMemoryTokens > 2000 ? 'summarize' : 'include_full'
  };
}

/**
 * PERFORMANCE OPTIMIZATION
 * Caching and retrieval management
 */

/**
 * Gets cached memory results if available
 * @param {string} cacheKey - Cache key for the query
 * @returns {Array|null} Cached results or null
 */
function getCachedResults(cacheKey) {
  return memoryCache.get(cacheKey);
}

/**
 * Caches memory results for future use
 * @param {string} cacheKey - Cache key for the query
 * @param {Array} results - Results to cache
 */
function cacheResults(cacheKey, results) {
  memoryCache.set(cacheKey, results);
}

/**
 * Enforces retrieval limits based on context type
 * @param {Array} results - Raw results
 * @param {string} contextType - Context type (taskStart, errorHandling, etc.)
 * @returns {Array} Limited and processed results
 */
function enforceRetrievalLimits(results, contextType) {
  const limits = MEMORY_CONFIG.retrievalLimits[contextType];
  if (!limits) return results;

  let processedResults = results.slice(0, limits.top_k);

  if (limits.summarize) {
    // In a real implementation, this would summarize the content
    processedResults = processedResults.map(result => ({
      ...result,
      content: result.content.length > 200 ?
        result.content.substring(0, 200) + '...' : result.content,
      summarized: true
    }));
  }

  return processedResults;
}

/**
 * Manages context window to prevent overflow
 * @param {Array} memoryContent - Memory content to inject
 * @param {number} currentContextLength - Current context length
 * @param {number} maxContextLength - Maximum allowed context length
 * @returns {Object} Injection plan with content and metadata
 */
function manageContextWindow(memoryContent, currentContextLength, maxContextLength) {
  const injectionLimits = calculateContextInjectionLimit(maxContextLength - currentContextLength);
  const availableTokens = injectionLimits.recommendedLimit;

  let totalTokens = 0;
  const selectedContent = [];
  const overflowContent = [];

  for (const item of memoryContent) {
    const itemTokens = estimateTokenCount(item.content || '');
    if (totalTokens + itemTokens <= availableTokens) {
      selectedContent.push(item);
      totalTokens += itemTokens;
    } else {
      overflowContent.push(item);
    }
  }

  return {
    selectedContent,
    overflowContent,
    totalTokensUsed: totalTokens,
    availableTokens,
    utilization: totalTokens / availableTokens,
    strategy: overflowContent.length > 0 ? 'truncated' : 'full'
  };
}

/**
 * Estimates token count for content (rough approximation)
 * @param {string} content - Content to count
 * @returns {number} Estimated token count
 */
function estimateTokenCount(content) {
  // Rough approximation: 1 token per 4 characters for English text
  return Math.ceil(content.length / 4);
}

// Export all functions
module.exports = {
  // Read Gates
  shouldReadForTaskInitiation,
  shouldReadForToolSelection,
  shouldReadForErrorRecovery,
  shouldReadForAmbiguityResolution,

  // Write Gates
  shouldStoreDecision,
  shouldStoreOutcome,
  shouldStorePattern,
  shouldStoreConstraint,

  // Assessment
  assessRelevance,
  filterByQuality,
  calculateContextInjectionLimit,

  // Performance
  getCachedResults,
  cacheResults,
  enforceRetrievalLimits,
  manageContextWindow,
  estimateTokenCount,

  // Configuration
  MEMORY_CONFIG
};