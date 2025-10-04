// Comprehensive Node Definitions
// Predefined signatures for all node taxonomy categories from workflow_model.md

import {
  NodeCategory,
  NodeSignature,
  SideEffectClass,
  ConcurrencyClass,
  NodePort,
  NodeCapabilities
} from './node-signatures.js';
import { DataKind } from './data-kinds.js';

// Helper function to create node ports
function createPort(
  id: string,
  name: string,
  dataKind: DataKind,
  required: boolean = true,
  description?: string,
  defaultValue?: any
): NodePort {
  return {
    id,
    name,
    dataKind,
    required,
    description,
    default_value: defaultValue
  };
}

// Helper function to create capabilities
function createCapabilities(
  sideEffects: SideEffectClass[],
  concurrency: ConcurrencyClass = ConcurrencyClass.SHARED,
  resources: any = {}
): NodeCapabilities {
  return {
    side_effects: sideEffects,
    concurrency,
    resources: {
      timeout_ms: 30000, // Default 30s timeout
      ...resources
    },
    retry_policy: {
      max_attempts: 3,
      base_delay_ms: 1000,
      max_delay_ms: 10000,
      backoff_multiplier: 2
    }
  };
}

// ===== SOURCE/INGEST NODES =====

export const SOURCE_NODES: Record<string, NodeSignature> = {
  'url-injector': {
    category: NodeCategory.SOURCE_INGEST,
    inputs: [],
    outputs: [
      createPort('url', 'URL', DataKind.HTML_URL, true, 'YouTube video URL to process')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'URL Injector',
      description: 'Injects a YouTube URL for processing',
      version: '1.0.0',
      tags: ['source', 'youtube', 'url']
    },
    ui_hints: {
      icon: 'link',
      color: '#4CAF50',
      shape: 'circle'
    }
  },

  'file-reader': {
    category: NodeCategory.SOURCE_INGEST,
    inputs: [],
    outputs: [
      createPort('content', 'File Content', DataKind.TEXT_PLAIN, true, 'Content of the read file'),
      createPort('path', 'File Path', DataKind.FILE_PATH, true, 'Path to the file')
    ],
    capabilities: createCapabilities([SideEffectClass.SYSTEM_READ]),
    metadata: {
      name: 'File Reader',
      description: 'Reads content from a file on disk',
      version: '1.0.0',
      tags: ['source', 'file', 'read']
    },
    ui_hints: {
      icon: 'file',
      color: '#2196F3',
      shape: 'circle'
    }
  },

  'clipboard-reader': {
    category: NodeCategory.SOURCE_INGEST,
    inputs: [],
    outputs: [
      createPort('content', 'Clipboard Content', DataKind.DOM_CLIPBOARD, true, 'Content from system clipboard')
    ],
    capabilities: createCapabilities([SideEffectClass.SYSTEM_READ]),
    metadata: {
      name: 'Clipboard Reader',
      description: 'Reads content from the system clipboard',
      version: '1.0.0',
      tags: ['source', 'clipboard', 'system']
    },
    ui_hints: {
      icon: 'clipboard',
      color: '#FF9800',
      shape: 'circle'
    }
  }
};

// ===== DOM ACTION NODES =====

export const DOM_ACTION_NODES: Record<string, NodeSignature> = {
  'youtube-transcript': {
    category: NodeCategory.DOM_ACTION,
    inputs: [
      createPort('url', 'Video URL', DataKind.HTML_URL, true, 'YouTube video URL')
    ],
    outputs: [
      createPort('transcript', 'Transcript', DataKind.TRANSCRIPT_VTT, true, 'Video transcript in VTT format'),
      createPort('metadata', 'Video Metadata', DataKind.JSON, false, 'Video title, duration, etc.')
    ],
    capabilities: createCapabilities(
      [SideEffectClass.BROWSER_INTERACT, SideEffectClass.REMOTE_INVOKE],
      ConcurrencyClass.EXCLUSIVE,
      {
        browser_contexts: 1,
        pages: 1,
        timeout_ms: 120000 // 2 minutes for video loading
      }
    ),
    metadata: {
      name: 'YouTube Transcript Extractor',
      description: 'Extracts transcript from YouTube videos using browser automation',
      version: '1.0.0',
      tags: ['youtube', 'transcript', 'browser', 'automation']
    },
    ui_hints: {
      icon: 'video',
      color: '#FF0000',
      shape: 'rectangle'
    }
  },

  'web-scraper': {
    category: NodeCategory.DOM_ACTION,
    inputs: [
      createPort('url', 'Target URL', DataKind.URI, true, 'URL to scrape'),
      createPort('selectors', 'CSS Selectors', DataKind.JSON, false, 'Selectors for data extraction')
    ],
    outputs: [
      createPort('content', 'Page Content', DataKind.TEXT_PLAIN, true, 'Extracted text content'),
      createPort('html', 'HTML Content', DataKind.HTML_URL, false, 'Full HTML content'),
      createPort('data', 'Structured Data', DataKind.JSON, false, 'Structured data extraction')
    ],
    capabilities: createCapabilities(
      [SideEffectClass.BROWSER_INTERACT],
      ConcurrencyClass.EXCLUSIVE,
      {
        browser_contexts: 1,
        pages: 1,
        timeout_ms: 60000
      }
    ),
    metadata: {
      name: 'Web Scraper',
      description: 'Scrapes content from web pages using browser automation',
      version: '1.0.0',
      tags: ['web', 'scraper', 'browser', 'automation']
    },
    ui_hints: {
      icon: 'globe',
      color: '#9C27B0',
      shape: 'rectangle'
    }
  }
};

// ===== PROVIDER/LLM NODES =====

export const PROVIDER_LLM_NODES: Record<string, NodeSignature> = {
  'gemini-processor': {
    category: NodeCategory.PROVIDER_LLM,
    inputs: [
      createPort('prompt', 'Prompt', DataKind.TEXT_PLAIN, true, 'Text prompt for the model'),
      createPort('attachments', 'Attachments', DataKind.ARTIFACT_REF, false, 'File attachments'),
      createPort('context', 'Context', DataKind.TEXT_SEMANTIC, false, 'Additional context')
    ],
    outputs: [
      createPort('response', 'Response', DataKind.TEXT_MARKDOWN, true, 'Model response'),
      createPort('metadata', 'Response Metadata', DataKind.JSON, false, 'Token usage, cost, etc.')
    ],
    capabilities: createCapabilities(
      [SideEffectClass.REMOTE_INVOKE],
      ConcurrencyClass.SHARED,
      {
        sessions: 1,
        timeout_ms: 120000,
        cost_limits: {
          max_cost_usd: 1.0,
          cost_per_request_usd: 0.01
        }
      }
    ),
    metadata: {
      name: 'Gemini AI Processor',
      description: 'Processes requests using Google Gemini AI models',
      version: '1.0.0',
      tags: ['ai', 'gemini', 'llm', 'google']
    },
    ui_hints: {
      icon: 'brain',
      color: '#4285F4',
      shape: 'rectangle'
    }
  },

  'perplexity-researcher': {
    category: NodeCategory.PROVIDER_LLM,
    inputs: [
      createPort('query', 'Research Query', DataKind.TEXT_PLAIN, true, 'Research question or topic'),
      createPort('depth', 'Research Depth', DataKind.JSON, false, 'Research parameters')
    ],
    outputs: [
      createPort('research', 'Research Results', DataKind.TEXT_SEMANTIC, true, 'Comprehensive research response'),
      createPort('sources', 'Source Links', DataKind.JSON, false, 'Referenced sources'),
      createPort('metadata', 'Research Metadata', DataKind.JSON, false, 'Research statistics')
    ],
    capabilities: createCapabilities(
      [SideEffectClass.REMOTE_INVOKE],
      ConcurrencyClass.SHARED,
      {
        sessions: 1,
        timeout_ms: 300000, // 5 minutes for deep research
        cost_limits: {
          max_cost_usd: 5.0,
          cost_per_request_usd: 0.05
        }
      }
    ),
    metadata: {
      name: 'Perplexity Deep Research',
      description: 'Conducts deep research using Perplexity AI',
      version: '1.0.0',
      tags: ['research', 'perplexity', 'ai', 'deep-research']
    },
    ui_hints: {
      icon: 'search',
      color: '#00D4AA',
      shape: 'rectangle'
    }
  }
};

// ===== TRANSFORM/PARSE NODES =====

export const TRANSFORM_PARSE_NODES: Record<string, NodeSignature> = {
  'markdown-parser': {
    category: NodeCategory.TRANSFORM_PARSE,
    inputs: [
      createPort('content', 'Markdown Content', DataKind.TEXT_MARKDOWN, true, 'Markdown text to parse')
    ],
    outputs: [
      createPort('parsed', 'Parsed Content', DataKind.TEXT_SEMANTIC, true, 'Parsed semantic content'),
      createPort('metadata', 'Content Metadata', DataKind.JSON, false, 'Structure information')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'Markdown Parser',
      description: 'Parses markdown content into structured semantic data',
      version: '1.0.0',
      tags: ['markdown', 'parser', 'transform', 'pure']
    },
    ui_hints: {
      icon: 'code',
      color: '#607D8B',
      shape: 'rectangle'
    }
  },

  'json-processor': {
    category: NodeCategory.TRANSFORM_PARSE,
    inputs: [
      createPort('data', 'JSON Data', DataKind.JSON, true, 'JSON data to process'),
      createPort('schema', 'Schema', DataKind.JSON, false, 'JSON schema for validation')
    ],
    outputs: [
      createPort('processed', 'Processed Data', DataKind.JSON, true, 'Transformed JSON data'),
      createPort('valid', 'Validation Result', DataKind.JSON, false, 'Schema validation results')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'JSON Processor',
      description: 'Processes and transforms JSON data structures',
      version: '1.0.0',
      tags: ['json', 'transform', 'processor', 'pure']
    },
    ui_hints: {
      icon: 'database',
      color: '#FFC107',
      shape: 'rectangle'
    }
  }
};

// ===== CONDITION/GATE NODES =====

export const CONDITION_GATE_NODES: Record<string, NodeSignature> = {
  'content-gate': {
    category: NodeCategory.CONDITION_GATE,
    inputs: [
      createPort('content', 'Content', DataKind.TEXT_PLAIN, true, 'Content to evaluate'),
      createPort('condition', 'Condition', DataKind.JSON, true, 'Condition rules')
    ],
    outputs: [
      createPort('true', 'True Path', DataKind.TEXT_PLAIN, true, 'Content passes condition'),
      createPort('false', 'False Path', DataKind.TEXT_PLAIN, true, 'Content fails condition')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'Content Gate',
      description: 'Routes content based on conditional evaluation',
      version: '1.0.0',
      tags: ['condition', 'gate', 'routing', 'logic']
    },
    ui_hints: {
      icon: 'git-branch',
      color: '#FF5722',
      shape: 'diamond'
    }
  },

  'quality-gate': {
    category: NodeCategory.CONDITION_GATE,
    inputs: [
      createPort('content', 'Content', DataKind.TEXT_SEMANTIC, true, 'Content to evaluate'),
      createPort('threshold', 'Quality Threshold', DataKind.JSON, true, 'Quality criteria')
    ],
    outputs: [
      createPort('pass', 'Pass', DataKind.TEXT_SEMANTIC, true, 'Content meets quality threshold'),
      createPort('fail', 'Fail', DataKind.TEXT_SEMANTIC, true, 'Content fails quality check')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'Quality Gate',
      description: 'Evaluates content quality against thresholds',
      version: '1.0.0',
      tags: ['quality', 'gate', 'evaluation', 'threshold']
    },
    ui_hints: {
      icon: 'check-circle',
      color: '#4CAF50',
      shape: 'diamond'
    }
  }
};

// ===== SPLIT/MAP NODES =====

export const SPLIT_MAP_NODES: Record<string, NodeSignature> = {
  'text-chunker': {
    category: NodeCategory.SPLIT_MAP,
    inputs: [
      createPort('content', 'Content', DataKind.TEXT_PLAIN, true, 'Text to chunk'),
      createPort('config', 'Chunk Config', DataKind.JSON, false, 'Chunking parameters')
    ],
    outputs: [
      createPort('chunks', 'Text Chunks', DataKind.JSON, true, 'Array of text chunks')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'Text Chunker',
      description: 'Splits text content into manageable chunks',
      version: '1.0.0',
      tags: ['split', 'chunk', 'text', 'processing']
    },
    ui_hints: {
      icon: 'split',
      color: '#9C27B0',
      shape: 'rectangle'
    }
  },

  'parallel-processor': {
    category: NodeCategory.SPLIT_MAP,
    inputs: [
      createPort('items', 'Items', DataKind.JSON, true, 'Array of items to process'),
      createPort('processor', 'Processor Config', DataKind.JSON, true, 'Processing configuration')
    ],
    outputs: [
      createPort('results', 'Results', DataKind.JSON, true, 'Array of processing results')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE], ConcurrencyClass.SHARED),
    metadata: {
      name: 'Parallel Processor',
      description: 'Processes multiple items in parallel',
      version: '1.0.0',
      tags: ['parallel', 'processing', 'map', 'batch']
    },
    ui_hints: {
      icon: 'zap',
      color: '#FFC107',
      shape: 'rectangle'
    }
  }
};

// ===== MERGE/JOIN NODES =====

export const MERGE_JOIN_NODES: Record<string, NodeSignature> = {
  'content-merger': {
    category: NodeCategory.MERGE_JOIN,
    inputs: [
      createPort('inputs', 'Input Contents', DataKind.JSON, true, 'Array of content inputs')
    ],
    outputs: [
      createPort('merged', 'Merged Content', DataKind.TEXT_PLAIN, true, 'Merged content'),
      createPort('metadata', 'Merge Metadata', DataKind.JSON, false, 'Merge operation details')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'Content Merger',
      description: 'Merges multiple content inputs into a single output',
      version: '1.0.0',
      tags: ['merge', 'join', 'combine', 'aggregate']
    },
    ui_hints: {
      icon: 'merge',
      color: '#3F51B5',
      shape: 'rectangle'
    }
  },

  'result-aggregator': {
    category: NodeCategory.MERGE_JOIN,
    inputs: [
      createPort('results', 'Results', DataKind.JSON, true, 'Array of processing results'),
      createPort('strategy', 'Aggregation Strategy', DataKind.JSON, false, 'How to aggregate results')
    ],
    outputs: [
      createPort('aggregated', 'Aggregated Result', DataKind.JSON, true, 'Aggregated result'),
      createPort('summary', 'Summary', DataKind.JSON, false, 'Aggregation summary')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'Result Aggregator',
      description: 'Aggregates multiple processing results',
      version: '1.0.0',
      tags: ['aggregate', 'reduce', 'combine', 'results']
    },
    ui_hints: {
      icon: 'plus-circle',
      color: '#009688',
      shape: 'rectangle'
    }
  }
};

// ===== TIMER/WAIT NODES =====

export const TIMER_WAIT_NODES: Record<string, NodeSignature> = {
  'delay-timer': {
    category: NodeCategory.TIMER_WAIT,
    inputs: [
      createPort('input', 'Input', DataKind.TEXT_PLAIN, true, 'Input to delay'),
      createPort('delay_ms', 'Delay (ms)', DataKind.JSON, false, 'Delay duration in milliseconds')
    ],
    outputs: [
      createPort('output', 'Output', DataKind.TEXT_PLAIN, true, 'Delayed output'),
      createPort('timing', 'Timing Metadata', DataKind.JSON, false, 'Timing information')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'Delay Timer',
      description: 'Introduces a configurable delay in the workflow',
      version: '1.0.0',
      tags: ['timer', 'delay', 'wait', 'timing']
    },
    ui_hints: {
      icon: 'clock',
      color: '#795548',
      shape: 'rectangle'
    }
  },

  'event-waiter': {
    category: NodeCategory.TIMER_WAIT,
    inputs: [
      createPort('trigger', 'Trigger', DataKind.TEXT_PLAIN, true, 'Trigger input'),
      createPort('event_config', 'Event Config', DataKind.JSON, true, 'Event waiting configuration')
    ],
    outputs: [
      createPort('result', 'Result', DataKind.TEXT_PLAIN, true, 'Result after event'),
      createPort('event_data', 'Event Data', DataKind.JSON, false, 'Event details')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'Event Waiter',
      description: 'Waits for external events or conditions',
      version: '1.0.0',
      tags: ['event', 'wait', 'external', 'async']
    },
    ui_hints: {
      icon: 'bell',
      color: '#E91E63',
      shape: 'rectangle'
    }
  }
};

// ===== EXPORT NODES =====

export const EXPORT_NODES: Record<string, NodeSignature> = {
  'file-exporter': {
    category: NodeCategory.EXPORT,
    inputs: [
      createPort('content', 'Content', DataKind.TEXT_PLAIN, true, 'Content to export'),
      createPort('path', 'File Path', DataKind.FILE_PATH, true, 'Destination file path'),
      createPort('format', 'Format', DataKind.JSON, false, 'Export format options')
    ],
    outputs: [
      createPort('artifact', 'Artifact Reference', DataKind.ARTIFACT_REF, true, 'Reference to exported file')
    ],
    capabilities: createCapabilities([SideEffectClass.SYSTEM_WRITE]),
    metadata: {
      name: 'File Exporter',
      description: 'Exports content to files on disk',
      version: '1.0.0',
      tags: ['export', 'file', 'write', 'save']
    },
    ui_hints: {
      icon: 'save',
      color: '#607D8B',
      shape: 'rectangle'
    }
  },

  'obsidian-exporter': {
    category: NodeCategory.EXPORT,
    inputs: [
      createPort('content', 'Content', DataKind.TEXT_MARKDOWN, true, 'Markdown content to export'),
      createPort('vault_path', 'Vault Path', DataKind.FILE_PATH, true, 'Obsidian vault path'),
      createPort('note_name', 'Note Name', DataKind.TEXT_PLAIN, true, 'Note filename')
    ],
    outputs: [
      createPort('note_ref', 'Note Reference', DataKind.ARTIFACT_REF, true, 'Reference to created note')
    ],
    capabilities: createCapabilities([SideEffectClass.SYSTEM_WRITE]),
    metadata: {
      name: 'Obsidian Exporter',
      description: 'Exports content to Obsidian vault notes',
      version: '1.0.0',
      tags: ['obsidian', 'export', 'markdown', 'notes']
    },
    ui_hints: {
      icon: 'book',
      color: '#7B1FA2',
      shape: 'rectangle'
    }
  }
};

// ===== ADAPTER NODES =====

export const ADAPTER_NODES: Record<string, NodeSignature> = {
  'clipboard-url-adapter': {
    category: NodeCategory.ADAPTER,
    inputs: [
      createPort('clipboard_content', 'Clipboard Content', DataKind.DOM_CLIPBOARD, true, 'Content from clipboard')
    ],
    outputs: [
      createPort('url', 'URL', DataKind.HTML_URL, true, 'Extracted URL')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'Clipboard to URL Adapter',
      description: 'Converts clipboard content to URL format',
      version: '1.0.0',
      tags: ['adapter', 'clipboard', 'url', 'conversion']
    },
    ui_hints: {
      icon: 'arrow-right',
      color: '#FF9800',
      shape: 'rectangle'
    }
  },

  'markdown-json-adapter': {
    category: NodeCategory.ADAPTER,
    inputs: [
      createPort('markdown', 'Markdown', DataKind.TEXT_MARKDOWN, true, 'Markdown content')
    ],
    outputs: [
      createPort('json', 'JSON', DataKind.JSON, true, 'Structured JSON data')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'Markdown to JSON Adapter',
      description: 'Converts markdown to structured JSON',
      version: '1.0.0',
      tags: ['adapter', 'markdown', 'json', 'conversion']
    },
    ui_hints: {
      icon: 'shuffle',
      color: '#009688',
      shape: 'rectangle'
    }
  }
};

// ===== LOOP/ITERATE NODES =====

export const LOOP_ITERATE_NODES: Record<string, NodeSignature> = {
  'quality-improvement-loop': {
    category: NodeCategory.LOOP_ITERATE,
    inputs: [
      createPort('content', 'Content', DataKind.TEXT_SEMANTIC, true, 'Content to improve'),
      createPort('quality_threshold', 'Quality Threshold', DataKind.JSON, true, 'Quality criteria'),
      createPort('max_iterations', 'Max Iterations', DataKind.JSON, false, 'Maximum loop iterations')
    ],
    outputs: [
      createPort('improved_content', 'Improved Content', DataKind.TEXT_SEMANTIC, true, 'Quality-improved content'),
      createPort('iterations', 'Iteration Count', DataKind.JSON, false, 'Number of iterations performed'),
      createPort('quality_scores', 'Quality Scores', DataKind.JSON, false, 'Quality scores per iteration')
    ],
    capabilities: createCapabilities(
      [SideEffectClass.NONE],
      ConcurrencyClass.SERIAL,
      {
        timeout_ms: 600000 // 10 minutes for iterative improvement
      }
    ),
    metadata: {
      name: 'Quality Improvement Loop',
      description: 'Iteratively improves content quality until threshold is met',
      version: '1.0.0',
      tags: ['loop', 'quality', 'improvement', 'iteration']
    },
    ui_hints: {
      icon: 'refresh',
      color: '#F44336',
      shape: 'rectangle'
    }
  },

  'batch-processor-loop': {
    category: NodeCategory.LOOP_ITERATE,
    inputs: [
      createPort('batch_data', 'Batch Data', DataKind.JSON, true, 'Data to process in batches'),
      createPort('batch_size', 'Batch Size', DataKind.JSON, false, 'Size of each processing batch'),
      createPort('processing_config', 'Processing Config', DataKind.JSON, true, 'How to process each batch')
    ],
    outputs: [
      createPort('processed_batches', 'Processed Batches', DataKind.JSON, true, 'Results from all batches'),
      createPort('batch_summary', 'Batch Summary', DataKind.JSON, false, 'Processing summary')
    ],
    capabilities: createCapabilities([SideEffectClass.NONE]),
    metadata: {
      name: 'Batch Processor Loop',
      description: 'Processes data in configurable batches with iteration control',
      version: '1.0.0',
      tags: ['loop', 'batch', 'processing', 'iteration']
    },
    ui_hints: {
      icon: 'repeat',
      color: '#673AB7',
      shape: 'rectangle'
    }
  }
};

// ===== COMPREHENSIVE NODE REGISTRY =====

export const NODE_SIGNATURES: Record<string, NodeSignature> = {
  ...SOURCE_NODES,
  ...DOM_ACTION_NODES,
  ...PROVIDER_LLM_NODES,
  ...TRANSFORM_PARSE_NODES,
  ...CONDITION_GATE_NODES,
  ...SPLIT_MAP_NODES,
  ...MERGE_JOIN_NODES,
  ...TIMER_WAIT_NODES,
  ...EXPORT_NODES,
  ...ADAPTER_NODES,
  ...LOOP_ITERATE_NODES
};

// Helper to get nodes by category
export function getNodesByCategory(category: NodeCategory): Record<string, NodeSignature> {
  return Object.fromEntries(
    Object.entries(NODE_SIGNATURES).filter(([_, sig]) => sig.category === category)
  );
}

// Helper to get all node types
export function getAllNodeTypes(): string[] {
  return Object.keys(NODE_SIGNATURES);
}