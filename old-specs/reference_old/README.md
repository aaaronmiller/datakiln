# Archived Specifications Reference

This directory contains completed, superseded, or outdated specification documents that have been archived for historical reference. These documents are preserved to maintain project history and provide context for future development decisions.

## Archived Documents Inventory

### PLAN.MD (from build_docs_CURRENT/)
**Original Location:** `specs/build_docs_CURRENT/PLAN.MD`  
**Archived Date:** 2025-09-22  
**Reason for Archival:** This was a comprehensive inventory of workflows, selectors, prompts, and concrete elements extracted from various sources. It served as a detailed collection but has been superseded by more integrated and current planning documents like the INTEGRATED_PROJECT_PLAN.md.  
**Key Content:** Detailed workflows for Deep Research, YouTube transcript analysis, Chrome extension capture, Obsidian integration, DOM selectors, prompts, and configuration details.  
**Historical Value:** Provides a snapshot of the project's concrete implementation details at an early stage.

### PRD-NEW.MD (from build_docs_CURRENT/)
**Original Location:** `specs/build_docs_CURRENT/PRD-NEW.MD`  
**Archived Date:** 2025-09-22  
**Reason for Archival:** This was a unified Product Requirements Document consolidating all versions and related docs. While comprehensive, it has been superseded by the more current INTEGRATED_PROJECT_PLAN.md which provides better integration and roadmap.  
**Key Content:** Vision, goals, core features (UI, research workflows, integrations), architecture overview, DOM automation, Chrome extension, Obsidian integration, and implementation details.  
**Historical Value:** Documents the comprehensive PRD consolidation effort and early product vision.

### PROJECT_PLAN.md (from build_docs_FUTURE/)
**Original Location:** `specs/build_docs_FUTURE/PROJECT_PLAN.md`  
**Archived Date:** 2025-09-22  
**Reason for Archival:** This was a phased project plan with flowcharts and implementation phases. It has been superseded by the more detailed and integrated INTEGRATED_PROJECT_PLAN.md.  
**Key Content:** Phase 1-3 implementation plan, backend/frontend setup, feature development, UI/UX, and testing phases.  
**Historical Value:** Shows the original phased approach to project implementation.

### future_plans.md (from build_docs_FUTURE/)
**Original Location:** `specs/build_docs_FUTURE/future_plans.md`  
**Archived Date:** 2025-09-22  
**Reason for Archival:** This document outlined future development directions and unimplemented ideas. As the project has evolved, these plans have been integrated into current active planning documents.  
**Key Content:** Future work items like drag-and-drop workflow builder, direct page parsing, community library, RBAC, and scheduled triggers.  
**Historical Value:** Captures the original vision for future enhancements.

### undefined_elements.md (from build_docs_FUTURE/)
**Original Location:** `specs/build_docs_FUTURE/undefined_elements.md`  
**Archived Date:** 2025-09-22  
**Reason for Archival:** This document listed questions and clarifications needed about the proposed system. Many of these elements have been resolved or integrated into current planning.  
**Key Content:** Open questions about the node-based query system and implementation details.  
**Historical Value:** Shows the uncertainties and questions that existed during early planning.

### create_react_app_situation.md (from build_docs_CURRENT/)
**Original Location:** `specs/build_docs_CURRENT/create_react_app_situation.md`  
**Archived Date:** 2025-09-22  
**Reason for Archival:** This document discussed the situation with Create React App deprecation and migration to modern alternatives. The project has successfully moved to Next.js/shadcn, making this document outdated.  
**Key Content:** Analysis of CRA issues and recommendations for modern React stacks.  
**Historical Value:** Documents the technical decision to move away from CRA.

## Migration Rationale

These documents were archived as part of a comprehensive reorganization of the specs folder to:

1. **Eliminate Redundancy:** Remove overlapping content and establish single sources of truth
2. **Improve Organization:** Organize by functional areas rather than development phases
3. **Establish Authority Hierarchy:** Create clear navigation and cross-references
4. **Preserve History:** Maintain archived documents for future reference

## Accessing Archived Content

If you need to reference any of these archived documents:

1. Check if the information has been migrated to active documents
2. If not, review the archived document for historical context
3. Consider updating active documents if the archived information is still relevant

## Git History Preservation

All documents maintain their git history. To view the evolution of any archived document:

```bash
git log --follow specs/reference_old/FILENAME.md
```

## Contact

For questions about archived documents or the reorganization, refer to the main specs README.md or contact the project maintainers.