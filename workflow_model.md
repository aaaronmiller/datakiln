This document proposes a formal, type-safe workflow model with gates, loops, and parallelism that maps directly onto DataKiln’s React Flow canvas and FastAPI/Playwright runner, enabling compatibility checks, auto-suggestions, and future expansion without rewrites.consolidated-prd.md[reactflow](https://reactflow.dev/api-reference/react-flow)  
This blueprint defines node/port types, a data-kind lattice, execution semantics, validation rules, and observability contracts so non-functional structures are detected early and repair paths are suggested automatically at design time and during runs.consolidated-contract.md[fastapi.tiangolo](https://fastapi.tiangolo.com/advanced/websockets/)

## Core graph model

- Workflow is a typed directed multigraph G=(V,E)G=(V,E)G=(V,E) where each node v∈Vv\in Vv∈V has a signature ⟨I,O,C⟩\langle I,O,C\rangle⟨I,O,C⟩ of input ports III, output ports OOO, and capabilities CCC governing side‑effects and resources.[reactflow](https://reactflow.dev/api-reference/react-flow)consolidated-prd.md
    
- Edges connect output ports to input ports and are valid only if their data kinds are identical or there exists a total or partial coercion defined by the type lattice TTT and adapter catalog AAA (defined below).consolidated-prd.md+1
    
- Execution order defaults to a topological sort of GGG with explicit Loop nodes enabling cycles under guarded conditions to preserve determinism and halting behavior.[fastapi.tiangolo](https://fastapi.tiangolo.com/advanced/websockets/)consolidated-prd.md
    

## Data-kind lattice and coercions

- Define a partially ordered set TTT of DataKinds with subtyping: text/plain ⊑ text/markdown ⊑ text/semantic, html/url ⊑ uri, json ⊑ text/plain, file/path, dom/clipboard, dom/element, bytes/blob, transcript/vtt, and artifact/ref as a handle into persisted storage.consolidated-contract.md+1
    
- Each port is annotated with an element of TTT plus optional facets (encoding, locale, mime), and coercions are edges in a coercion graph A⊆T×TA\subseteq T\times TA⊆T×T implemented as explicit Adapter nodes or implicit compile‑time insertions where safe and side‑effect free.consolidated-prd.md+1
    
- Unsafe coercions (e.g., dom/clipboard → html/url) require user consent or auto‑suggested adapters that parse/transform content, keeping validation deterministic and explainable.consolidated-contract.md+1
    

## Node taxonomy and signatures

- Source/Ingest nodes: produce data without inputs (e.g., YTT URL injector, file reader, clipboard reader) with outputs in html/url, file/path, or text/plain and side‑effect class “none” or “system-read”.selectors.json+1
    
- DOM Action nodes: orchestrate Playwright steps on providers and return observed text, HTML, or artifact refs, with side‑effect class “browser-interact” and capability C requiring session and selectors.[fastapi.tiangolo](https://fastapi.tiangolo.com/advanced/websockets/)consolidated-prd.md
    
- Provider/LLM nodes: accept prompts, attachments, and model options, emitting text/markdown or JSON with side‑effect class “remote-invoke” and optional cost metadata.consolidated-prd.md+1
    
- Transform/Parse nodes: pure functions mapping between data kinds (e.g., markdown→json via extractors), side‑effect class “pure”, enabling fusion and parallelization.consolidated-tasks.md+1
    
- Condition/Gate nodes: boolean predicates on payload or metadata to branch control flow, with optional debounce/time‑window facets for stability.consolidated-contract.md+1
    
- Split/Map nodes: fan‑out one input into N branches by rule (e.g., chunking, routing by classifier) and fan‑in via Merge/Join with configurable associativity and backpressure.consolidated-prd.md+1
    
- Timer/Wait nodes: introduce deterministic delays or await external events with timeout and retry policy, emitting timing metadata downstream.DEPLOYMENT_CHECKLIST.md+1
    
- Export nodes: persist to filesystem, Obsidian, or clipboard, emitting artifact/ref with provenance YAML and integrity hashes, side‑effect class “system-write”.DEPLOYMENT_CHECKLIST.md+1
    
- Adapter nodes: explicit coercions between types (e.g., clipboard_text → url_param, markdown → json), improving explainability for auto‑repairs and validation suggestions.selectors.json+1
    
- Loop/Iterate nodes: bounded iterative patterns (e.g., while quality<τ, re‑prompt) with measure functions to guarantee termination or explicit max-iterations.consolidated-tasks.md+1
    

## Port contracts and capabilities

- Port contract = ⟨dataKind, facets, constraints⟩ where constraints include size bounds, schema references (for JSON), and sanitization requirements tied to provider/security policy.consolidated-contract.md+1
    
- Capabilities C declare side‑effects (read/write/network), concurrency class (exclusive/shared), and resource budgets (browser contexts, timeouts), enabling a scheduler to respect provider session limits and avoid flapping.DEPLOYMENT_CHECKLIST.md+1
    
- Compatibility rule: an edge is admissible iff outputKind ⊑ inputKind or there exists an adapter chain A⋆ within a maximum cost bound, otherwise the editor flags an error and proposes the least‑cost adapter sequence.consolidated-prd.md+1
    

## Execution semantics and scheduling

- Operational semantics are a labeled transition system where states carry run id, ready set, in‑flight tasks, and artifact store, and transitions are triggered by event labels from the runner (node_started, step_log, node_succeeded, node_failed).[fastapi.tiangolo](https://fastapi.tiangolo.com/advanced/websockets/)consolidated-contract.md
    
- Default scheduler executes the ready frontier in parallel up to resource budgets, applying fan‑out for independent branches and honoring Merge/Join barriers with configurable quorum (all/first/n‑of‑m).DEPLOYMENT_CHECKLIST.md+1
    
- Long-running nodes (Deep Research, approvals) emit heartbeat and progress events on the WebSocket, preserving UI responsiveness and enabling retries/backoff decisions from policy.[fastapi.tiangolo](https://fastapi.tiangolo.com/advanced/websockets/)consolidated-prd.md
    

## DOM action grammar and ordering

- A DOM Action node contains an ordered sequence over the action alphabet Σ = {goto, waitFor, click, fill, press, select, upload, evaluate, copy, capture}, each annotated with locator strategy, timeout, delayAfter, and retry.selectors.json+1
    
- Valid sequence constraints: goto precedes interactions, waitFor must reference future interactions, copy/capture typically terminal unless explicitly interleaved for staged captures, and approval clicks are guarded by timed waits from provider defaults.selectors.json+1
    
- Locators resolve from the provider registry (selectors.json) with fallback chains and late binding to Playwright locators, emitting resolution logs for debuggability.SYSTEM_STATUS_REPORT.md+1
    

## LLM node semantics

- Prompt template PPP is a function of inputs and metadata P(x,m)P(x,m)P(x,m) with a schema ensuring deterministic render before call, plus model selection and tool/attachment lists, producing either text/markdown or JSON by schema.consolidated-contract.md+1
    
- System/assistant scaffolding is part of node configuration, with guardrails on max tokens/cost and an optional quality assessor downstream to form a bounded improvement loop.consolidated-tasks.md+1
    
- Attachments are artifact/refs with mime and length facets, validated before submission and cached for replays with provenance to support reproducibility.DEPLOYMENT_CHECKLIST.md+1
    

## Validation and auto-repair

- Static checker verifies port compatibility, presence of required capabilities, and acyclicity except at declared Loop nodes with bounded conditions, annotating edges with inferred coercions or raising errors.consolidated-prd.md+1
    
- Dynamic validator subscribes to runner events and correlates step failures with selector registry and timing policy, proposing on-the-fly fixes (e.g., extend timeout, switch fallback locator) in the editor.SYSTEM_STATUS_REPORT.md+1
    
- Suggestion engine computes least‑cost adapter chains from A using Dijkstra over coercion graph with edge weights derived from complexity and historical success, then offers one‑click insertion.consolidated-contract.md+1
    

## Example: clipboard → URL mismatch

- If an Ingestion node outputs dom/clipboard into a YTT node that requires html/url, the checker flags an error and recommends inserting Adapter[clipboard_text → url_param] configured to extract video_id and recompose the transcript URL.selectors.json+1
    
- Alternative repairs include reconfiguring the upstream node to emit html/url directly or adding a Parse node that maps free text to a URL via regex/schema, all scored and presented in descending compatibility.consolidated-prd.md+1
    
- At run time, if the user ignores the fix, the dynamic validator will still attempt a safe implicit adapter if one is known and side‑effect free, logging the coercion for transparency.SYSTEM_STATUS_REPORT.md+1
    

## Observability, storage, and provenance

- Event model: execution:started, node:started, step:started, step:log, step:succeeded, node:succeeded, node:failed, execution:completed, each with timestamps, node ids, and artifact refs streamed over WS.[fastapi.tiangolo](https://fastapi.tiangolo.com/advanced/websockets/)consolidated-contract.md
    
- Artifact store persists files and large payloads, returning artifact/ref handles for edges to carry rather than raw blobs, and attaches YAML provenance (inputs, parameters, selector versions) for auditability.DEPLOYMENT_CHECKLIST.md+1
    
- Run history retains graphs, parameterizations, and event logs to support replays, diffs, and regression tests, integrating with versioned workflow APIs defined in the contract.DEPLOYMENT_CHECKLIST.md+1
    

## Error handling and policy

- Each node declares retry policy ⟨maxAttempts, backoff, jitter⟩ and failure modes (transient/permanent), with circuit breakers on repeated failures and user-acknowledged overrides for non-idempotent steps.DEPLOYMENT_CHECKLIST.md+1
    
- Provider defaults encode known latencies (e.g., ~8s approval gate; ~2m Perplexity answer) as timing policies that can be overridden per node but default to safe values to reduce flakiness.selectors.json+1
    
- On repeated selector failures, the runner tries fallback locators from the registry and emits a selector-drift diagnosis with links to update the registry entry directly from the log panel.SYSTEM_STATUS_REPORT.md+1
    

## Parallelism and resources

- The scheduler treats browser contexts, pages, and provider sessions as scarce resources, allocating them per capability budgets and serializing conflicting nodes while parallelizing independent branches.consolidated-prd.md+1
    
- Fan‑out patterns (e.g., chunk and summarize) run parallel Transform/LLM nodes and converge via Join with aggregation functions (concat, reduce, rank), respecting ordering and backpressure.consolidated-contract.md+1
    
- Long tasks emit heartbeats so the UI shows liveness and ETA, with cooperative cancellation flowing from the editor to the runner via execution control endpoints.SYSTEM_STATUS_REPORT.md+1
    

## Extensibility model

- New node types register signatures, capability requirements, and UI schemas, and are immediately validated by the same type checker and coercion graph without changes to the engine.consolidated-contract.md+1
    
- New data kinds extend the lattice by declaring subtyping and admissible coercions, after which adapters become available for auto‑suggestions and implicit inserts per policy.consolidated-prd.md+1
    
- New providers add selector packs, timing defaults, and authentication hints into the registry, and DOM Action nodes inherit these automatically when provider is selected.selectors.json+1
    

## Editor UX implications

- The canvas enforces typed handles on ports and color‑codes kinds, while the sidebar shows compatibility status and suggested adapters with one‑click insertion into the graph.modern-workflow-node-styles.css[reactflow](https://reactflow.dev/api-reference/react-flow)
    
- Double‑click opens a schema‑driven modal that edits node data, including provider, actions, prompt templates, and retry/timing policies, stored immutably to keep React Flow state consistent.[reactflow](https://reactflow.dev/examples/nodes/update-node)planning.md
    
- The run panel renders WS events, artifact links, and quick‑fix actions (extend timeout, change selector fallback), bridging design‑time validation and runtime recovery.[fastapi.tiangolo](https://fastapi.tiangolo.com/advanced/websockets/)SYSTEM_STATUS_REPORT.md
    

## Minimal canonical node set

- Source/Ingest, DOM Action, Provider/LLM, Transform/Parse, Condition/Gate, Split/Map, Merge/Join, Timer/Wait, Export, Adapter, Loop/Iterate cover 95% of flows and keep the core algebra small and testable.consolidated-contract.md+1
    
- Each node ships with a JSON schema for configuration and a TypeScript type for node.data, making controlled updates trivial in React Flow and enabling validation at compile time and run submission.[reactflow](https://reactflow.dev/api-reference/react-flow)consolidated-contract.md
    
- Default templates per provider (Gemini, Perplexity, YTT) are distributed via the registry to accelerate correct action sequencing and locator selection.selectors.json+1
    

## Roadmap suggestions

- Learned selectors: store successful locator resolutions and surface them as candidate fallbacks with confidence scores to auto‑heal DOM drift over time.SYSTEM_STATUS_REPORT.md+1
    
- Quality loops: integrate scoring nodes that measure answer quality and trigger bounded improvement loops until thresholds are met or budgets exhausted.consolidated-tasks.md+1
    
- Cost and quota awareness: annotate nodes with expected cost/time and schedule with budget constraints, surfacing tradeoffs in the editor preflight.DEPLOYMENT_CHECKLIST.md+1
    
- Policy and safety: sanitize prompts and outputs, enforce PII and license rules in Transform/Parse nodes, and gate risky actions behind approval nodes.DEPLOYMENT_CHECKLIST.md+1
    

## How this catches and fixes bad structures

- The type checker rejects incompatible edges and lists the least‑cost adapter plan, linking directly to an adapter insertion with pre‑filled parameters and a dry‑run preview in the editor.consolidated-prd.md+1
    
- The runner’s event stream correlates step failures with selector and timing policies and suggests runtime patches that can be persisted back into the registry, closing the loop between design and execution.SYSTEM_STATUS_REPORT.md+1
    
- Reports highlight non‑terminating loops, unbounded fan‑out, or resource deadlocks with precise node/edge references and actionable remediations aligned with node capabilities and budgets.consolidated-contract.md+1