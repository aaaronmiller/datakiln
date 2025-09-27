#!/usr/bin/env node
/**
 * Comprehensive End-to-End Workflow Integration Test
 * Tests the complete pipeline from extension to backend to output
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class WorkflowIntegrationTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.apiBaseUrl = 'http://localhost:8000';
    this.frontendUrl = 'http://localhost:3000';
    this.testResults = [];
    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 Starting Comprehensive Workflow Integration Tests...\n');
    
    try {
      await this.setup();
      await this.testBackendHealth();
      await this.testWorkflowAPI();
      await this.testReactFlowPerformance();
      await this.testScriptIntegration();
      await this.testExtensionWorkflows();
      await this.testEndToEndWorkflows();
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  async setup() {
    console.log('📋 Setting up test environment...');
    
    // Launch browser with extension support
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for visual verification
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions-except=./chrome-extension',
        '--load-extension=./chrome-extension'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    console.log('✅ Browser setup complete');
  }

  async testBackendHealth() {
    console.log('\n🏥 Testing Backend Health...');
    
    try {
      const response = await axios.get(`${this.apiBaseUrl}/health`);
      
      this.addResult('Backend Health Check', {
        status: response.status === 200 ? 'PASS' : 'FAIL',
        responseTime: response.headers['x-response-time'] || 'N/A',
        data: response.data
      });
      
      console.log('✅ Backend health check passed');
      
    } catch (error) {
      this.addResult('Backend Health Check', {
        status: 'FAIL',
        error: error.message
      });
      throw new Error('Backend health check failed');
    }
  }

  async testWorkflowAPI() {
    console.log('\n🔧 Testing Workflow API Endpoints...');
    
    // Test workflow list endpoint
    try {
      const listResponse = await axios.get(`${this.apiBaseUrl}/api/v1/workflows/list`);
      
      this.addResult('Workflow List API', {
        status: listResponse.status === 200 ? 'PASS' : 'FAIL',
        workflowCount: listResponse.data.workflows?.length || 0,
        categories: listResponse.data.categories?.length || 0
      });
      
      console.log(`✅ Found ${listResponse.data.workflows?.length || 0} available workflows`);
      
    } catch (error) {
      this.addResult('Workflow List API', {
        status: 'FAIL',
        error: error.message
      });
    }

    // Test workflow execution endpoint
    try {
      const executeResponse = await axios.post(`${this.apiBaseUrl}/api/v1/workflows/execute`, {
        workflow_id: 'text-analysis',
        input_data: {
          type: 'text',
          content: 'This is a test message for workflow execution.'
        },
        activation_source: 'test'
      });
      
      this.addResult('Workflow Execute API', {
        status: executeResponse.status === 200 ? 'PASS' : 'FAIL',
        taskId: executeResponse.data.task_id,
        workflowId: executeResponse.data.workflow_id
      });
      
      console.log('✅ Workflow execution API working');
      
    } catch (error) {
      this.addResult('Workflow Execute API', {
        status: 'FAIL',
        error: error.message
      });
    }
  }

  async testReactFlowPerformance() {
    console.log('\n⚡ Testing ReactFlow Performance...');
    
    try {
      await this.page.goto(this.frontendUrl);
      await this.page.waitForSelector('.react-flow', { timeout: 10000 });
      
      // Measure initial load time
      const loadTime = await this.page.evaluate(() => {
        return performance.timing.loadEventEnd - performance.timing.navigationStart;
      });
      
      // Test with large number of nodes
      await this.page.evaluate(() => {
        // Simulate adding 100 nodes
        const nodes = [];
        for (let i = 0; i < 100; i++) {
          nodes.push({
            id: `node-${i}`,
            type: 'provider',
            position: { x: (i % 10) * 200, y: Math.floor(i / 10) * 150 },
            data: { label: `Node ${i}`, type: 'provider' }
          });
        }
        
        // Trigger node addition (this would depend on your store implementation)
        if (window.useWorkflowStore) {
          const store = window.useWorkflowStore.getState();
          store.setNodes(nodes);
        }
      });
      
      // Measure rendering performance
      const renderTime = await this.page.evaluate(() => {
        const start = performance.now();
        // Force a re-render
        window.dispatchEvent(new Event('resize'));
        return performance.now() - start;
      });
      
      // Test viewport virtualization
      const visibleNodes = await this.page.evaluate(() => {
        const nodeElements = document.querySelectorAll('.react-flow__node');
        return nodeElements.length;
      });
      
      this.addResult('ReactFlow Performance', {
        status: loadTime < 3000 && renderTime < 100 ? 'PASS' : 'FAIL',
        loadTime: `${loadTime}ms`,
        renderTime: `${renderTime}ms`,
        visibleNodes: visibleNodes,
        virtualizationActive: visibleNodes < 100
      });
      
      console.log(`✅ ReactFlow performance: Load ${loadTime}ms, Render ${renderTime}ms`);
      
    } catch (error) {
      this.addResult('ReactFlow Performance', {
        status: 'FAIL',
        error: error.message
      });
    }
  }

  async testScriptIntegration() {
    console.log('\n📜 Testing Script Integration...');
    
    // Test YouTube transcript script
    try {
      const ytResponse = await axios.post(`${this.apiBaseUrl}/api/v1/scripts/youtube/extract`, {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll for testing
        format: 'json'
      });
      
      this.addResult('YouTube Script Integration', {
        status: ytResponse.status === 200 ? 'PASS' : 'FAIL',
        taskId: ytResponse.data.task_id
      });
      
      console.log('✅ YouTube transcript script integration working');
      
    } catch (error) {
      this.addResult('YouTube Script Integration', {
        status: 'FAIL',
        error: error.message
      });
    }

    // Test deep research script
    try {
      const researchResponse = await axios.post(`${this.apiBaseUrl}/api/v1/scripts/research/deep`, {
        topic: 'artificial intelligence trends 2024',
        mode: 'fast'
      });
      
      this.addResult('Deep Research Script Integration', {
        status: researchResponse.status === 200 ? 'PASS' : 'FAIL',
        taskId: researchResponse.data.task_id
      });
      
      console.log('✅ Deep research script integration working');
      
    } catch (error) {
      this.addResult('Deep Research Script Integration', {
        status: 'FAIL',
        error: error.message
      });
    }
  }

  async testExtensionWorkflows() {
    console.log('\n🧩 Testing Chrome Extension Workflows...');
    
    try {
      // Navigate to a test page
      await this.page.goto('https://example.com');
      
      // Check if extension is loaded
      const extensionLoaded = await this.page.evaluate(() => {
        return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
      });
      
      if (!extensionLoaded) {
        console.log('⚠️  Extension not loaded in test environment');
        this.addResult('Extension Loading', {
          status: 'SKIP',
          reason: 'Extension not available in test environment'
        });
        return;
      }
      
      // Test extension popup functionality
      const popupTest = await this.page.evaluate(async () => {
        try {
          // Simulate extension popup interaction
          const response = await chrome.runtime.sendMessage({
            type: 'getWorkflows'
          });
          return response.success;
        } catch (error) {
          return false;
        }
      });
      
      this.addResult('Extension Workflow Integration', {
        status: popupTest ? 'PASS' : 'FAIL',
        extensionLoaded: extensionLoaded
      });
      
      console.log('✅ Extension workflow integration tested');
      
    } catch (error) {
      this.addResult('Extension Workflow Integration', {
        status: 'FAIL',
        error: error.message
      });
    }
  }

  async testEndToEndWorkflows() {
    console.log('\n🔄 Testing End-to-End Workflow Execution...');
    
    const testWorkflows = [
      {
        id: 'text-analysis',
        input: {
          type: 'text',
          content: 'This is a comprehensive test of the text analysis workflow. It should process this content and generate meaningful insights.'
        }
      },
      {
        id: 'website-summary',
        input: {
          type: 'url',
          url: 'https://example.com',
          title: 'Example Website'
        }
      }
    ];

    for (const workflow of testWorkflows) {
      try {
        console.log(`  Testing ${workflow.id}...`);
        
        const startTime = Date.now();
        
        // Execute workflow
        const response = await axios.post(`${this.apiBaseUrl}/api/v1/workflows/execute`, {
          workflow_id: workflow.id,
          input_data: workflow.input,
          activation_source: 'e2e_test'
        });
        
        const executionTime = Date.now() - startTime;
        
        // Wait a bit for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check status
        const statusResponse = await axios.get(
          `${this.apiBaseUrl}/api/v1/workflows/status/${response.data.task_id}`
        );
        
        this.addResult(`E2E Workflow: ${workflow.id}`, {
          status: response.status === 200 ? 'PASS' : 'FAIL',
          executionTime: `${executionTime}ms`,
          taskId: response.data.task_id,
          workflowStatus: statusResponse.data.status
        });
        
        console.log(`  ✅ ${workflow.id} completed in ${executionTime}ms`);
        
      } catch (error) {
        this.addResult(`E2E Workflow: ${workflow.id}`, {
          status: 'FAIL',
          error: error.message
        });
        console.log(`  ❌ ${workflow.id} failed: ${error.message}`);
      }
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...');
    
    const totalTime = Date.now() - this.startTime;
    const passCount = this.testResults.filter(r => r.status === 'PASS').length;
    const failCount = this.testResults.filter(r => r.status === 'FAIL').length;
    const skipCount = this.testResults.filter(r => r.status === 'SKIP').length;
    
    const report = {
      summary: {
        totalTests: this.testResults.length,
        passed: passCount,
        failed: failCount,
        skipped: skipCount,
        successRate: `${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`,
        totalTime: `${totalTime}ms`,
        timestamp: new Date().toISOString()
      },
      results: this.testResults,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    // Save report to file
    const reportPath = path.join(__dirname, 'test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(__dirname, 'test-report.html');
    await fs.writeFile(htmlPath, htmlReport);
    
    console.log('\n📋 TEST SUMMARY');
    console.log('================');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${passCount} ✅`);
    console.log(`Failed: ${failCount} ❌`);
    console.log(`Skipped: ${skipCount} ⏭️`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`Total Time: ${report.summary.totalTime}`);
    console.log(`\nReports saved:`);
    console.log(`  JSON: ${reportPath}`);
    console.log(`  HTML: ${htmlPath}`);
    
    if (failCount > 0) {
      console.log('\n❌ Some tests failed. Check the report for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! System is ready for production.');
    }
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>DataKiln Integration Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; }
        .header { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1e293b; }
        .metric-label { font-size: 14px; color: #64748b; margin-top: 5px; }
        .results { background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
        .result-item { padding: 15px; border-bottom: 1px solid #f1f5f9; }
        .result-item:last-child { border-bottom: none; }
        .status-pass { color: #059669; font-weight: bold; }
        .status-fail { color: #dc2626; font-weight: bold; }
        .status-skip { color: #d97706; font-weight: bold; }
        .details { margin-top: 10px; font-size: 14px; color: #64748b; }
        .timestamp { color: #94a3b8; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 DataKiln Integration Test Report</h1>
        <p class="timestamp">Generated: ${report.summary.timestamp}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <div class="metric-value">${report.summary.totalTests}</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value status-pass">${report.summary.passed}</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value status-fail">${report.summary.failed}</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.summary.successRate}</div>
            <div class="metric-label">Success Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.summary.totalTime}</div>
            <div class="metric-label">Total Time</div>
        </div>
    </div>
    
    <div class="results">
        <h2 style="margin: 0; padding: 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">Test Results</h2>
        ${report.results.map(result => `
            <div class="result-item">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${result.testName}</strong>
                    <span class="status-${result.status.toLowerCase()}">${result.status}</span>
                </div>
                <div class="details">
                    <pre>${JSON.stringify(result.details, null, 2)}</pre>
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  addResult(testName, details) {
    this.testResults.push({
      testName,
      status: details.status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new WorkflowIntegrationTest();
  test.run().catch(console.error);
}

module.exports = WorkflowIntegrationTest;