# Retrieved from "datakiln copy" (removed 2026-08-25)

Artifacts unique to the parallel `datakiln copy` fork (Nov-Dec 2025,
86 `auto: claude edit` commits) that the 2026-08-22 unification did not
carry over. Preserved here verbatim, relative paths intact, so nothing
of value was lost when the folder was removed. Nothing in this tree is
on any build/test path.

- `chrome-extension/` — YouTube capture integration (`youtube-content.js`),
  5 workflow templates (`workflow-templates.json`), newer `content.js`
  (674 lines vs 535) with YouTube integration
- `backend/tests/`, `backend/test_*.py` — 15+ test modules not present in
  the unified backend (contract conformance, provider reliability,
  performance scaling 100+ nodes, parameter validator, node versioning)
- `backend/` utilities — `providers_legacy.py`, `workflow_loader.py`,
  `init_check.py`, `custom_nodes.json`, `data/prompt_templates.json`
- `docs/` — fork-only documentation
- root — `cli.py`, `quickstart.sh`
