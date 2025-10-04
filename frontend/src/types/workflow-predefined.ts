// Predefined Workflows for DataKiln
// These provide the exact node data for simple and deeper research as per Gemini spec

export interface PredefinedWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

export const SIMPLE_DEEP_RESEARCH = {
  id: 'simple-deep',
  name: 'Simple Deep Research',
  description: 'Single Gemini deep research node with full DOM sequence',
  nodes: [
    {
      id: 'deep-1',
      type: 'gemini_deep_research',
      position: { x: 250, y: 200 },
      data: {
        name: 'Deep Research',
        type: 'gemini_deep_research',
        provider_type: 'gemini',
        research_depth: 'balanced',
        query_prompt: 'Enter your research query here...',
        output: 'clipboard',
        actions: [
          { selector: '[contenteditable="true"]', actionType: 'click', value: '', delay: 0 },
          { selector: '[contenteditable="true"]', actionType: 'type', value: '{query_prompt}', delay: 1000 },
          { selector: 'div.label:has-text("Deep Research")', actionType: 'click', value: '', delay: 0 },
          { selector: 'mat-icon[fonticon="send"]', actionType: 'click', value: '', delay: 0 },
          { selector: 'span.mdc-button__label:has-text("Start research")', actionType: 'click', value: '', delay: 5000 },
          { selector: 'span.mat-mdc-list-item-title:has-text("Copy")', actionType: 'click', value: '', delay: 120000 }
        ]
      }
    }
  ],
  edges: []
};

export const DEEPER_RESEARCH = {
  id: 'deeper-research',
  name: 'Deeper Research',
  description: 'Splitter to 3 parallel deep nodes + consolidate + export',
  nodes: [
    // Splitter
    {
      id: 'splitter-1',
      type: 'splitter',
      position: { x: 100, y: 200 },
      data: {
        name: 'Query Splitter',
        type: 'splitter',
        num_splits: 3,
        model: 'gemini-pro',
        structure: 'json_array',
        prompt: 'Take this complex query and split it into 3 separate research tasks. Query: {input_query} Output in structured JSON array with 3 objects, each with "query" field containing a sub-query of 7 questions. Ensure the sub-queries cover the full scope when combined.'
      }
    },
    // 3 Parallel Deep Research Nodes (save to disk)
    {
      id: 'deep-1',
      type: 'gemini_deep_research',
      position: { x: 400, y: 50 },
      data: {
        name: 'Deep Research 1',
        type: 'gemini_deep_research',
        provider_type: 'gemini',
        research_depth: 'deep',
        query_prompt: '{sub_query_1}',
        output: 'file',
        path_key: '/tmp/research_1.md',
        save_intermittently: true,
        actions: [
          { selector: '[contenteditable="true"]', actionType: 'click', value: '', delay: 0 },
          { selector: '[contenteditable="true"]', actionType: 'type', value: '{query_prompt}', delay: 1000 },
          { selector: 'div.label:has-text("Deep Research")', actionType: 'click', value: '', delay: 0 },
          { selector: 'mat-icon[fonticon="send"]', actionType: 'click', value: '', delay: 0 },
          { selector: 'span.mdc-button__label:has-text("Start research")', actionType: 'click', value: '', delay: 5000 },
          { selector: 'span.mat-mdc-list-item-title:has-text("Copy")', actionType: 'click', value: '', delay: 120000 }
        ]
      }
    },
    {
      id: 'deep-2',
      type: 'gemini_deep_research',
      position: { x: 400, y: 200 },
      data: {
        name: 'Deep Research 2',
        type: 'gemini_deep_research',
        provider_type: 'gemini',
        research_depth: 'deep',
        query_prompt: '{sub_query_2}',
        output: 'file',
        path_key: '/tmp/research_2.md',
        save_intermittently: true,
        actions: [
          { selector: '[contenteditable="true"]', actionType: 'click', value: '', delay: 0 },
          { selector: '[contenteditable="true"]', actionType: 'type', value: '{query_prompt}', delay: 1000 },
          { selector: 'div.label:has-text("Deep Research")', actionType: 'click', value: '', delay: 0 },
          { selector: 'mat-icon[fonticon="send"]', actionType: 'click', value: '', delay: 0 },
          { selector: 'span.mdc-button__label:has-text("Start research")', actionType: 'click', value: '', delay: 5000 },
          { selector: 'span.mat-mdc-list-item-title:has-text("Copy")', actionType: 'click', value: '', delay: 120000 }
        ]
      }
    },
    {
      id: 'deep-3',
      type: 'gemini_deep_research',
      position: { x: 400, y: 350 },
      data: {
        name: 'Deep Research 3',
        type: 'gemini_deep_research',
        provider_type: 'gemini',
        research_depth: 'deep',
        query_prompt: '{sub_query_3}',
        output: 'file',
        path_key: '/tmp/research_3.md',
        save_intermittently: true,
        actions: [
          { selector: '[contenteditable="true"]', actionType: 'click', value: '', delay: 0 },
          { selector: '[contenteditable="true"]', actionType: 'type', value: '{query_prompt}', delay: 1000 },
          { selector: 'div.label:has-text("Deep Research")', actionType: 'click', value: '', delay: 0 },
          { selector: 'mat-icon[fonticon="send"]', actionType: 'click', value: '', delay: 0 },
          { selector: 'span.mdc-button__label:has-text("Start research")', actionType: 'click', value: '', delay: 5000 },
          { selector: 'span.mat-mdc-list-item-title:has-text("Copy")', actionType: 'click', value: '', delay: 120000 }
        ]
      }
    },
    // Consolidate
    {
      id: 'consolidate-1',
      type: 'consolidate',
      position: { x: 700, y: 200 },
      data: {
        name: 'Consolidate Results',
        type: 'consolidate',
        model: 'gemini-pro',
        prepend_text: 'Summarize the following 3 research documents and combine their key insights into a comprehensive report. Documents:',
        append_text: '',
        attachments: ['/tmp/research_1.md', '/tmp/research_2.md', '/tmp/research_3.md'],
        output: 'next'
      }
    },
    // Export
    {
      id: 'export-1',
      type: 'export',
      position: { x: 1000, y: 200 },
      data: {
        name: 'Export Report',
        type: 'export',
        format: 'obsidian',
        path_key: '/tmp/final_report.md',
        save_intermittently: true,
        output: 'file'
      }
    }
  ],
  edges: [
    { id: 'split-to-1', source: 'splitter-1', sourceHandle: 'out-0', target: 'deep-1', targetHandle: null },
    { id: 'split-to-2', source: 'splitter-1', sourceHandle: 'out-1', target: 'deep-2', targetHandle: null },
    { id: 'split-to-3', source: 'splitter-1', sourceHandle: 'out-2', target: 'deep-3', targetHandle: null },
    { id: 'deep1-to-cons', source: 'deep-1', target: 'consolidate-1', targetHandle: null },
    { id: 'deep2-to-cons', source: 'deep-2', target: 'consolidate-1', targetHandle: null },
    { id: 'deep3-to-cons', source: 'deep-3', target: 'consolidate-1', targetHandle: null },
    { id: 'cons-to-export', source: 'consolidate-1', target: 'export-1', targetHandle: null }
  ]
};

export const PREDEFINED_WORKFLOWS = {
  simpleDeep: SIMPLE_DEEP_RESEARCH,
  deeper: DEEPER_RESEARCH
};