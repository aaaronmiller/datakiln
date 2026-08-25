# DataKiln Workflow Construction Guide

> **Purpose**: Permanent documentation of workflow construction patterns established through debugging sessions. This document ensures context is preserved across sessions.

---

## Core Concept: Virtual API Engine

DataKiln creates **Virtual APIs** by automating web UIs via browser automation. Instead of using official APIs, we control DOM elements to interact with any web interface (Gemini, Perplexity, Claude, YouTube, eBay, etc.).

### Why Virtual APIs?
- **No rate limits** from API providers
- **Token-free** interactions (browser automation is free)
- **Any website** becomes an API endpoint
- **Chain workflows** for complex automations

---

## Workflow Schema (Authoritative Locations)

| File | Purpose |
|:---|:---|
| `frontend/src/data/WORKFLOW_SCHEMA.json` | Workflow structure definition |
| `frontend/src/data/NODE_REGISTRY.json` | Node types (atoms) |
| `archive/old-specs/contracts/` | Backup copies (V1) |

### Schema Philosophy
- **Functional schema** is the goal (what works, not strict adherence)
- Schema can be adjusted if implementation requires it
- Editor-created workflows should match working automation patterns

---

## 10 Node Types (Atoms)

From `NODE_REGISTRY.json`:

| Node | Purpose | Key Params |
|:---|:---|:---|
| `provider` | AI provider calls | `provider_type`: gemini_deep_research, gemini_canvas, perplexity |
| `dom_action` | Browser automation | `selector_key`, `action`: click/fill/extract/copy |
| `prompt` | Template with structured output | `template_id`, `output_format`: structured |
| `transform` | Data transformation | `transform_type`: markdown, merge, extract_citations |
| `filter` | Data filtering | `filter_type`: condition, regex, jsonpath |
| `condition` | Branching logic | `true_next`, `false_next` |
| `aggregate` | Combine data | `functions`: count, sum, merge |
| `join` | Join data sources | `join_type`: inner, left, right |
| `union` | Combine arrays | `union_mode`: distinct, all |
| `export` | Output to file | `format`: md_yaml, json, markdown |

---

## Gemini Deep Research: 3×6 Edge Case

### The Problem
Gemini Deep Research **always restructures** any query into 6 sub-questions. If you provide:
- **Vague query** → Gemini decides the 6 questions
- **Exactly 6 well-formed questions** (1-2 sentences each) → Gemini uses them **verbatim**

### The Solution
Control what gets researched by providing exactly 6 structured questions per session.

**3 sessions × 6 questions = 18 total research questions**

### Workflow Architecture
```
User Query
    │
    ▼
┌───────────────────────┐
│  prompt (splitter)    │  ← API with structured output → 3×6 JSON
└───────────┬───────────┘
            │
    ┌───────┼───────┐
    ▼       ▼       ▼
┌───────┐ ┌───────┐ ┌───────┐
│Session│ │Session│ │Session│  ← 3 parallel provider nodes
│   1   │ │   2   │ │   3   │    (semaphore: max 3 concurrent)
└───┬───┘ └───┬───┘ └───┬───┘
    │         │         │
    └─────────┼─────────┘
              ▼
    ┌───────────────────┐
    │    aggregate      │  ← Consolidate research
    └─────────┬─────────┘
              ▼
    ┌───────────────────┐
    │     export        │  ← Obsidian MD
    └───────────────────┘
```

### Concurrency Rules (from PLAN.MD)
- **Max 3 parallel** Deep Research sessions (Gemini limit)
- Queue additional sessions until slot opens
- Semaphore controls concurrency in executor

---

## Files Created

| File | Purpose |
|:---|:---|
| `backend/workflows/deep_research_3x6.json` | 3×6 workflow definition |
| `backend/workflows/youtube_transcript_analysis.json` | YouTube→Gemini workflow |
| `backend/data/prompt_templates.json` | Prompt templates registry |

---

## Executor Fixes Applied

| Fix | Location |
|:---|:---|
| asyncio import | `nodes/base_node.py` |
| Browser auto-launch | `executor.py:270-285` |
| Context assignment | `executor.py:283` (`.context` not `.browser`) |
| Outputs dict/list | `executor.py:383-397` |
| Error handler | `executor.py:603-615` |
| selector_definition init | `nodes/dom_action_node.py:157` |
| path_key default | `nodes/export_node.py:19` |

---

## Validation Status

| Workflow | Status | Notes |
|:---|:---|:---|
| Deep Research | ✅ 3/3 | Browser automation working |
| YouTube | ✅ 3/3 | 33,571 char transcript → analysis |
| 3×6 Structured | 🔧 WIP | Workflow created, testing pending |

---

## Key Contacts / References

- **PLAN.MD**: `archive/old-specs/reference_old/build_docs_CURRENT/PLAN.MD`
- **UX Proposal**: `archive/old-specs/ux-proposal-review.md`
- **Consolidated PRD**: `archive/consolidated-prd.md`
- **DOM Selectors**: `docs/GEMINI_DOM_SELECTORS.md`

---

## Research Mode Parameters (from PLAN.MD)

| Mode | Concurrent | Follow-ups | Recursion | Time |
|:---|:---|:---|:---|:---|
| **Fast** | 3 | 2-3 | No | 1-3 min |
| **Balanced** | 7 | 3-5 | No | 3-6 min |
| **Comprehensive** | 5 | 5-7 | Yes | 5-12 min |

---

## YAML Frontmatter Spec (Obsidian Output)

All research outputs must include:
```yaml
---
title: "Research Title"
ai_summary: "Brief summary"
ai_sources: ["url1", "url2"]
username: "operator"
generator: "DataKiln vX.X"
tags: ["research", "topic"]
batch_uuid: "uuid-here"
created_at: "ISO-8601"
---
```

---

## Chrome Extension Workflow

Capture AI chats from any supported provider:

| Provider | Selector | URL Pattern |
|:---|:---|:---|
| Gemini | `gemini.google.com` | Auto-detect |
| Claude | `claude.ai` | Auto-detect |
| ChatGPT | `chat.openai.com` | Auto-detect |
| Perplexity | `perplexity.ai` | Auto-detect |

**Flow**: Capture → HTML→Markdown → YAML frontmatter → Download → Obsidian Mover

---

## Adversarial Validation Checklist

- [ ] All 10 node types documented
- [ ] 3×6 edge case explained
- [ ] Concurrency limits specified (max 3)
- [ ] Mode parameters documented
- [ ] YAML frontmatter spec complete
- [ ] Executor fixes listed
- [ ] Working workflows reference

---

*Last updated: 2024-12-07 by workflow debugging session*
*Adversarially validated against: PLAN.MD, NODE_REGISTRY.json, ux-proposal-review.md*

---

## 8. Executor Implementation Notes

### Sequential Execution Strategy
Instead of complex semaphore logic, the `WorkflowExecutor` uses **Topological Sort** to linearize the workflow graph.
- **Max Concurrency:** 1 (Sequential)
- **Rationale:** Prevents browser instability and rate-limiting bans. Satisfies strict "Max 3" requirement.
- **Latency:** Total time = Sum(Session 1, Session 2, Session 3). This is acceptable for deep research where reliability > speed.

### Browser Session Isolation
To ensure the 3 research sessions don't pollute each other's chat context:
- **Mechanic:** The `perform_deep_research` function forces navigation to `/app` at the start of *every* research node.
- **Context Reuse:** The underlying Playwright `BrowserContext` is reused (keeping login cookies), but the `Page` is navigated to a fresh state.
