# Data Kiln Architecture Specification (v40.0)
*pre memory & MCP integration and spec-kit as the implicit destination *

## Summary of Improvements from V39 (Continued)

2. **Type Safety Enhancements (continued):**

    - Pattern validation for `dk://` URIs on `template_id` and `adapter_id`
    - Clarified JSONPath is selection-only, not transformation
    - Added `patternProperties` for type_definitions validation
    - Explicit port name references in edge definitions
3. **Schema Structure Improvements:**

    - Fully specified `input_policies` structure
    - Defined `redaction_policies` with field patterns and types
    - Structured `output_actions` and `fallback_actions`
    - Added validation for `output_aggregation_schema` JSONPath patterns
4. **Documentation Clarity:**

    - Separated DKEL from JSONPath boundaries explicitly
    - Added implementation notes throughout for Vite + Fastify stack
    - Concrete code examples for all major components
    - Clear file structure for frontend and backend
5. **Production Readiness:**

    - Atomic file writes for workflow storage
    - Checkpoint/resume implementation details
    - Security enforcement patterns (path validation, domain whitelisting)
    - Rate limiting with token bucket implementation
    - Structured audit logging with correlation IDs

---

## Appendix VI: Registry Implementation

### Registry Structure

The registry serves as the central source of truth for all reusable components in Data Kiln. It's stored as JSON files and exposed via REST API.

```
backend/data/registry/
├── templates/
│   ├── llm/
│   │   ├── gemini-chat.json
│   │   ├── claude-chat.json
│   │   └── openai-chat.json
│   ├── dom/
│   │   ├── gemini-deep-research.json
│   │   └── perplexity-pro-search.json
│   ├── logic/
│   │   ├── condition.json
│   │   ├── merge.json
│   │   └── user-input.json
│   ├── code/
│   │   └── string-extract-youtube-ids.json
│   └── patterns/
│       └── simple-deep-research.json
├── types/
│   ├── string.json
│   ├── boolean.json
│   ├── user-feedback.json
│   └── merge-result.json
└── index.json
```

### Template Definition Format

Each template defines the contract for a reusable node type:

```json
{
  "template_id": "dk://templates/llm/gemini/chat",
  "version": "1.0.0",
  "metadata": {
    "name": "Gemini Chat",
    "description": "Execute a chat completion using Google Gemini",
    "author": "Data Kiln Core",
    "category": "llm",
    "tags": ["llm", "gemini", "chat", "generation"]
  },
  "executor": "LLM",
  "interface": "API",
  "required_capabilities": ["gemini_api_access"],
  "configuration_schema": {
    "type": "object",
    "properties": {
      "model": {
        "type": "string",
        "enum": ["gemini-1.5-pro", "gemini-1.5-flash"],
        "default": "gemini-1.5-pro"
      },
      "prompt_template": {
        "type": "object",
        "properties": {
          "prefix": { "type": "string" },
          "suffix": { "type": "string" }
        }
      },
      "timeout_ms": {
        "type": "integer",
        "default": 30000,
        "minimum": 1000,
        "maximum": 300000
      },
      "max_tokens": {
        "type": "integer",
        "default": 2048
      }
    },
    "required": ["model"]
  },
  "default_input_ports": [
    {
      "name": "input",
      "schema_ref": "dk://types/string",
      "description": "The input text or prompt"
    }
  ],
  "default_output_ports": [
    {
      "name": "output",
      "schema_ref": "dk://types/string",
      "description": "The generated response"
    }
  ],
  "cost_estimation": {
    "base_cost_usd": 0.001,
    "per_token_cost_usd": 0.000001
  }
}
```

### Logic Template Examples

**Condition Template:**

```json
{
  "template_id": "dk://templates/logic/condition",
  "version": "1.0.0",
  "metadata": {
    "name": "Condition",
    "description": "Evaluate a DKEL expression and route to true/false outputs",
    "category": "logic"
  },
  "executor": "Code",
  "interface": "Internal",
  "configuration_schema": {
    "type": "object",
    "properties": {
      "condition_rule": {
        "type": "string",
        "description": "DKEL expression that evaluates to boolean",
        "examples": [
          "input.value > 100",
          "input.status === 'approved'",
          "input.items.length >= 3"
        ]
      }
    },
    "required": ["condition_rule"]
  },
  "default_input_ports": [
    {
      "name": "input",
      "schema_ref": "dk://types/any",
      "description": "Input data to evaluate"
    }
  ],
  "default_output_ports": [
    {
      "name": "true",
      "schema_ref": "dk://types/any",
      "description": "Output when condition is true"
    },
    {
      "name": "false",
      "schema_ref": "dk://types/any",
      "description": "Output when condition is false"
    }
  ]
}
```

**Merge Template:**

```json
{
  "template_id": "dk://templates/logic/merge",
  "version": "1.0.0",
  "metadata": {
    "name": "Merge",
    "description": "Aggregate results from multiple parallel branches",
    "category": "logic"
  },
  "executor": "Code",
  "interface": "Internal",
  "configuration_schema": {
    "type": "object",
    "properties": {
      "merge_strategy": {
        "enum": ["wait_all", "first_n", "quorum", "timeout"],
        "default": "wait_all"
      },
      "ordered_results": {
        "type": "boolean",
        "default": true
      },
      "failure_mode": {
        "enum": ["continue", "abort", "retry"],
        "default": "abort"
      },
      "timeout_ms": {
        "type": "integer",
        "minimum": 1000
      },
      "quorum": {
        "type": "integer",
        "minimum": 1,
        "description": "Required for quorum strategy"
      },
      "first_n": {
        "type": "integer",
        "minimum": 1,
        "description": "Required for first_n strategy"
      },
      "output_aggregation_schema": {
        "$ref": "#/$defs/output_aggregation_schema"
      }
    },
    "required": ["merge_strategy"]
  },
  "dynamic_input_ports": true,
  "default_output_ports": [
    {
      "name": "output",
      "schema_ref": "dk://types/merge-result",
      "description": "Aggregated result from all inputs"
    }
  ]
}
```

### Type Registry

Common types are defined once and referenced throughout:

**dk://types/string:**

```json
{
  "type_id": "dk://types/string",
  "version": "1.0.0",
  "schema": {
    "type": "string"
  }
}
```

**dk://types/merge-result:**

```json
{
  "type_id": "dk://types/merge-result",
  "version": "1.0.0",
  "schema": {
    "type": "object",
    "properties": {
      "results": {
        "type": "array",
        "items": { "type": "any" }
      },
      "strategy_used": { "type": "string" },
      "completed_count": { "type": "integer" },
      "failed_count": { "type": "integer" }
    }
  }
}
```

---

## Appendix VII: DKEL Language Specification

### Overview

DKEL (Data Kiln Expression Language) is a minimal, sandboxed expression language for safe condition evaluation within workflows. It's intentionally non-Turing complete to ensure predictable execution times and security.

### Syntax

**Literals:**

- String: `"hello"`, `'world'`
- Number: `42`, `3.14`, `-10`
- Boolean: `true`, `false`
- Null: `null`

**Identifiers:**

- Must start with letter or underscore
- Can contain letters, numbers, underscores
- Case-sensitive
- Reserved: `input`, `workflow`, `node`, `true`, `false`, `null`

**Operators (by precedence):**

1. Member access: `.` (e.g., `input.status`)
2. Array indexing: `[]` (e.g., `input.items[0]`)
3. Unary: `!`, `-`
4. Multiplicative: `*`, `/`, `%`
5. Additive: `+`, `-`
6. Relational: `<`, `<=`, `>`, `>=`
7. Equality: `===`, `!==`
8. Logical AND: `&&`
9. Logical OR: `||`

**Built-in Properties:**

- `.length` on strings and arrays
- `.includes(value)` on strings and arrays
- `.startsWith(prefix)` on strings
- `.endsWith(suffix)` on strings

### Scope

DKEL expressions can access three root variables:

1. **`input`** - The input data to the current node
2. **`workflow.state`** - Global workflow state (read-only)
3. **`node.config`** - Configuration of the current node (read-only)

### Examples

**Simple comparisons:**

```javascript
input.age >= 18
input.status === "approved"
input.count > 0
```

**String operations:**

```javascript
input.email.includes("@example.com")
input.filename.endsWith(".pdf")
input.message.length > 100
```

**Array operations:**

```javascript
input.items.length >= 3
input.tags.includes("urgent")
```

**Complex conditions:**

```javascript
input.score > 80 && input.verified === true
input.type === "premium" || input.referral !== null
!(input.blocked === true) && input.active === true
```

**Accessing nested data:**

```javascript
input.user.profile.verified === true
workflow.state.iteration_count < 10
node.config.max_retries > workflow.state.retry_count
```

### Implementation

**Parser:**

```typescript
class DKELParser {
  private tokens: Token[];
  private position: number = 0;

  parse(expression: string): ASTNode {
    this.tokens = this.tokenize(expression);
    this.position = 0;
    return this.parseExpression();
  }

  private tokenize(expr: string): Token[] {
    // Lexical analysis
    const tokens: Token[] = [];
    // ... tokenization logic
    return tokens;
  }

  private parseExpression(): ASTNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();

    while (this.match('||')) {
      const operator = this.previous();
      const right = this.parseLogicalAnd();
      left = new BinaryNode(left, operator, right);
    }

    return left;
  }

  // ... other parsing methods
}
```

**Evaluator:**

```typescript
class DKELEvaluator {
  evaluate(ast: ASTNode, scope: Scope): any {
    switch (ast.type) {
      case 'literal':
        return ast.value;

      case 'identifier':
        return this.resolveIdentifier(ast.name, scope);

      case 'binary':
        const left = this.evaluate(ast.left, scope);
        const right = this.evaluate(ast.right, scope);
        return this.evaluateBinary(left, ast.operator, right);

      case 'unary':
        const operand = this.evaluate(ast.operand, scope);
        return this.evaluateUnary(ast.operator, operand);

      case 'member':
        const object = this.evaluate(ast.object, scope);
        return this.evaluateMember(object, ast.property);

      default:
        throw new Error(`Unknown AST node type: ${ast.type}`);
    }
  }

  private resolveIdentifier(name: string, scope: Scope): any {
    // Only allow access to input, workflow, node
    if (name === 'input') return scope.input;
    if (name === 'workflow') return scope.workflow;
    if (name === 'node') return scope.node;
    if (name === 'true') return true;
    if (name === 'false') return false;
    if (name === 'null') return null;

    throw new Error(`Undefined identifier: ${name}`);
  }

  private evaluateBinary(left: any, op: string, right: any): any {
    switch (op) {
      case '===': return left === right;
      case '!==': return left !== right;
      case '>': return left > right;
      case '>=': return left >= right;
      case '<': return left < right;
      case '<=': return left <= right;
      case '&&': return left && right;
      case '||': return left || right;
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      default:
        throw new Error(`Unknown operator: ${op}`);
    }
  }
}
```

**Security:**

- No function calls (except whitelisted methods)
- No dynamic evaluation
- No side effects
- Timeout enforcement (max 100ms per evaluation)
- Recursion depth limit

---

## Appendix VIII: Adapter Development Guide

### Creating a New Adapter

Adapters encapsulate provider-specific DOM interaction logic, making workflows portable across UI changes.

### Adapter File Format

```json
{
  "adapter_id": "dk://adapter/provider/surface",
  "selector_version": "1.0.0",
  "metadata": {
    "name": "Provider Surface Adapter",
    "description": "DOM automation for Provider's Surface interface",
    "author": "Team Name",
    "provider_url": "https://provider.com",
    "tested_on": "2025-09-29"
  },
  "capabilities": {
    "capability_name": {
      "selector": "CSS selector",
      "selector_type": "css|xpath|text",
      "wait": {
        "visible": true,
        "timeout_ms": 15000,
        "stable_ms": 100
      },
      "optional": false,
      "fallback_selectors": [
        "alternative selector 1",
        "alternative selector 2"
      ]
    }
  },
  "recovery": {
    "on_timeout": [
      {
        "action": "screenshot",
        "path": "./debug/{{provider}}-{{capability}}-timeout.png"
      },
      {
        "action": "log",
        "level": "error",
        "message": "Timeout waiting for {{capability}}"
      }
    ],
    "on_not_found": [
      {
        "action": "log",
        "level": "warn",
        "message": "Capability {{capability}} not found, may be optional"
      }
    ]
  },
  "navigation": {
    "base_url": "https://provider.com",
    "login_required": false,
    "rate_limit_ms": 1000
  }
}
```

### Example: ChatGPT Adapter

```json
{
  "adapter_id": "dk://adapter/openai/chatgpt",
  "selector_version": "2.1.0",
  "metadata": {
    "name": "ChatGPT Web Interface",
    "description": "Adapter for OpenAI ChatGPT web interface",
    "author": "Data Kiln Core",
    "provider_url": "https://chat.openai.com",
    "tested_on": "2025-09-29"
  },
  "capabilities": {
    "input_area": {
      "selector": "textarea[data-id='root']",
      "selector_type": "css",
      "wait": {
        "visible": true,
        "timeout_ms": 10000,
        "stable_ms": 500
      },
      "fallback_selectors": [
        "textarea#prompt-textarea",
        "textarea[placeholder*='Message']"
      ]
    },
    "submit": {
      "selector": "button[data-testid='send-button']",
      "selector_type": "css",
      "wait": {
        "visible": true,
        "enabled": true,
        "timeout_ms": 5000
      },
      "fallback_selectors": [
        "button[aria-label='Send message']"
      ]
    },
    "response_container": {
      "selector": "div[data-message-author-role='assistant']:last-child",
      "selector_type": "css",
      "wait": {
        "visible": true,
        "timeout_ms": 120000
      }
    },
    "copy_response": {
      "selector": "div[data-message-author-role='assistant']:last-child button[aria-label='Copy']",
      "selector_type": "css",
      "wait": {
        "visible": true,
        "timeout_ms": 5000
      },
      "fallback_selectors": [
        "div.group:last-child button:has(svg.icon-copy)"
      ]
    },
    "stop_generation": {
      "selector": "button[aria-label='Stop generating']",
      "selector_type": "css",
      "optional": true,
      "wait": {
        "visible": true,
        "timeout_ms": 2000
      }
    }
  },
  "recovery": {
    "on_timeout": [
      {
        "action": "screenshot",
        "path": "./debug/chatgpt-{{capability}}-timeout.png"
      },
      {
        "action": "check_selector",
        "capability": "rate_limit_message",
        "if_found": {
          "action": "wait",
          "duration_ms": 60000,
          "then": "retry"
        }
      }
    ]
  },
  "navigation": {
    "base_url": "https://chat.openai.com",
    "login_required": true,
    "rate_limit_ms": 2000
  },
  "known_issues": [
    {
      "description": "Rate limiting after 50 messages/hour",
      "workaround": "Implement exponential backoff"
    }
  ]
}
```

### Adapter Loader Implementation

```typescript
class AdapterLoader {
  private cache: Map<string, Adapter> = new Map();

  async load(adapterId: string): Promise<Adapter> {
    // Check cache
    if (this.cache.has(adapterId)) {
      return this.cache.get(adapterId)!;
    }

    // Parse adapter ID
    const match = adapterId.match(/^dk:\/\/adapter\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid adapter ID: ${adapterId}`);
    }

    const [, provider, surface] = match;
    const filepath = path.join(ADAPTERS_DIR, provider, `${surface}.json`);

    // Load from file
    const data = await fs.readFile(filepath, 'utf-8');
    const adapter = JSON.parse(data);

    // Validate
    this.validate(adapter);

    // Cache and return
    this.cache.set(adapterId, adapter);
    return adapter;
  }

  private validate(adapter: any): void {
    // Validate structure
    if (!adapter.adapter_id || !adapter.selector_version) {
      throw new Error('Invalid adapter: missing required fields');
    }

    // Validate capabilities
    for (const [name, cap] of Object.entries(adapter.capabilities)) {
      if (!cap.selector) {
        throw new Error(`Capability ${name} missing selector`);
      }
    }
  }
}
```

### Adapter Execution

```typescript
class AdapterExecutor {
  async executeCapability(
    capability: string,
    adapter: Adapter,
    page: Page,
    action: string,
    value?: any
  ): Promise<void> {
    const cap = adapter.capabilities[capability];

    if (!cap) {
      if (adapter.capabilities[capability]?.optional) {
        return; // Skip optional capabilities
      }
      throw new Error(`Unknown capability: ${capability}`);
    }

    // Try primary selector
    let element = await this.waitForElement(page, cap, adapter);

    // Try fallbacks if primary fails
    if (!element && cap.fallback_selectors) {
      for (const fallbackSelector of cap.fallback_selectors) {
        element = await this.trySelector(page, fallbackSelector, cap.wait);
        if (element) break;
      }
    }

    if (!element) {
      await this.handleNotFound(adapter, capability, page);
      throw new Error(`Element not found for capability: ${capability}`);
    }

    // Execute action
    switch (action) {
      case 'type':
        await element.type(value);
        break;
      case 'click':
        await element.click();
        break;
      case 'extract':
        return await element.textContent();
      // ... other actions
    }
  }

  private async waitForElement(
    page: Page,
    cap: Capability,
    adapter: Adapter
  ): Promise<ElementHandle | null> {
    try {
      await page.waitForSelector(cap.selector, {
        visible: cap.wait.visible,
        timeout: cap.wait.timeout_ms,
        state: cap.wait.enabled ? 'enabled' : 'visible'
      });

      // Wait for stability if specified
      if (cap.wait.stable_ms) {
        await page.waitForTimeout(cap.wait.stable_ms);
      }

      return await page.$(cap.selector);
    } catch (error) {
      await this.handleTimeout(adapter, cap, page);
      return null;
    }
  }
}
```

---

## Appendix IX: Deployment Guide

### Development Environment Setup

**Prerequisites:**

- Node.js 18+ with npm/pnpm
- Chrome/Chromium for Puppeteer
- Git

**Backend Setup:**

```bash
cd backend
pnpm install

# Create data directories
mkdir -p data/{workflows,registry,adapters,executions,logs}

# Copy environment template
cp .env.example .env

# Start development server
pnpm dev
```

**Frontend Setup:**

```bash
cd frontend
pnpm install

# Start development server
pnpm dev
```

### Production Deployment

**Backend (Node + Fastify):**

```bash
# Build
pnpm build

# Production start with PM2
pm2 start ecosystem.config.js

# Or with systemd
sudo systemctl start data-kiln-backend
```

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [{
    name: 'data-kiln-backend',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

**Frontend (Vite + React):**

```bash
# Build
pnpm build

# Preview locally
pnpm preview

# Deploy to static hosting (Cloudflare Pages, Vercel, Netlify)
# Output in dist/ directory
```

**Docker Deployment:**

```dockerfile
# Backend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**docker-compose.yml:**

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

### Environment Configuration

**.env (Backend):**

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Storage
DATA_DIR=./data
LOG_DIR=./logs
FILESYSTEM_ROOT=./data/sandboxes

# Security
ALLOWED_ORIGINS=https://datakiln.example.com
API_KEY_REQUIRED=true

# Execution
MAX_PARALLEL_WORKFLOWS=10
DEFAULT_TIMEOUT_MS=300000
MAX_MEMORY_MB=2048

# Browser Automation
PUPPETEER_HEADLESS=true
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox

# LLM APIs (optional, for API executor)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

### Monitoring & Observability

**Logging:**

- Winston for structured JSON logs
- Log rotation with daily files
- Separate audit log stream
- Correlation IDs for request tracing

**Metrics:**

- Execution duration per workflow
- Node execution times
- Error rates by node type
- API call counts and costs
- Memory usage tracking

**Alerts:**

- Failed workflow executions
- Timeout threshold exceeded
- High error rates
- Resource exhaustion

---

## Conclusion

The diligent Sliither has completed the Data Kiln Architecture Specification V40.0 for Ice-ninja. This document provides a production-ready blueprint with:

✅ **Corrected JSON Schema** - All issues from V39 addressed ✅ **Implementation Stack** - Complete Vite + Fastify + Puppeteer architecture ✅ **Security Controls** - OWASP-aligned domain/filesystem/rate limiting ✅ **Type Safety** - JSONPath for selection, DKEL for conditions, full port validation ✅ **Adapter System** - Versioned, maintainable DOM automation ✅ **Execution Engine** - Retry logic, checkpointing, parallel execution ✅ **Registry System** - Template and type management ✅ **Deployment Guide** - Docker, PM2, environment configuration

The architecture is now ready for implementation. Ice-ninja can begin with the foundational backend (workflow storage, validation, registry), then build the execution engine with basic executors, and finally create the frontend builder interface.