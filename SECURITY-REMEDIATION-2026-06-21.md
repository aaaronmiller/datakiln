---
date: 2026-06-21 14:29:42 PDT
ver: 1.0.0
author: codex
model: gpt-5-codex
tags: [security, dependencies, audit, npm, pnpm, python, verification, datakiln]
---
# Security Remediation

## Conclusion

All dependency audit surfaces found in this repo now report zero known vulnerabilities locally:

- `frontend` npm audit: 0
- `frontend` pnpm audit: 0
- `backend` npm audit: 0
- `next-frontend` npm audit: 0
- root `requirements.txt` pip-audit: 0
- `backend/requirements.txt` pip-audit: 0
- `scripts/requirements.txt` pip-audit: 0

## Changed

- Upgraded vulnerable frontend packages including Axios, Vite, Vitest, Puppeteer, UUID, React Router, React Syntax Highlighter, ESLint tooling, and transitive override targets.
- Added npm and pnpm overrides for vulnerable transitive packages where upstream package ranges lagged patched releases.
- Upgraded the legacy TypeScript backend package dependencies including Fastify, Puppeteer, UUID, Jest tooling, and transitive `js-yaml`.
- Upgraded the Next app to patched Next/PostCSS dependencies and updated ESLint config to Next's flat config exports.
- Upgraded vulnerable Python requirement pins including FastAPI, Starlette, aiohttp, requests, python-multipart, Jinja2, marshmallow, python-dotenv, Pillow, pytest, black, tqdm, orjson, GitPython, pydantic, and pydantic-settings.
- Removed unused `python-jose[cryptography]`; repo search found no code imports, and one advisory had no fixed version reported by `pip-audit`.
- Fixed compatibility issues surfaced by the upgrades:
  - Removed obsolete React Router `future` prop from `frontend/src/App.tsx`.
  - Fixed Next app lint failures in workflow copy, sidebar skeleton sizing, and mobile media-query hook.
  - Fixed stale Next ESLint config and non-executable local ESLint shim by invoking the local JS entrypoint.
  - Removed stray generated edit markers from `backend/src/workflow/execution-storage.ts`.
  - Corrected `backend/jest.config.js` typo from `moduleNameMapping` to `moduleNameMapper`.

## Verification

Passed:

```bash
cd frontend && npm audit --json
cd frontend && pnpm audit --json
cd backend && npm audit --json
cd next-frontend && npm audit --json
python -m pip_audit -r requirements.txt
python -m pip_audit -r backend/requirements.txt
python -m pip_audit -r scripts/requirements.txt
python -m pytest backend/tests -q
cd frontend && npm test -- --run
cd frontend && npm run type-check
cd frontend && npm run build
python /home/cheta/code/agents/skills/webapp-testing/scripts/with_server.py --server "cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000" --port 8000 --timeout 45 -- python scripts/smoke_workflow_api.py
cd next-frontend && npm run lint
cd next-frontend && npm run build
```

Observed:

- Python backend tests: `94 passed`.
- Frontend tests: `99 passed`.
- Main API workflow smoke: passed and wrote `/tmp/datakiln-api-smoke-report.json`.
- Next app lint/build: passed.

## Residual Non-Security Caveat

`cd backend && npm run build` still fails on legacy TypeScript implementation drift unrelated to dependency advisories: stale execution/pattern/resource manager type contracts, old Playwright `Page.waitForTimeout` typings, and route metadata type mismatches.

`cd backend && npm test` now starts under ESM mode, but legacy tests still fail on old behavior mismatches:

- `AdapterLoader` uses an incompatible `fs-extra` import shape.
- DKEL tests expect bounds/method-call errors the current implementation does not throw.
- One old execution-engine test imports an export that is not provided.

Those failures should be handled as a separate TypeScript backend cleanup. They do not indicate remaining known dependency vulnerabilities in the local audit results above.
