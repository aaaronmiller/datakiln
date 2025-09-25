# Project Specifications

This directory contains the current unified specifications, contracts, and planning documents for the AI Research Automation Platform.

## Directory Structure

### Core Documentation

- **`ARCHITECTURE.md`** - Unified system architecture (backend + frontend)
- **`PROJECT_PLAN.md`** - Comprehensive project roadmap and implementation phases

### Requirements & Specifications

- **`requirements/`** - Functional and non-functional requirements
  - [`functional.md`](requirements/functional.md) - Core features, research modes, architecture, workflow concepts
  - [`non-functional.md`](requirements/non-functional.md) - Performance, security, reliability requirements
  - [`user-stories.md`](requirements/user-stories.md) - User stories and acceptance criteria

- **`contracts/`** - API contracts and schemas
  - [`ENGINE_API_CONTRACT.md`](contracts/ENGINE_API_CONTRACT.md) - Engine API endpoints and contracts
  - [`NODE_REGISTRY_V1.json`](contracts/NODE_REGISTRY_V1.json) - Node registry schema
  - [`WORKFLOW_SCHEMA_V1.json`](contracts/WORKFLOW_SCHEMA_V1.json) - Workflow schema definition
  - [`ENDPOINTS.template.json`](contracts/ENDPOINTS.template.json) - Endpoint configuration template

### Design & User Experience

- **`design/`** - Design system and UX guidelines
  - [`style-guide.md`](design/style-guide.md) - Visual design system, typography, colors, spacing
  - [`component-library.md`](design/component-library.md) - Component usage guidelines and patterns

### User Guides & Documentation

- **`guides/`** - User and developer documentation
  - [`user-manual.md`](guides/user-manual.md) - User guide for workflows and features
  - [`developer-setup.md`](guides/developer-setup.md) - Development environment setup and workflow
  - [`api-reference.md`](guides/api-reference.md) - Complete API reference and examples

### Quality Assurance

- **`matrix/`** - Traceability and requirements
  - [`traceability_matrix.md`](matrix/traceability_matrix.md) - Requirements to implementation traceability

### Specialized Components

- **`agent/`** - Agent and AI specifications
  - [`agent_unified_instruction.md`](agent/agent_unified_instruction.md) - Unified agent instruction set

- **`chrome_extension/`** - Chrome extension specifications
  - [`chrome_extension_docs.md`](chrome_extension_docs.md) - Chrome extension documentation

### Archived Specifications

- **`reference_old/`** - Historical and archived documents with preserved original structure
  - See [`reference_old/ARCHIVE_INVENTORY.md`](reference_old/ARCHIVE_INVENTORY.md) for complete inventory

## Key Documents by Function

### Requirements & Planning
- [Functional Requirements](requirements/functional.md) - Core features and system capabilities
- [Non-Functional Requirements](requirements/non-functional.md) - Performance, security, and reliability
- [User Stories](requirements/user-stories.md) - User acceptance criteria and scenarios
- [Project Plan](PROJECT_PLAN.md) - Comprehensive roadmap and implementation phases

### Architecture & Design
- [System Architecture](ARCHITECTURE.md) - Unified backend and frontend architecture
- [Style Guide](design/style-guide.md) - Visual design system and typography
- [Component Library](design/component-library.md) - UI component usage guidelines

### API & Contracts
- [API Reference](guides/api-reference.md) - Complete API documentation and examples
- [Engine API Contract](contracts/ENGINE_API_CONTRACT.md) - Engine API endpoints and contracts
- [Node Registry Schema](contracts/NODE_REGISTRY_V1.json) - Node registry schema
- [Workflow Schema](contracts/WORKFLOW_SCHEMA_V1.json) - Workflow schema definition

### User Guides
- [User Manual](guides/user-manual.md) - Complete user guide and workflows
- [Developer Setup](guides/developer-setup.md) - Development environment and contribution guide

### Specialized Components
- [Agent Unified Instruction](agent/agent_unified_instruction.md) - AI agent behavior specifications
- [Chrome Extension Documentation](chrome_extension_docs.md) - Browser extension specifications

### Quality Assurance
- [Traceability Matrix](matrix/traceability_matrix.md) - Requirements to implementation mapping

## Authority Hierarchy

1. **Contracts** (`contracts/`) - Primary authority for API and schema definitions
2. **Unified Architecture** (`ARCHITECTURE.md`) - System design specifications
3. **Project Plan** (`PROJECT_PLAN.md`) - Roadmap and objectives
4. **Agent Specifications** (`agent/`) - AI and agent behavior definitions
5. **Chrome Extension** (`chrome_extension/`) - Browser extension specifications

## Cross-References

- All contracts reference each other for consistency
- Architecture document references contracts for implementation guidance
- Project plan references architecture for feasibility
- All documents reference archived versions for historical context

## Recent Changes

- **2025-09-22**: Documentation unification completed
  - Archive-first approach implemented with preserved historical structure
  - Created unified functional organization: `requirements/`, `design/`, `guides/`
  - Migrated active content from archive to new functional directories
  - Updated navigation and cross-references throughout documentation
  - Enhanced quality assurance with comprehensive requirement specifications
  - Integrated Context Portal for progress tracking and decision logging

## Contributing

When adding new specifications:
1. Update unified documents or create new functional files
2. Ensure cross-references to contracts and archived content
3. Follow established naming conventions
4. Update archive inventory if adding historical documents

For questions about document organization or authority, refer to the project maintainers.