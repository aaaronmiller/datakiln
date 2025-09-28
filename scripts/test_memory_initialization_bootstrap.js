/**
 * Integration Tests for Memory Initialization Bootstrap
 *
 * Tests the initialization and bootstrap behaviors to ensure they work correctly
 * in various scenarios including full availability, partial availability, and fallback modes.
 */

const {
  assessMemorySystemReadiness,
  loadPersistentPolicies,
  initializeSessionState,
  loadProjectContext,
  establishProjectBaseline,
  validateProjectState,
  establishMemoryRelationships,
  createAuditTrails,
  synchronizeMemoryLayers,
  establishFallbackTracking,
  createCheckpointFiles,
  implementGracefulDegradation,
  MEMORY_INIT_CONFIG
} = require('./memory_initialization_bootstrap');

class MemoryInitializationTester {
  constructor() {
    this.results = {
      tests: [],
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running test: ${testName}`);
    this.results.total++;

    try {
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;

      if (result && result.success !== false) {
        console.log(`✅ PASSED (${duration}ms)`);
        this.results.passed++;
        this.results.tests.push({
          name: testName,
          status: 'passed',
          duration,
          result
        });
        return true;
      } else {
        console.log(`❌ FAILED (${duration}ms):`, result);
        this.results.failed++;
        this.results.tests.push({
          name: testName,
          status: 'failed',
          duration,
          error: result
        });
        return false;
      }
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({
        name: testName,
        status: 'failed',
        error: error.message
      });
      return false;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }

    console.log('='.repeat(60));
  }
}

async function runAllTests() {
  const tester = new MemoryInitializationTester();

  console.log('🚀 Starting Memory Initialization Bootstrap Tests');

  // Test 1: System Readiness Assessment
  await tester.runTest('System Readiness Assessment', async () => {
    const result = await assessMemorySystemReadiness();
    return result && typeof result.overallReadiness === 'string' &&
           ['full', 'partial', 'fallback'].includes(result.overallReadiness);
  });

  // Test 2: Load Persistent Policies
  await tester.runTest('Load Persistent Policies', async () => {
    const result = await loadPersistentPolicies();
    return result && result.loaded && result.memoryPolicy;
  });

  // Test 3: Initialize Session State
  await tester.runTest('Initialize Session State', async () => {
    const result = await initializeSessionState();
    return result && result.initialized && result.sessionId;
  });

  // Test 4: Load Project Context
  await tester.runTest('Load Project Context', async () => {
    const result = await loadProjectContext(MEMORY_INIT_CONFIG.workspaceId);
    return result && result.loaded && Array.isArray(result.objectives);
  });

  // Test 5: Establish Project Baseline
  await tester.runTest('Establish Project Baseline', async () => {
    const result = await establishProjectBaseline();
    return result && result.established && result.goals && result.scope;
  });

  // Test 6: Validate Project State
  await tester.runTest('Validate Project State', async () => {
    const context = await loadProjectContext(MEMORY_INIT_CONFIG.workspaceId);
    const result = await validateProjectState(context);
    return result && result.validated;
  });

  // Test 7: Establish Memory Relationships
  await tester.runTest('Establish Memory Relationships', async () => {
    const result = await establishMemoryRelationships();
    return result && typeof result.established === 'boolean';
  });

  // Test 8: Create Audit Trails
  await tester.runTest('Create Audit Trails', async () => {
    const result = await createAuditTrails();
    return result && result.created && result.sessionId;
  });

  // Test 9: Synchronize Memory Layers
  await tester.runTest('Synchronize Memory Layers', async () => {
    const result = await synchronizeMemoryLayers();
    return result && typeof result.synchronized === 'boolean';
  });

  // Test 10: Establish Fallback Tracking
  await tester.runTest('Establish Fallback Tracking', async () => {
    const result = await establishFallbackTracking();
    return result && result.established && result.sessionId;
  });

  // Test 11: Create Checkpoint Files
  await tester.runTest('Create Checkpoint Files', async () => {
    const testData = { test: 'checkpoint', timestamp: new Date().toISOString() };
    const result = await createCheckpointFiles(testData, 'test_checkpoint');
    return result && result.created && result.filename;
  });

  // Test 12: Implement Graceful Degradation
  await tester.runTest('Implement Graceful Degradation', async () => {
    const result = await implementGracefulDegradation();
    return result && result.implemented && result.degradationLevel;
  });

  // Test 13: End-to-End Initialization Flow
  await tester.runTest('End-to-End Initialization Flow', async () => {
    try {
      // Step 1: Assess readiness
      const readiness = await assessMemorySystemReadiness();
      if (!readiness) throw new Error('Readiness assessment failed');

      // Step 2: Load policies
      const policies = await loadPersistentPolicies();
      if (!policies.loaded) throw new Error('Policy loading failed');

      // Step 3: Initialize session
      const session = await initializeSessionState();
      if (!session.initialized) throw new Error('Session initialization failed');

      // Step 4: Load context
      const context = await loadProjectContext(MEMORY_INIT_CONFIG.workspaceId);
      if (!context.loaded) throw new Error('Context loading failed');

      // Step 5: Establish relationships
      const relationships = await establishMemoryRelationships();

      // Step 6: Create audit trail
      const audit = await createAuditTrails();
      if (!audit.created) throw new Error('Audit trail creation failed');

      return {
        success: true,
        readiness: readiness.overallReadiness,
        sessionId: session.sessionId,
        contextLoaded: context.loaded,
        relationshipsEstablished: relationships.established,
        auditCreated: audit.created
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  tester.printSummary();
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  MemoryInitializationTester,
  runAllTests
};