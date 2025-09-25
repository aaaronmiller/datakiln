# Archive Classification System

## Classification System

### Type Categories

1. **PRD**: Requirements & specifications (what/why documents)
   - Product requirements documents
   - Feature specifications
   - User stories and acceptance criteria

2. **Plan**: Implementation strategies (how-to documents)
   - Technical architecture plans
   - Implementation roadmaps
   - Development strategies and approaches

3. **Contract**: Machine-readable schemas & interfaces
   - JSON schemas and specifications
   - API contracts and interfaces
   - Configuration templates

4. **Todo**: Task lists & acceptance criteria
   - Implementation checklists
   - Open questions and clarifications needed
   - Task tracking and completion criteria

5. **Reference**: Vision, guidelines, historical context
   - Design system documentation
   - Technical guidelines and standards
   - Historical context and decision records

### Status Categories

1. **Active**: Currently in use/referenced
   - Documents still actively maintained
   - Content regularly referenced in development

2. **Completed**: Used in past, content absorbed elsewhere
   - Successfully implemented and superseded
   - Content migrated to active documentation
   - Historical record of completed work

3. **Future**: Not yet addressed, potential future use
   - Planned but not yet implemented features
   - Deferred functionality
   - Potential future enhancements

## Complete Classification Matrix

| File Path | Type | Status | Notes |
|-----------|------|--------|-------|
| build_docs_CURRENT/AGENT_UNIFIED_INSTRUCTION.md | Plan | Completed | Unified implementation instructions for project orchestration |
| build_docs_CURRENT/chrome_extension_docs.md | Reference | Completed | Technical documentation and code for Chrome extension |
| build_docs_CURRENT/create_react_app_situation.md | Reference | Completed | Historical analysis of CRA deprecation and migration alternatives |
| build_docs_CURRENT/PLAN.MD | Plan | Completed | Comprehensive inventory of workflows, selectors, and implementation details |
| build_docs_CURRENT/PRD-NEW.MD | PRD | Completed | Consolidated product requirements document with vision and features |
| build_docs_FUTURE/BACKEND_ARCHITECTURE.md | Plan | Future | Backend architecture specification for future implementation |
| build_docs_FUTURE/FRONTEND_ARCHITECTURE.md | Plan | Future | Frontend architecture specification for future implementation |
| build_docs_FUTURE/future_plans.md | Future | Future | Roadmap of unimplemented features and enhancements |
| build_docs_FUTURE/node_based_query_system_plan.md | Plan | Future | Technical specification for node-based query system |
| build_docs_FUTURE/PROJECT_PLAN.md | Plan | Future | Phased project implementation plan |
| build_docs_FUTURE/undefined_elements.md | Todo | Future | Open questions and clarifications needed for implementation |
| build_docs_FUTURE/vision.md | Reference | Future | Vision document for node-based query system |
| contracts/ENDPOINTS.template.json | Contract | Completed | Provider endpoint configuration template |
| contracts/ENGINE_API_CONTRACT.md | Contract | Completed | API contract specification with endpoints and schemas |
| contracts/NODE_REGISTRY_V1.json | Contract | Completed | Node type definitions and parameter schemas |
| contracts/WORKFLOW_SCHEMA_V1.json | Contract | Completed | JSON schema for workflow definitions |
| matrix/TRACEABILITY_MATRIX.md | Reference | Completed | Requirements to implementation mapping with status tracking |
| plans/INTEGRATED_PROJECT_PLAN.md | Plan | Completed | Current integrated project roadmap and implementation phases |
| plans/TODO_OBJECTIVES.md | Todo | Completed | Task completion tracking with priorities and dependencies |
| plans/UX_REWORK_CONTINUATION_PLAN.md | Plan | Completed | UX implementation continuation with contracts alignment |
| UXplan/UX_IMPLEMENTATION_TASKS.md | Plan | Completed | Detailed UX task breakdown with implementation details |
| UXplan/UX_RESTRUCTURING_PLAN.md | Plan | Completed | UX restructuring roadmap with phases and success metrics |
| UXplan/UX_STYLE_GUIDE.md | Reference | Completed | Design system guidelines and component specifications |

## Usage Guidance for Referencing Archived Content

### When to Reference Archived Documents

1. **Historical Context**: Understanding how features evolved or why certain decisions were made
2. **Requirements Tracing**: Finding original requirements that led to current implementations
3. **Technical Debt Analysis**: Reviewing superseded plans to understand what was deferred
4. **Knowledge Transfer**: Onboarding new team members with project history
5. **Implementation Research**: Studying past approaches for similar current challenges

### How to Reference Archived Content

1. **Check Active Documents First**: Always verify if information has been migrated to current specs
2. **Use Git History**: Access full evolution via `git log --follow specs/reference_old/FILENAME.md`
3. **Cross-Reference**: Use the classification matrix to find related documents by type/status
4. **Update Active Docs**: If archived information is still relevant, migrate it to current documentation
5. **Cite Sources**: When referencing archived content, include the classification for context

### Maintenance Guidelines

- **Do Not Modify**: Archived documents are read-only historical records
- **Link from Active Docs**: Reference archived content with links when providing context
- **Regular Review**: Annually review archive relevance and consider further consolidation
- **Migration Process**: When migrating content, update this classification matrix
- **Access Tracking**: Consider logging when archived documents are accessed for usage analysis

## Proposed New Structure

Based on the dual categorization, here's a clean functional organization that references archived content appropriately:

### Active Specifications Structure

```
specs/
├── README.md                           # Main specs overview and navigation
├── ARCHIVE_CLASSIFICATION.md          # This classification system and archive guide
├── ARCHITECTURE.md                    # Current system architecture (consolidated from active docs)
├── PROJECT_PLAN.md                    # Current project roadmap (from INTEGRATED_PROJECT_PLAN.md)
├── requirements/                      # Current requirements documentation
│   ├── functional.md                  # Functional requirements (derived from PRD-NEW.MD)
│   ├── non-functional.md              # Performance, security, accessibility requirements
│   └── user-stories.md                # User stories and acceptance criteria
├── contracts/                         # Active machine-readable specifications
│   ├── WORKFLOW_SCHEMA_V1.json        # Current workflow schema
│   ├── NODE_REGISTRY_V1.json          # Current node definitions
│   ├── ENGINE_API_CONTRACT.md         # Current API contract
│   └── ENDPOINTS.template.json        # Current provider configuration
├── guides/                            # User and developer documentation
│   ├── user-manual.md                 # User guide and workflows
│   ├── developer-setup.md             # Development environment setup
│   └── api-reference.md               # API usage examples
├── design/                            # Design system and UX guidelines
│   ├── style-guide.md                 # UI design system (from UX_STYLE_GUIDE.md)
│   └── component-library.md           # Component usage guidelines
└── reference_old/                     # Archived content (preserved structure)
    ├── README.md                      # Archive navigation and usage guide
    ├── ARCHIVE_INVENTORY.md           # Complete file inventory with metadata
    ├── ARCHIVE_INVENTORY.txt          # Simple file list for automation
    ├── build_docs_CURRENT/            # Completed implementation documentation
    ├── build_docs_FUTURE/             # Future/unimplemented feature plans
    ├── contracts/                     # Superseded contract versions
    ├── matrix/                        # Historical traceability and requirements mapping
    ├── plans/                         # Project planning history and evolution
    └── UXplan/                        # UX planning and design documentation
```

### Key Improvements

1. **Clear Active vs Archive Separation**: Active specs organized functionally, archive preserved for history
2. **Functional Organization**: Active content grouped by purpose (requirements, contracts, guides, design)
3. **Preserved Historical Context**: Archive maintains original structure and relationships
4. **Easy Content Location**: Classification matrix enables quick discovery of relevant content
5. **Migration-Friendly**: Clear process for promoting archive content to active status
6. **Scalable Structure**: Accommodates future growth while maintaining organization

### Reference Patterns

- **For Requirements**: Check `requirements/` first, then `reference_old/build_docs_CURRENT/PRD-NEW.MD`
- **For Implementation**: Check `ARCHITECTURE.md` and `PROJECT_PLAN.md`, then `reference_old/plans/`
- **For Contracts**: Use `contracts/` for current, `reference_old/contracts/` for evolution history
- **For Design**: Use `design/` for current, `reference_old/UXplan/UX_STYLE_GUIDE.md` for history
- **For Planning**: Use `PROJECT_PLAN.md` for current, `reference_old/plans/` for evolution tracking

### Implementation Benefits

- **Reduced Cognitive Load**: Clear distinction between current and historical content
- **Improved Discoverability**: Functional organization matches developer mental models
- **Preserved Knowledge**: Complete historical record maintained for future reference
- **Future-Proof**: Structure accommodates new content types and organizational needs
- **Collaboration-Ready**: Clear guidelines for content placement and referencing

This structure transforms the archive from a dumping ground into a valuable historical resource while providing a clean, functional organization for active development work.