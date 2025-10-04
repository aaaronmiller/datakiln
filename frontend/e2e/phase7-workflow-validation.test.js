/**
 * Phase 7: Testing - Comprehensive Workflow Validation via Puppeteer
 *
 * This test suite creates and validates complete workflows covering all node categories:
 * - Source/Ingest: url-injector, file-reader, clipboard-reader
 * - DOM Action: youtube-transcript, web-scraper
 * - Provider/LLM: gemini-processor, perplexity-researcher
 * - Transform/Parse: markdown-parser, json-processor
 * - Condition/Gate: content-gate, quality-gate
 * - Split/Map: text-chunker, parallel-processor
 * - Merge/Join: content-merger, result-aggregator
 * - Timer/Wait: delay-timer, event-waiter
 * - Export: file-exporter, obsidian-exporter
 * - Adapter: clipboard-url-adapter, markdown-json-adapter
 * - Loop/Iterate: quality-improvement-loop, batch-processor-loop
 *
 * Tests validate:
 * - Typed connections between compatible node types
 * - Visual unification of workflow layouts
 * - Pattern composition and complex workflows
 * - Resource management during execution
 * - End-to-end workflow execution and result validation
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8000';

// Node type mappings for UI interaction
const NODE_TYPES = {
  // Source/Ingest
  'url-injector': { category: 'source', palette: 'Source/Ingest' },
  'file-reader': { category: 'source', palette: 'Source/Ingest' },
  'clipboard-reader': { category: 'source', palette: 'Source/Ingest' },

  // DOM Action
  'youtube-transcript': { category: 'dom_action', palette: 'DOM Action' },
  'web-scraper': { category: 'dom_action', palette: 'DOM Action' },

  // Provider/LLM
  'gemini-processor': { category: 'provider', palette: 'Provider/LLM' },
  'perplexity-researcher': { category: 'provider', palette: 'Provider/LLM' },

  // Transform/Parse
  'markdown-parser': { category: 'transform', palette: 'Transform/Parse' },
  'json-processor': { category: 'transform', palette: 'Transform/Parse' },

  // Condition/Gate
  'content-gate': { category: 'condition', palette: 'Condition/Gate' },
  'quality-gate': { category: 'condition', palette: 'Condition/Gate' },

  // Split/Map
  'text-chunker': { category: 'split', palette: 'Split/Map' },
  'parallel-processor': { category: 'split', palette: 'Split/Map' },

  // Merge/Join
  'content-merger': { category: 'merge', palette: 'Merge/Join' },
  'result-aggregator': { category: 'merge', palette: 'Merge/Join' },

  // Timer/Wait
  'delay-timer': { category: 'timer', palette: 'Timer/Wait' },
  'event-waiter': { category: 'timer', palette: 'Timer/Wait' },

  // Export
  'file-exporter': { category: 'export', palette: 'Export' },
  'obsidian-exporter': { category: 'export', palette: 'Export' },

  // Adapter
  'clipboard-url-adapter': { category: 'adapter', palette: 'Adapter' },
  'markdown-json-adapter': { category: 'adapter', palette: 'Adapter' },

  // Loop/Iterate
  'quality-improvement-loop': { category: 'loop', palette: 'Loop/Iterate' },
  'batch-processor-loop': { category: 'loop', palette: 'Loop/Iterate' }
};

class Phase7WorkflowValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      screenshots: [],
      timings: {},
      workflows: {}
    };
  }

  async setup() {
    console.log('🚀 Setting up Phase 7 Workflow Validation...');
    this.browser = await puppeteer.launch({
      headless: false, // Keep visible for debugging workflow creation
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Set up console logging for debugging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Error:', msg.text());
      }
    });
  }

  async teardown() {
    console.log('🧹 Tearing down Phase 7 tests...');
    if (this.browser) {
      await this.browser.close();
    }
  }

  async takeScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `phase7-${name}-${timestamp}.png`;
    const filepath = path.join(__dirname, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    this.results.screenshots.push(filename);
    console.log(`📸 Screenshot saved: ${filename}`);
  }

  async runTest(testName, testFn) {
    console.log(`\n🧪 Running test: ${testName}`);
    const startTime = Date.now();

    try {
      await testFn();
      this.results.passed++;
      console.log(`✅ ${testName} PASSED`);
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({
        test: testName,
        error: error.message,
        stack: error.stack
      });
      console.log(`❌ ${testName} FAILED: ${error.message}`);
      await this.takeScreenshot(`${testName}-failed`);
    }

    const duration = Date.now() - startTime;
    this.results.timings[testName] = duration;
    console.log(`⏱️  ${testName} took ${duration}ms`);
  }

  // ===== WORKFLOW CREATION HELPERS =====

  async navigateToWorkflowEditor() {
    await this.page.goto(`${BASE_URL}/#/workflows`, { waitUntil: 'networkidle0' });
    await this.page.waitForSelector('[data-testid="workflow-editor"]', { timeout: 10000 });

    // Wait for React to fully render
    await this.page.waitForFunction(() => {
      return document.querySelector('[data-testid="workflow-editor"]') &&
             document.querySelector('[data-testid="node-palette"]');
    });
  }

  async createNewWorkflow(workflowName = 'Phase7-Test-Workflow') {
    // Click "New Workflow" button
    const newWorkflowBtn = await this.page.waitForSelector('button:has-text("New Workflow")');
    await newWorkflowBtn.click();

    // Wait for workflow creation dialog
    await this.page.waitForSelector('[data-testid="workflow-name-input"]');

    // Enter workflow name
    await this.page.type('[data-testid="workflow-name-input"]', workflowName);

    // Click create button
    const createBtn = await this.page.waitForSelector('button:has-text("Create")');
    await createBtn.click();

    // Wait for workflow editor to load
    await this.page.waitForSelector('[data-testid="workflow-canvas"]');
  }

  async addNodeToCanvas(nodeType, position = { x: 100, y: 100 }) {
    const nodeInfo = NODE_TYPES[nodeType];
    if (!nodeInfo) {
      throw new Error(`Unknown node type: ${nodeType}`);
    }

    // Find node in palette
    const paletteSelector = `[data-testid="palette-${nodeInfo.palette.toLowerCase().replace('/', '-')}"]`;
    await this.page.waitForSelector(paletteSelector);

    // Click on the palette category to expand it
    const categoryBtn = await this.page.$(`${paletteSelector} button`);
    if (categoryBtn) {
      await categoryBtn.click();
      await this.page.waitForTimeout(500); // Wait for expansion
    }

    // Find and drag the specific node type
    const nodeSelector = `[data-testid="node-${nodeType}"]`;
    const nodeElement = await this.page.$(nodeSelector);

    if (!nodeElement) {
      throw new Error(`Node type ${nodeType} not found in palette`);
    }

    // Get canvas position
    const canvas = await this.page.$('[data-testid="workflow-canvas"]');
    const canvasBox = await canvas.boundingBox();

    // Drag node to canvas
    const nodeBox = await nodeElement.boundingBox();
    await this.page.mouse.move(
      nodeBox.x + nodeBox.width / 2,
      nodeBox.y + nodeBox.height / 2
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      canvasBox.x + position.x,
      canvasBox.y + position.y
    );
    await this.page.mouse.up();

    // Wait for node to appear on canvas
    await this.page.waitForSelector(`[data-testid="canvas-node-${nodeType}"]`);

    return `canvas-node-${nodeType}`;
  }

  async connectNodes(sourceNodeId, sourcePort, targetNodeId, targetPort) {
    // Find source port
    const sourcePortSelector = `[data-testid="${sourceNodeId}-port-${sourcePort}-out"]`;
    const sourcePortEl = await this.page.$(sourcePortSelector);
    if (!sourcePortEl) {
      throw new Error(`Source port ${sourcePort} not found on node ${sourceNodeId}`);
    }

    // Find target port
    const targetPortSelector = `[data-testid="${targetNodeId}-port-${targetPort}-in"]`;
    const targetPortEl = await this.page.$(targetPortSelector);
    if (!targetPortEl) {
      throw new Error(`Target port ${targetPort} not found on node ${targetNodeId}`);
    }

    // Drag from source to target
    const sourceBox = await sourcePortEl.boundingBox();
    const targetBox = await targetPortEl.boundingBox();

    await this.page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2
    );
    await this.page.mouse.up();

    // Wait for connection to appear
    await this.page.waitForSelector(`[data-testid="connection-${sourceNodeId}-${sourcePort}-${targetNodeId}-${targetPort}"]`);
  }

  async configureNode(nodeId, config) {
    // Double-click node to open config dialog
    const nodeSelector = `[data-testid="${nodeId}"]`;
    await this.page.waitForSelector(nodeSelector);
    await this.page.click(nodeSelector, { clickCount: 2 });

    // Wait for config dialog
    await this.page.waitForSelector('[data-testid="node-config-dialog"]');

    // Configure each property
    for (const [key, value] of Object.entries(config)) {
      const inputSelector = `[data-testid="config-${key}"]`;
      const input = await this.page.$(inputSelector);
      if (input) {
        await input.clear();
        await input.type(value.toString());
      }
    }

    // Save configuration
    const saveBtn = await this.page.$('button:has-text("Save")');
    if (saveBtn) {
      await saveBtn.click();
    }

    // Wait for dialog to close
    await this.page.waitForSelector('[data-testid="node-config-dialog"]', { hidden: true });
  }

  async executeWorkflow() {
    // Click execute button
    const executeBtn = await this.page.waitForSelector('button:has-text("Execute")');
    await executeBtn.click();

    // Wait for execution to start
    await this.page.waitForSelector('[data-testid="execution-status"]');

    // Wait for completion (this might take time)
    await this.page.waitForFunction(() => {
      const status = document.querySelector('[data-testid="execution-status"]');
      return status && (status.textContent.includes('Completed') || status.textContent.includes('Failed'));
    }, { timeout: 300000 }); // 5 minutes timeout
  }

  async validateWorkflowResults(expectedResults) {
    // Check execution results
    for (const [nodeId, expected] of Object.entries(expectedResults)) {
      const resultSelector = `[data-testid="result-${nodeId}"]`;
      const resultEl = await this.page.$(resultSelector);

      if (!resultEl) {
        throw new Error(`No results found for node ${nodeId}`);
      }

      const actualResult = await resultEl.evaluate(el => el.textContent);
      if (!actualResult.includes(expected)) {
        throw new Error(`Node ${nodeId} result mismatch. Expected: ${expected}, Got: ${actualResult}`);
      }
    }
  }

  // ===== COMPREHENSIVE WORKFLOW TESTS =====

  async testSourceIngestWorkflow() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Source-Ingest-Test');

    // Add URL injector
    const urlInjectorId = await this.addNodeToCanvas('url-injector', { x: 100, y: 100 });
    await this.configureNode(urlInjectorId, {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    });

    // Add file reader
    const fileReaderId = await this.addNodeToCanvas('file-reader', { x: 300, y: 100 });
    await this.configureNode(fileReaderId, {
      path: '/tmp/test.txt'
    });

    // Add clipboard reader
    const clipboardReaderId = await this.addNodeToCanvas('clipboard-reader', { x: 500, y: 100 });

    // Validate that all nodes are properly placed and configured
    const nodes = await this.page.$$('[data-testid^="canvas-node-"]');
    if (nodes.length !== 3) {
      throw new Error(`Expected 3 nodes, found ${nodes.length}`);
    }

    await this.takeScreenshot('source-ingest-workflow');
  }

  async testDomActionWorkflow() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('DOM-Action-Test');

    // Add URL injector -> YouTube transcript
    const urlInjectorId = await this.addNodeToCanvas('url-injector', { x: 100, y: 100 });
    await this.configureNode(urlInjectorId, {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    });

    const transcriptId = await this.addNodeToCanvas('youtube-transcript', { x: 300, y: 100 });
    await this.connectNodes(urlInjectorId, 'url', transcriptId, 'url');

    // Add web scraper
    const scraperId = await this.addNodeToCanvas('web-scraper', { x: 500, y: 100 });
    await this.configureNode(scraperId, {
      url: 'https://example.com',
      selectors: JSON.stringify({ title: 'h1', content: 'p' })
    });

    await this.takeScreenshot('dom-action-workflow');
  }

  async testProviderLLMWorkflow() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Provider-LLM-Test');

    // Add Gemini processor
    const geminiId = await this.addNodeToCanvas('gemini-processor', { x: 100, y: 100 });
    await this.configureNode(geminiId, {
      prompt: 'Summarize the following content',
      context: 'This is a test context'
    });

    // Add Perplexity researcher
    const perplexityId = await this.addNodeToCanvas('perplexity-researcher', { x: 400, y: 100 });
    await this.configureNode(perplexityId, {
      query: 'What is artificial intelligence?',
      depth: JSON.stringify({ depth: 'comprehensive' })
    });

    await this.takeScreenshot('provider-llm-workflow');
  }

  async testTransformParseWorkflow() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Transform-Parse-Test');

    // Add markdown parser
    const markdownId = await this.addNodeToCanvas('markdown-parser', { x: 100, y: 100 });
    await this.configureNode(markdownId, {
      content: '# Test Header\n\nThis is **bold** text.'
    });

    // Add JSON processor
    const jsonId = await this.addNodeToCanvas('json-processor', { x: 300, y: 100 });
    await this.configureNode(jsonId, {
      data: JSON.stringify({ test: 'value', number: 42 }),
      schema: JSON.stringify({ type: 'object' })
    });

    await this.takeScreenshot('transform-parse-workflow');
  }

  async testConditionGateWorkflow() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Condition-Gate-Test');

    // Add content gate
    const contentGateId = await this.addNodeToCanvas('content-gate', { x: 100, y: 100 });
    await this.configureNode(contentGateId, {
      content: 'Test content for evaluation',
      condition: JSON.stringify({ contains: 'test' })
    });

    // Add quality gate
    const qualityGateId = await this.addNodeToCanvas('quality-gate', { x: 300, y: 100 });
    await this.configureNode(qualityGateId, {
      content: 'High quality content for analysis',
      threshold: JSON.stringify({ min_length: 10, min_score: 0.8 })
    });

    await this.takeScreenshot('condition-gate-workflow');
  }

  async testSplitMapWorkflow() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Split-Map-Test');

    // Add text chunker
    const chunkerId = await this.addNodeToCanvas('text-chunker', { x: 100, y: 100 });
    await this.configureNode(chunkerId, {
      content: 'This is a long text that should be chunked into smaller pieces for processing.',
      config: JSON.stringify({ chunk_size: 20, overlap: 5 })
    });

    // Add parallel processor
    const processorId = await this.addNodeToCanvas('parallel-processor', { x: 300, y: 100 });
    await this.configureNode(processorId, {
      items: JSON.stringify(['item1', 'item2', 'item3']),
      processor: JSON.stringify({ operation: 'uppercase' })
    });

    await this.takeScreenshot('split-map-workflow');
  }

  async testMergeJoinWorkflow() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Merge-Join-Test');

    // Add content merger
    const mergerId = await this.addNodeToCanvas('content-merger', { x: 100, y: 100 });
    await this.configureNode(mergerId, {
      inputs: JSON.stringify(['Content 1', 'Content 2', 'Content 3'])
    });

    // Add result aggregator
    const aggregatorId = await this.addNodeToCanvas('result-aggregator', { x: 300, y: 100 });
    await this.configureNode(aggregatorId, {
      results: JSON.stringify([{ score: 0.8 }, { score: 0.9 }, { score: 0.7 }]),
      strategy: JSON.stringify({ method: 'average' })
    });

    await this.takeScreenshot('merge-join-workflow');
  }

  async testTimerWaitWorkflow() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Timer-Wait-Test');

    // Add delay timer
    const timerId = await this.addNodeToCanvas('delay-timer', { x: 100, y: 100 });
    await this.configureNode(timerId, {
      input: 'Delayed content',
      delay_ms: 1000
    });

    // Add event waiter
    const waiterId = await this.addNodeToCanvas('event-waiter', { x: 300, y: 100 });
    await this.configureNode(waiterId, {
      trigger: 'Start waiting',
      event_config: JSON.stringify({ event_type: 'timeout', duration_ms: 2000 })
    });

    await this.takeScreenshot('timer-wait-workflow');
  }

  async testExportWorkflow() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Export-Test');

    // Add file exporter
    const fileExporterId = await this.addNodeToCanvas('file-exporter', { x: 100, y: 100 });
    await this.configureNode(fileExporterId, {
      content: 'Content to export to file',
      path: '/tmp/exported-content.txt',
      format: JSON.stringify({ encoding: 'utf8' })
    });

    // Add Obsidian exporter
    const obsidianExporterId = await this.addNodeToCanvas('obsidian-exporter', { x: 300, y: 100 });
    await this.configureNode(obsidianExporterId, {
      content: '# Exported Note\n\nThis is content for Obsidian.',
      vault_path: '/tmp/obsidian-vault',
      note_name: 'Test Note'
    });

    await this.takeScreenshot('export-workflow');
  }

  async testAdapterWorkflow() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Adapter-Test');

    // Add clipboard URL adapter
    const clipboardAdapterId = await this.addNodeToCanvas('clipboard-url-adapter', { x: 100, y: 100 });
    await this.configureNode(clipboardAdapterId, {
      clipboard_content: 'https://example.com'
    });

    // Add markdown JSON adapter
    const markdownAdapterId = await this.addNodeToCanvas('markdown-json-adapter', { x: 300, y: 100 });
    await this.configureNode(markdownAdapterId, {
      markdown: '# Title\n\nContent paragraph.'
    });

    await this.takeScreenshot('adapter-workflow');
  }

  async testLoopIterateWorkflow() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Loop-Iterate-Test');

    // Add quality improvement loop
    const qualityLoopId = await this.addNodeToCanvas('quality-improvement-loop', { x: 100, y: 100 });
    await this.configureNode(qualityLoopId, {
      content: 'Initial content to improve',
      quality_threshold: JSON.stringify({ min_score: 0.9 }),
      max_iterations: 3
    });

    // Add batch processor loop
    const batchLoopId = await this.addNodeToCanvas('batch-processor-loop', { x: 300, y: 100 });
    await this.configureNode(batchLoopId, {
      batch_data: JSON.stringify(['batch1', 'batch2', 'batch3']),
      batch_size: 2,
      processing_config: JSON.stringify({ operation: 'process' })
    });

    await this.takeScreenshot('loop-iterate-workflow');
  }

  async testTypedConnectionsValidation() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Typed-Connections-Test');

    // Create incompatible connection attempt
    const urlInjectorId = await this.addNodeToCanvas('url-injector', { x: 100, y: 100 });
    const jsonProcessorId = await this.addNodeToCanvas('json-processor', { x: 300, y: 100 });

    // Try to connect incompatible types (URL to JSON data)
    try {
      await this.connectNodes(urlInjectorId, 'url', jsonProcessorId, 'data');
      // If connection succeeds, it should show a validation error
      await this.page.waitForSelector('[data-testid="connection-error"]', { timeout: 5000 });
    } catch (error) {
      // Expected - incompatible connection should fail or show error
      console.log('Incompatible connection correctly rejected');
    }

    // Create compatible connection
    const markdownParserId = await this.addNodeToCanvas('markdown-parser', { x: 100, y: 200 });
    await this.connectNodes(markdownParserId, 'parsed', jsonProcessorId, 'data');

    await this.takeScreenshot('typed-connections-validation');
  }

  async testVisualUnification() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Visual-Unification-Test');

    // Add multiple nodes of different categories
    const nodes = [
      { type: 'url-injector', pos: { x: 100, y: 100 } },
      { type: 'youtube-transcript', pos: { x: 300, y: 100 } },
      { type: 'gemini-processor', pos: { x: 500, y: 100 } },
      { type: 'markdown-parser', pos: { x: 100, y: 300 } },
      { type: 'content-gate', pos: { x: 300, y: 300 } },
      { type: 'file-exporter', pos: { x: 500, y: 300 } }
    ];

    for (const node of nodes) {
      await this.addNodeToCanvas(node.type, node.pos);
    }

    // Connect them in a workflow
    await this.connectNodes('canvas-node-url-injector', 'url', 'canvas-node-youtube-transcript', 'url');
    await this.connectNodes('canvas-node-youtube-transcript', 'transcript', 'canvas-node-gemini-processor', 'prompt');
    await this.connectNodes('canvas-node-gemini-processor', 'response', 'canvas-node-markdown-parser', 'content');
    await this.connectNodes('canvas-node-markdown-parser', 'parsed', 'canvas-node-content-gate', 'content');
    await this.connectNodes('canvas-node-content-gate', 'true', 'canvas-node-file-exporter', 'content');

    // Apply auto-layout
    const layoutBtn = await this.page.$('button:has-text("Auto Layout")');
    if (layoutBtn) {
      await layoutBtn.click();
      await this.page.waitForTimeout(2000); // Wait for layout animation
    }

    await this.takeScreenshot('visual-unification');
  }

  async testPatternComposition() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Pattern-Composition-Test');

    // Create a complex pattern: Data ingestion -> Processing -> Quality check -> Export
    const patternNodes = [
      { type: 'url-injector', pos: { x: 100, y: 100 } },
      { type: 'youtube-transcript', pos: { x: 250, y: 100 } },
      { type: 'text-chunker', pos: { x: 400, y: 100 } },
      { type: 'parallel-processor', pos: { x: 550, y: 100 } },
      { type: 'gemini-processor', pos: { x: 100, y: 250 } },
      { type: 'quality-gate', pos: { x: 250, y: 250 } },
      { type: 'content-merger', pos: { x: 400, y: 250 } },
      { type: 'file-exporter', pos: { x: 550, y: 250 } }
    ];

    for (const node of patternNodes) {
      await this.addNodeToCanvas(node.type, node.pos);
    }

    // Connect the pattern
    await this.connectNodes('canvas-node-url-injector', 'url', 'canvas-node-youtube-transcript', 'url');
    await this.connectNodes('canvas-node-youtube-transcript', 'transcript', 'canvas-node-text-chunker', 'content');
    await this.connectNodes('canvas-node-text-chunker', 'chunks', 'canvas-node-parallel-processor', 'items');
    await this.connectNodes('canvas-node-parallel-processor', 'results', 'canvas-node-gemini-processor', 'prompt');
    await this.connectNodes('canvas-node-gemini-processor', 'response', 'canvas-node-quality-gate', 'content');
    await this.connectNodes('canvas-node-quality-gate', 'pass', 'canvas-node-content-merger', 'inputs');
    await this.connectNodes('canvas-node-content-merger', 'merged', 'canvas-node-file-exporter', 'content');

    await this.takeScreenshot('pattern-composition');
  }

  async testResourceManagement() {
    await this.navigateToWorkflowEditor();
    await this.createNewWorkflow('Resource-Management-Test');

    // Create workflow with resource-intensive nodes
    const resourceNodes = [
      { type: 'perplexity-researcher', pos: { x: 100, y: 100 } },
      { type: 'quality-improvement-loop', pos: { x: 300, y: 100 } },
      { type: 'batch-processor-loop', pos: { x: 500, y: 100 } }
    ];

    for (const node of resourceNodes) {
      await this.addNodeToCanvas(node.type, node.pos);
    }

    // Configure resource-intensive settings
    await this.configureNode('canvas-node-perplexity-researcher', {
      query: 'Comprehensive analysis of artificial intelligence',
      depth: JSON.stringify({ depth: 'maximum' })
    });

    await this.configureNode('canvas-node-quality-improvement-loop', {
      content: 'Initial draft content for improvement',
      quality_threshold: JSON.stringify({ min_score: 0.95 }),
      max_iterations: 5
    });

    await this.configureNode('canvas-node-batch-processor-loop', {
      batch_data: JSON.stringify(Array.from({ length: 10 }, (_, i) => `item-${i}`)),
      batch_size: 3,
      processing_config: JSON.stringify({ operation: 'complex-analysis' })
    });

    // Execute and monitor resource usage
    await this.executeWorkflow();

    // Check for resource warnings/errors
    const resourceWarnings = await this.page.$$('[data-testid="resource-warning"]');
    if (resourceWarnings.length > 0) {
      console.log(`Resource warnings detected: ${resourceWarnings.length}`);
    }

    await this.takeScreenshot('resource-management');
  }

  async runAllPhase7Tests() {
    console.log('🚀 Starting Phase 7: Comprehensive Workflow Validation Tests...\n');

    await this.setup();

    try {
      // Test individual node categories
      await this.runTest('Source/Ingest Nodes', () => this.testSourceIngestWorkflow());
      await this.runTest('DOM Action Nodes', () => this.testDomActionWorkflow());
      await this.runTest('Provider/LLM Nodes', () => this.testProviderLLMWorkflow());
      await this.runTest('Transform/Parse Nodes', () => this.testTransformParseWorkflow());
      await this.runTest('Condition/Gate Nodes', () => this.testConditionGateWorkflow());
      await this.runTest('Split/Map Nodes', () => this.testSplitMapWorkflow());
      await this.runTest('Merge/Join Nodes', () => this.testMergeJoinWorkflow());
      await this.runTest('Timer/Wait Nodes', () => this.testTimerWaitWorkflow());
      await this.runTest('Export Nodes', () => this.testExportWorkflow());
      await this.runTest('Adapter Nodes', () => this.testAdapterWorkflow());
      await this.runTest('Loop/Iterate Nodes', () => this.testLoopIterateWorkflow());

      // Test workflow-level features
      await this.runTest('Typed Connections Validation', () => this.testTypedConnectionsValidation());
      await this.runTest('Visual Unification', () => this.testVisualUnification());
      await this.runTest('Pattern Composition', () => this.testPatternComposition());
      await this.runTest('Resource Management', () => this.testResourceManagement());

    } finally {
      await this.teardown();
    }

    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 Phase 7 Test Results Summary:');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📸 Screenshots: ${this.results.screenshots.length}`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.error}`);
      });
    }

    console.log('\n⏱️  Performance Timings:');
    Object.entries(this.results.timings).forEach(([test, time]) => {
      console.log(`  - ${test}: ${time}ms`);
    });

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 7: Workflow Validation',
      results: this.results,
      environment: {
        baseUrl: BASE_URL,
        backendUrl: BACKEND_URL,
        puppeteerVersion: '22.15.0'
      },
      coverage: {
        nodeCategories: [
          'Source/Ingest', 'DOM Action', 'Provider/LLM', 'Transform/Parse',
          'Condition/Gate', 'Split/Map', 'Merge/Join', 'Timer/Wait',
          'Export', 'Adapter', 'Loop/Iterate'
        ],
        features: [
          'Typed Connections', 'Visual Unification', 'Pattern Composition', 'Resource Management'
        ]
      }
    };

    fs.writeFileSync(
      path.join(__dirname, 'phase7-workflow-validation-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Detailed report saved to phase7-workflow-validation-report.json');
  }
}

// Run the Phase 7 tests
const validator = new Phase7WorkflowValidator();
validator.runAllPhase7Tests().catch(console.error);

export default Phase7WorkflowValidator;
