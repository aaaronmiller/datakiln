/**
 * Test suite for memory decision logic functions
 * Tests the Natural Language Memory Usage Protocol v5.0 implementation
 */

const {
  shouldReadForTaskInitiation,
  shouldReadForToolSelection,
  shouldReadForErrorRecovery,
  shouldReadForAmbiguityResolution,
  shouldStoreDecision,
  shouldStoreOutcome,
  shouldStorePattern,
  shouldStoreConstraint,
  assessRelevance,
  filterByQuality,
  calculateContextInjectionLimit,
  enforceRetrievalLimits,
  manageContextWindow,
  estimateTokenCount
} = require('./memory_decision_logic');

// Test data
const testContexts = {
  taskInitiation: {
    complex: {
      taskType: 'implementation',
      complexity: 0.9,
      isNovel: false,
      hasDependencies: true,
      keywords: ['error', 'performance']
    },
    simple: {
      taskType: 'routine',
      complexity: 0.2,
      isNovel: false,
      hasDependencies: false,
      keywords: ['update']
    }
  },
  toolSelection: {
    dangerous: {
      toolName: 'run_terminal_command',
      toolCategory: 'system',
      hasKnownIssues: true,
      complexity: 0.8,
      parameters: ['rm', '-rf', '/']
    },
    safe: {
      toolName: 'read_file',
      toolCategory: 'file_ops',
      hasKnownIssues: false,
      complexity: 0.3,
      parameters: ['test.txt']
    }
  },
  errorRecovery: {
    critical: {
      errorType: 'runtime',
      errorMessage: 'Segmentation fault',
      severity: 0.9,
      isRecurring: true,
      stackTrace: ['malloc', 'free', 'corruption']
    }
  },
  ambiguityResolution: {
    unclear: {
      clarityScore: 0.3,
      unclearTerms: ['optimize', 'refactor', 'scale'],
      hasMultipleInterpretations: true,
      domain: 'performance',
      stakeholders: ['dev', 'ops', 'business']
    },
    clear: {
      clarityScore: 0.8,
      unclearTerms: [],
      hasMultipleInterpretations: false,
      domain: 'maintenance',
      stakeholders: ['dev']
    }
  },
  decisionStorage: {
    architectural: {
      decisionType: 'architectural',
      significance: 0.9,
      affectsMultipleComponents: true,
      hasTradeoffs: true,
      alternatives: ['option1', 'option2', 'option3']
    },
    routine: {
      decisionType: 'implementation',
      significance: 0.4,
      affectsMultipleComponents: false,
      hasTradeoffs: false,
      alternatives: []
    }
  },
  outcomeStorage: {
    failure: {
      outcomeType: 'failure',
      value: 0.1,
      isUnexpected: true,
      hasLessons: true,
      failures: ['timeout', 'memory_leak']
    },
    success: {
      outcomeType: 'success',
      value: 0.9,
      isUnexpected: false,
      hasLessons: true,
      failures: []
    }
  },
  patternStorage: {
    reusable: {
      patternType: 'algorithm',
      reusability: 0.9,
      frequency: 5,
      isGeneralizable: true,
      domains: ['web', 'mobile', 'desktop']
    },
    specific: {
      patternType: 'code',
      reusability: 0.3,
      frequency: 1,
      isGeneralizable: false,
      domains: ['specific_project']
    }
  },
  constraintStorage: {
    important: {
      constraintType: 'regulatory',
      importance: 0.9,
      isNew: true,
      affectsFuture: true,
      scope: 'organization'
    },
    trivial: {
      constraintType: 'preference',
      importance: 0.2,
      isNew: false,
      affectsFuture: false,
      scope: 'individual'
    }
  }
};

const testResults = {
  memoryResults: [
    {
      id: '1',
      content: 'React Flow requires explicit dimensions to prevent rendering errors',
      title: 'React Flow Dimensions Fix',
      type: 'lessons',
      priority: 'high',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      recurrenceCount: 3,
      significance: 0.8,
      tags: ['react', 'frontend', 'error']
    },
    {
      id: '2',
      content: 'Use TypeScript strict mode for better type safety',
      title: 'TypeScript Configuration',
      type: 'decisions',
      priority: 'medium',
      createdAt: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
      recurrenceCount: 1,
      significance: 0.6,
      tags: ['typescript', 'configuration']
    },
    {
      id: '3',
      content: 'Old implementation detail',
      title: 'Outdated Pattern',
      type: 'artifacts',
      priority: 'low',
      createdAt: new Date(Date.now() - 31536000000).toISOString(), // 1 year ago
      recurrenceCount: 0,
      significance: 0.2,
      tags: ['legacy']
    }
  ]
};

// Test functions
function runTests() {
  console.log('🧠 Testing Memory Decision Logic Functions\n');

  let passed = 0;
  let total = 0;

  // Test read gates
  console.log('📖 Testing Read Gates:');

  // Task initiation
  total++;
  const taskResult = shouldReadForTaskInitiation(testContexts.taskInitiation.complex);
  if (taskResult.shouldRead && taskResult.retrievalConfig.top_k === 7) {
    console.log('✅ shouldReadForTaskInitiation (complex task)');
    passed++;
  } else {
    console.log('❌ shouldReadForTaskInitiation (complex task)');
  }

  total++;
  const simpleTaskResult = shouldReadForTaskInitiation(testContexts.taskInitiation.simple);
  if (!simpleTaskResult.shouldRead) {
    console.log('✅ shouldReadForTaskInitiation (simple task)');
    passed++;
  } else {
    console.log('❌ shouldReadForTaskInitiation (simple task)');
  }

  // Tool selection
  total++;
  const toolResult = shouldReadForToolSelection(testContexts.toolSelection.dangerous);
  if (toolResult.shouldRead) {
    console.log('✅ shouldReadForToolSelection (dangerous tool)');
    passed++;
  } else {
    console.log('❌ shouldReadForToolSelection (dangerous tool)');
  }

  // Error recovery
  total++;
  const errorResult = shouldReadForErrorRecovery(testContexts.errorRecovery.critical);
  if (errorResult.shouldRead && errorResult.retrievalConfig.top_k === 5) {
    console.log('✅ shouldReadForErrorRecovery');
    passed++;
  } else {
    console.log('❌ shouldReadForErrorRecovery');
  }

  // Ambiguity resolution
  total++;
  const ambiguityResult = shouldReadForAmbiguityResolution(testContexts.ambiguityResolution.unclear);
  if (ambiguityResult.shouldRead) {
    console.log('✅ shouldReadForAmbiguityResolution (unclear requirements)');
    passed++;
  } else {
    console.log('❌ shouldReadForAmbiguityResolution (unclear requirements)');
  }

  total++;
  const clearAmbiguityResult = shouldReadForAmbiguityResolution(testContexts.ambiguityResolution.clear);
  if (!clearAmbiguityResult.shouldRead) {
    console.log('✅ shouldReadForAmbiguityResolution (clear requirements)');
    passed++;
  } else {
    console.log('❌ shouldReadForAmbiguityResolution (clear requirements)');
  }

  // Test write gates
  console.log('\n💾 Testing Write Gates:');

  // Decision storage
  total++;
  const decisionResult = shouldStoreDecision(testContexts.decisionStorage.architectural);
  if (decisionResult.shouldStore && decisionResult.contentType === 'decisions') {
    console.log('✅ shouldStoreDecision (architectural)');
    passed++;
  } else {
    console.log('❌ shouldStoreDecision (architectural)');
  }

  // Outcome storage
  total++;
  const outcomeResult = shouldStoreOutcome(testContexts.outcomeStorage.failure);
  if (outcomeResult.shouldStore && outcomeResult.contentType === 'lessons') {
    console.log('✅ shouldStoreOutcome (failure)');
    passed++;
  } else {
    console.log('❌ shouldStoreOutcome (failure)');
  }

  // Pattern storage
  total++;
  const patternResult = shouldStorePattern(testContexts.patternStorage.reusable);
  if (patternResult.shouldStore && patternResult.contentType === 'artifacts') {
    console.log('✅ shouldStorePattern (reusable)');
    passed++;
  } else {
    console.log('❌ shouldStorePattern (reusable)');
  }

  // Constraint storage
  total++;
  const constraintResult = shouldStoreConstraint(testContexts.constraintStorage.important);
  if (constraintResult.shouldStore && constraintResult.contentType === 'constraints') {
    console.log('✅ shouldStoreConstraint (important)');
    passed++;
  } else {
    console.log('❌ shouldStoreConstraint (important)');
  }

  // Test assessment functions
  console.log('\n🎯 Testing Assessment Functions:');

  // Relevance assessment
  total++;
  const assessedResults = assessRelevance('React Flow dimensions', testResults.memoryResults);
  if (assessedResults[0].relevanceScore > assessedResults[1].relevanceScore) {
    console.log('✅ assessRelevance (proper scoring)');
    passed++;
  } else {
    console.log('❌ assessRelevance (proper scoring)');
  }

  // Quality filtering
  total++;
  const filteredResults = filterByQuality(assessedResults, 0.3);
  if (filteredResults.length >= 2) {
    console.log('✅ filterByQuality');
    passed++;
  } else {
    console.log('❌ filterByQuality');
  }

  // Context injection limit
  total++;
  const injectionLimit = calculateContextInjectionLimit(10000);
  if (injectionLimit.maxTokens === 2000 && injectionLimit.recommendedLimit <= 2000) {
    console.log('✅ calculateContextInjectionLimit');
    passed++;
  } else {
    console.log('❌ calculateContextInjectionLimit');
  }

  // Test performance functions
  console.log('\n⚡ Testing Performance Functions:');

  // Retrieval limits
  total++;
  const limitedResults = enforceRetrievalLimits(testResults.memoryResults, 'taskStart');
  if (limitedResults.length <= 7) {
    console.log('✅ enforceRetrievalLimits');
    passed++;
  } else {
    console.log('❌ enforceRetrievalLimits');
  }

  // Context window management
  total++;
  const contextPlan = manageContextWindow(testResults.memoryResults, 5000, 10000);
  if (contextPlan.selectedContent.length > 0 && contextPlan.utilization <= 1) {
    console.log('✅ manageContextWindow');
    passed++;
  } else {
    console.log('❌ manageContextWindow');
  }

  // Token estimation
  total++;
  const tokenCount = estimateTokenCount('This is a test string with some content');
  if (tokenCount > 0 && tokenCount < 20) {
    console.log('✅ estimateTokenCount');
    passed++;
  } else {
    console.log('❌ estimateTokenCount');
  }

  // Results
  console.log(`\n📊 Test Results: ${passed}/${total} passed`);

  if (passed === total) {
    console.log('🎉 All tests passed! Memory decision logic is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }

  return { passed, total };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testContexts, testResults };