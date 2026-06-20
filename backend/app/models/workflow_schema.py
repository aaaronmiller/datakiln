"""
DataKiln Workflow Schema — Atomic / Molecular / Chemical Type System
=====================================================================

This module defines the complete type hierarchy for the DataKiln workflow
execution engine. It formalises what the workflow assembly tool (ReactFlow)
creates and what the DAG executor processes, ensuring:

  • ATOMIC    — Every Node is a typed unit with named input/output ports,
                a role (system-prompter, user-prompter, transformer, etc.),
                and a well-defined data contract.
  • MOLECULAR — Groups of nodes can be packaged as a Subgraph, exposing
                only its boundary ports.  A SubgraphInvocation node imports
                a subgraph and wires its internal boundary ports to the
                outer graph.
  • CHEMICAL  — A WorkflowComposition composes subgraphs (and free atoms)
                into a directed graph that can be handed to the executor.

The system is Turing-complete: a Subgraph can contain SubgraphInvocation nodes
that pull in other subgraphs, giving arbitrary nesting and recursion (within
practical acyclicity constraints enforced at plan time).

Edge types (connectors)
-----------------------
  "direct"     — pass raw data from source port → target port.
  "transform"  — apply a transformer function (registered in the transformer
                  registry) before forwarding.
  "route"      — conditional: route data to one of several target ports
                  based on a DKEL expression.
  "merge"      — collect data from N parallel sources into one port.
  "fork"       — broadcast the same data to N target ports.

Content / Information Transformers
----------------------------------
Transformers are callable objects registered by ID.  Built-in examples:
  "markdown_to_html", "json_to_yaml", "llm_chat", "text_chunk",
  "html_to_markdown", "resolve_template" — and any user-registered
  transformer.

Prompt Roles (System / User / Assistant / Tool)
------------------------------------------------
Every LLM-facing input port declares its "prompt_role":
  "system"     — System prompt (guidance, constraints, persona).
  "user"       — The human/user message.
  "assistant"  — Prior LLM response (for multi-turn).
  "tool"       — Tool call result.
  "none"       — Not a prompt, regular data.

This lets the executor automatically structure the correct LLM
message array from raw port data.

Implementation notes
--------------------
  • All models are Pydantic v2 BaseModel for validation + serialisation.
  • The schema is "fat" — it validates everything the executor needs and
    catches mismatches early.
  • JSON Schema generation is available via .model_json_schema() for
    the frontend workflow assembly tool.
  • Scalars, edges, and subgraphs are all stored in the same registry
    structure, loaded on startup into the WorkflowSchemaRegistry.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Set, Tuple, Union

from pydantic import BaseModel, Field, field_validator, model_validator


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  PRIMITIVES  (shared across all layers)                                    ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

DkScalar = Union[str, int, float, bool, None]
# DkValue is a recursive type alias for arbitrary JSON-compatible data.
# Defined with Any to avoid Pydantic v2 recursion limits on recursive type aliases.
DkValue = Any

PortName = str
"""Unique name of a port within a node/subgraph."""


class PortDirection(str, enum.Enum):
    INPUT = "input"
    OUTPUT = "output"


class DataType(str, enum.Enum):
    """The type-kind of data a port carries."""
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"
    MARKDOWN = "markdown"
    JSON = "json"
    LLM_MESSAGES = "llm_messages"      # pre-structured message array
    ANY = "any"                         # runtime-determined


class PromptRole(str, enum.Enum):
    """Semantic role of an LLM-facing input port."""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"
    NONE = "none"                        # not an LLM prompt, regular data


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  ATOMIC LAYER  —  Port, NodeDef, Edge, DataPacket                           ║
# ╚══════════════════════════════════════════════════════════════════════════════╝


class Port(BaseModel):
    """A typed input or output port on a node or subgraph boundary."""

    name: PortName
    label: str = ""
    description: str = ""
    data_type: DataType = DataType.ANY
    direction: PortDirection
    required: bool = True
    prompt_role: PromptRole = PromptRole.NONE
    """Matters for LLM nodes — tells the executor how to pack this
       value into the message array sent to the provider."""
    default_value: Optional[DkValue] = None
    """Fallback when no edge feeds this port."""
    allowed_values: Optional[List[DkValue]] = None
    """If set, runtime value must be one of these (enum constraint)."""

    # Schema ref for richer validation  (dk://types/…)
    schema_ref: Optional[str] = None


class NodeCategory(str, enum.Enum):
    """High-level category of a node definition."""
    PROVIDER = "provider"           # LLM / API call
    DATA_SOURCE = "data_source"     # file, web, DB
    TRANSFORM = "transform"         # data transformation
    FILTER = "filter"               # data filtering / routing
    LOGIC = "logic"                 # condition, merge, split, loop
    DOM_ACTION = "dom_action"       # browser automation
    EXPORT = "export"               # file / DB write
    PROMPT = "prompt"               # prompt builder
    AGGREGATE = "aggregate"         # reduce / group
    SUBGRAPH = "subgraph"           # molecular wrapper node
    CODE = "code"                   # constrained built-in code template


class NodeDef(BaseModel):
    """
    ATOMIC — definition of a single node *type* (not instance).
    This is what lives in the registry (the palette the user drags from).
    """

    type: str = Field(..., pattern=r"^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$",
                      description="Fully-qualified node type identifier, "
                                  "e.g. 'llm.gemini.chat' or 'logic.condition'")
    version: str = "1.0.0"
    category: NodeCategory
    label: str = ""
    description: str = ""
    icon: str = ""

    # ── Ports ──────────────────────────────────────────────────────────────
    input_ports: List[Port] = Field(default_factory=list,
                                    description="Static input ports.")
    output_ports: List[Port] = Field(default_factory=list,
                                     description="Static output ports.")
    dynamic_inputs: bool = False
    """If True, accept arbitrary additional input ports at runtime
       (e.g. merge nodes)."""
    dynamic_outputs: bool = False
    """If True, accept arbitrary additional output ports at runtime."""

    # ── Execution ──────────────────────────────────────────────────────────
    executor: str = Field(..., description="Registered executor ID, "
                          "e.g. 'llm.chat', 'code.run', 'subprocess'")
    timeout_seconds: int = 300
    max_retries: int = 3
    retry_delay_seconds: float = 1.0

    # ── Configuration schema (JSON Schema) ────────────────────────────────
    config_schema: Dict[str, Any] = Field(default_factory=dict)
    """JSON Schema for the `config` dictionary the user fills in."""

    # ── Prompt contract ────────────────────────────────────────────────────
    system_prompt_template: Optional[str] = None
    """Template for the system prompt (Jinja2-style).  Substituted with
       data from input ports and config at execution time."""
    user_prompt_template: Optional[str] = None
    """Template for the user prompt."""

    # ── Tags / Metadata ────────────────────────────────────────────────────
    tags: List[str] = Field(default_factory=list)
    author: str = "datakiln-core"
    homepage: Optional[str] = None
    documentation: Optional[str] = None


class NodeInstance(BaseModel):
    """
    ATOMIC — a single instantiated node in a workflow graph.
    """

    id: str = Field(default_factory=lambda: f"n_{uuid.uuid4().hex[:12]}")
    type: str
    label: str = ""
    description: str = ""

    # ── Port wiring (instance-level) ───────────────────────────────────────
    config: Dict[str, Any] = Field(default_factory=dict)
    """Runtime configuration values.  Validated against NodeDef.config_schema
       at plan time."""

    inputs: Dict[PortName, Any] = Field(default_factory=dict)
    """Literal input values (for constants / seed data).  At runtime these
       are overridden by edge data."""

    metadata: Dict[str, Any] = Field(default_factory=dict)

    # Status tracking (set during execution)
    status: str = "pending"
    error_message: Optional[str] = None
    execution_time_ms: Optional[float] = None


# ── Edge types (connectors) ───────────────────────────────────────────────────


class EdgeMode(str, enum.Enum):
    DIRECT = "direct"          # pass data as-is
    TRANSFORM = "transform"    # apply a transformer before forwarding
    ROUTE = "route"            # conditional routing via DKEL
    MERGE = "merge"            # collect from multiple sources
    FORK = "fork"              # broadcast to multiple targets


class TransformerSpec(BaseModel):
    """Specification of a transformer to apply to data flowing through an edge."""

    transformer_id: str = Field(..., description="Registered transformer ID")
    params: Dict[str, Any] = Field(default_factory=dict)
    """Arguments to parameterise the transformer."""


class EdgeInstance(BaseModel):
    """
    ATOMIC — a directed connection between two ports (or one port and
    a route target).
    """

    id: str = Field(default_factory=lambda: f"e_{uuid.uuid4().hex[:12]}")
    source_node_id: str
    source_port: PortName = "output"
    target_node_id: str
    target_port: PortName = "input"

    mode: EdgeMode = EdgeMode.DIRECT

    # ── Transform mode ─────────────────────────────────────────────────────
    transformer: Optional[TransformerSpec] = None

    # ── Route mode ─────────────────────────────────────────────────────────
    condition_expression: Optional[str] = None
    """DKEL expression for route mode.  Evaluated at runtime."""

    # ── Merge / Fork ───────────────────────────────────────────────────────
    merge_strategy: Optional[Literal["wait_all", "first_n", "quorum",
                                     "timeout"]] = None
    merge_timeout_ms: Optional[int] = None
    merge_quorum: Optional[int] = None
    merge_first_n: Optional[int] = None

    # ── Metadata ───────────────────────────────────────────────────────────
    label: str = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ── Runtime data packet (what actually moves through the graph) ──────────────


class DataPacket(BaseModel):
    """
    ATOMIC — a unit of data transmitted between nodes through edges.
    """

    source: Tuple[str, PortName]          # (node_id, port_name)
    target: Tuple[str, PortName]          # (node_id, port_name)
    value: Any
    data_type: DataType = DataType.ANY
    mime_type: str = "application/json"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def node_pair(self) -> Tuple[str, str]:
        return (self.source[0], self.target[0])


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  MOLECULAR LAYER  —  Subgraph, BoundaryPort, SubgraphInvocation             ║
# ╚══════════════════════════════════════════════════════════════════════════════╝


class BoundaryPort(BaseModel):
    """
    MOLECULAR — an exposed port of a Subgraph.  Internally it is wired to
    an internal node's port so that data can flow in/out of the subgraph.
    """

    name: PortName
    label: str = ""
    data_type: DataType = DataType.ANY
    direction: PortDirection
    prompt_role: PromptRole = PromptRole.NONE

    # Port of the internal node that this boundary port connects to.
    internal_node_id: str
    internal_port: PortName

    required: bool = True
    default_value: Optional[DkValue] = None


class Subgraph(BaseModel):
    """
    MOLECULAR — a reusable sub-workflow composed of atomic nodes and
    (recursively) other subgraph invocations.  Exposes boundary ports.
    """

    id: str = Field(..., description="Fully-qualified subgraph ID "
                    "e.g. 'molecular.deep-research-v1'")
    version: str = "1.0.0"
    label: str = ""
    description: str = ""

    # ── Boundary ───────────────────────────────────────────────────────────
    input_ports: List[BoundaryPort] = Field(default_factory=list)
    output_ports: List[BoundaryPort] = Field(default_factory=list)

    # ── Internal graph ─────────────────────────────────────────────────────
    nodes: List[NodeInstance] = Field(default_factory=list)
    edges: List[EdgeInstance] = Field(default_factory=list)

    # ── Metadata ───────────────────────────────────────────────────────────
    tags: List[str] = Field(default_factory=list)
    author: str = "datakiln"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    @model_validator(mode="after")
    def _check_boundary_ports_have_internal_wiring(self) -> "Subgraph":
        internal_ids = {n.id for n in self.nodes}
        for bp in self.input_ports + self.output_ports:
            if bp.internal_node_id not in internal_ids:
                raise ValueError(
                    f"Boundary port '{bp.name}' references internal node "
                    f"'{bp.internal_node_id}' which is not in the subgraph"
                )
        return self


class SubgraphInvocation(NodeInstance):
    """
    MOLECULAR — a node in a graph that invokes a registered subgraph.
    The executor expands this into the subgraph's internal nodes at
    plan time, connecting boundary ports.
    """

    subgraph_ref: str = Field(..., description="Subgraph ID to invoke")


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  CHEMICAL LAYER  —  WorkflowComposition, ExecutionPlan                      ║
# ╚══════════════════════════════════════════════════════════════════════════════╝


class WorkflowComposition(BaseModel):
    """
    CHEMICAL — a complete workflow that composes subgraphs (molecular)
    and free nodes (atomic) into a single executable graph.
    """

    id: str = ""
    name: str = ""
    description: str = ""
    version: str = "1.0.0"

    # Flat list of every node (including SubgraphInvocation nodes).
    nodes: List[NodeInstance] = Field(default_factory=list)
    edges: List[EdgeInstance] = Field(default_factory=list)

    # Sub-graphs referenced by SubgraphInvocation nodes.
    subgraphs: Dict[str, Subgraph] = Field(default_factory=dict)

    # ── Execution config ───────────────────────────────────────────────────
    execution_options: Dict[str, Any] = Field(default_factory=dict)
    """e.g. {"stop_on_failure": True, "max_parallel_nodes": 4}"""

    # ── Metadata ───────────────────────────────────────────────────────────
    tags: List[str] = Field(default_factory=list)
    author: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    # ── Validation ─────────────────────────────────────────────────────────
    @model_validator(mode="after")
    def _no_orphan_edges(self) -> "WorkflowComposition":
        node_ids = {n.id for n in self.nodes}
        for e in self.edges:
            if e.source_node_id not in node_ids:
                raise ValueError(f"Edge {e.id}: source node {e.source_node_id} not in nodes")
            if e.target_node_id not in node_ids:
                raise ValueError(f"Edge {e.id}: target node {e.target_node_id} not in nodes")
        return self


class ExecutableNode(BaseModel):
    """
    A fully resolved node ready for execution.  SubgraphInvocation
    nodes have been expanded.
    """

    id: str
    type: str
    label: str = ""
    config: Dict[str, Any] = Field(default_factory=dict)
    inputs: Dict[PortName, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # Resolved port info
    input_ports: List[Port] = Field(default_factory=list)
    output_ports: List[Port] = Field(default_factory=list)

    # Prompt templates (fully substituted)
    system_prompt: Optional[str] = None
    user_prompt: Optional[str] = None

    executor_id: str = "code.run"
    timeout_seconds: int = 300
    max_retries: int = 3
    retry_delay_seconds: float = 1.0


class ExecutableEdge(BaseModel):
    """A fully resolved edge in the execution plan."""

    id: str
    source_node_id: str
    source_port: PortName
    target_node_id: str
    target_port: PortName
    mode: EdgeMode = EdgeMode.DIRECT
    transformer: Optional[TransformerSpec] = None
    condition_expression: Optional[str] = None


class ExecutionPlan(BaseModel):
    """
    CHEMICAL — the resolved, ready-to-execute plan.
    The planner (WorkflowPlanner) converts a WorkflowComposition into this.
    """

    workflow_id: str
    plan_id: str = Field(default_factory=lambda: f"plan_{uuid.uuid4().hex[:12]}")
    execution_options: Dict[str, Any] = Field(default_factory=dict)

    # Flattened / expanded nodes (subgraphs expanded)
    nodes: Dict[str, ExecutableNode]  # node_id → node
    edges: List[ExecutableEdge]

    # Topological order
    execution_order: List[str] = Field(default_factory=list)

    # Port compatibility checks already passed
    validated: bool = False

    # Dangling inputs (those not fed by any edge) — must have defaults
    unresolved_inputs: Dict[str, List[PortName]] = Field(default_factory=dict)

    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  REGISTRY  —  schema registry                                               ║
# ╚══════════════════════════════════════════════════════════════════════════════╝


class WorkflowSchemaRegistry(BaseModel):
    """
    Central registry of node definitions, subgraphs, transformers,
    data types, and adapters.
    """

    node_defs: Dict[str, NodeDef] = Field(default_factory=dict)
    """type → NodeDef"""

    subgraphs: Dict[str, Subgraph] = Field(default_factory=dict)
    """subgraph_id → Subgraph"""

    transformers: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    """transformer_id → metadata (actual callables are registered elsewhere)"""

    types: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    """type_ref → JSON Schema"""

    def get_node_def(self, type_name: str) -> Optional[NodeDef]:
        return self.node_defs.get(type_name)

    def get_subgraph(self, subgraph_id: str) -> Optional[Subgraph]:
        return self.subgraphs.get(subgraph_id)

    def get_transformer(self, transformer_id: str) -> Optional[Dict[str, Any]]:
        return self.transformers.get(transformer_id)

    def register_node_def(self, node_def: NodeDef) -> None:
        self.node_defs[node_def.type] = node_def

    def register_subgraph(self, subgraph: Subgraph) -> None:
        self.subgraphs[subgraph.id] = subgraph


# ── Built-in node definitions ─────────────────────────────────────────────────

BUILTIN_NODE_DEFS: Dict[str, NodeDef] = {
    "llm.chat": NodeDef(
        type="llm.chat",
        category=NodeCategory.PROVIDER,
        label="LLM Chat",
        description="Send a chat request to an LLM provider",
        executor="llm.chat",
        input_ports=[
            Port(name="system_prompt", label="System Prompt",
                 data_type=DataType.STRING, direction=PortDirection.INPUT,
                 prompt_role=PromptRole.SYSTEM, required=False),
            Port(name="user_prompt", label="User Prompt",
                 data_type=DataType.STRING, direction=PortDirection.INPUT,
                 prompt_role=PromptRole.USER, required=True),
            Port(name="messages", label="Message History",
                 data_type=DataType.LLM_MESSAGES, direction=PortDirection.INPUT,
                 prompt_role=PromptRole.NONE, required=False),
        ],
        output_ports=[
            Port(name="response", label="Response",
                 data_type=DataType.STRING, direction=PortDirection.OUTPUT),
            Port(name="metadata", label="Metadata",
                 data_type=DataType.OBJECT, direction=PortDirection.OUTPUT),
        ],
        config_schema={
            "type": "object",
            "properties": {
                "provider": {"type": "string", "enum": ["gemini", "openai", "perplexity"]},
                "model": {"type": "string"},
                "temperature": {"type": "number", "default": 0.7},
                "max_tokens": {"type": "integer", "default": 2048},
            },
            "required": ["provider"],
        },
        tags=["llm", "provider"],
    ),
    "logic.condition": NodeDef(
        type="logic.condition",
        category=NodeCategory.LOGIC,
        label="Condition",
        description="Route data based on a DKEL expression",
        executor="code.run",
        input_ports=[
            Port(name="input", label="Input",
                 data_type=DataType.ANY, direction=PortDirection.INPUT),
        ],
        output_ports=[
            Port(name="true", label="True",
                 data_type=DataType.ANY, direction=PortDirection.OUTPUT),
            Port(name="false", label="False",
                 data_type=DataType.ANY, direction=PortDirection.OUTPUT),
        ],
        config_schema={
            "type": "object",
            "properties": {
                "condition": {
                    "type": "string",
                    "description": "DKEL boolean expression (e.g. input.score > 50)",
                }
            },
            "required": ["condition"],
        },
    ),
    "logic.merge": NodeDef(
        type="logic.merge",
        category=NodeCategory.LOGIC,
        label="Merge",
        description="Aggregate results from multiple parallel branches",
        executor="code.run",
        dynamic_inputs=True,
        input_ports=[
            Port(name="input_0", label="Input 0",
                 data_type=DataType.ANY, direction=PortDirection.INPUT, required=False),
        ],
        output_ports=[
            Port(name="output", label="Output",
                 data_type=DataType.ARRAY, direction=PortDirection.OUTPUT),
        ],
        config_schema={
            "type": "object",
            "properties": {
                "strategy": {"enum": ["wait_all", "first_n", "quorum", "timeout"]},
                "timeout_ms": {"type": "integer"},
                "quorum": {"type": "integer"},
            },
            "required": ["strategy"],
        },
    ),
    "data_source.inline": NodeDef(
        type="data_source.inline",
        category=NodeCategory.DATA_SOURCE,
        label="Inline Data",
        description="Emit literal data supplied by the workflow builder",
        executor="code.run",
        input_ports=[],
        output_ports=[
            Port(name="output", label="Output",
                 data_type=DataType.ANY, direction=PortDirection.OUTPUT),
        ],
        config_schema={
            "type": "object",
            "properties": {
                "value": {"description": "Literal value emitted by this node"},
            },
        },
        tags=["data-source", "inline"],
    ),
    "data_source.web": NodeDef(
        type="data_source.web",
        category=NodeCategory.DATA_SOURCE,
        label="Web Data Source",
        description="Fetch data from a URL",
        executor="web.fetch",
        input_ports=[
            Port(name="url", label="URL",
                 data_type=DataType.STRING, direction=PortDirection.INPUT, required=True),
            Port(name="headers", label="Headers",
                 data_type=DataType.OBJECT, direction=PortDirection.INPUT, required=False),
        ],
        output_ports=[
            Port(name="data", label="Data",
                 data_type=DataType.STRING, direction=PortDirection.OUTPUT),
            Port(name="content_type", label="Content Type",
                 data_type=DataType.STRING, direction=PortDirection.OUTPUT),
            Port(name="status_code", label="Status Code",
                 data_type=DataType.NUMBER, direction=PortDirection.OUTPUT),
        ],
        config_schema={
            "type": "object",
            "properties": {
                "method": {"type": "string", "default": "GET"},
                "timeout_ms": {"type": "integer", "default": 30000},
            },
        },
        tags=["web", "data-source"],
    ),
    "transform.markdown": NodeDef(
        type="transform.markdown",
        category=NodeCategory.TRANSFORM,
        label="Markdown Transform",
        description="Transform markdown content (clean, convert, extract)",
        executor="code.run",
        input_ports=[
            Port(name="input", label="Input",
                 data_type=DataType.STRING, direction=PortDirection.INPUT),
        ],
        output_ports=[
            Port(name="output", label="Output",
                 data_type=DataType.STRING, direction=PortDirection.OUTPUT),
        ],
        config_schema={
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": ["clean", "html_to_markdown", "extract_headings",
                             "extract_code_blocks", "strip_frontmatter", "wrap_in_template"],
                },
                "template": {"type": "string"},
            },
            "required": ["operation"],
        },
    ),
    "data_source.youtube": NodeDef(
        type="data_source.youtube",
        category=NodeCategory.DATA_SOURCE,
        label="YouTube Transcript",
        description="Extract transcript from a YouTube video",
        executor="youtube.transcript",
        input_ports=[
            Port(name="url", label="Video URL",
                 data_type=DataType.STRING, direction=PortDirection.INPUT, required=True),
        ],
        output_ports=[
            Port(name="transcript", label="Transcript",
                 data_type=DataType.STRING, direction=PortDirection.OUTPUT),
            Port(name="segments", label="Segments",
                 data_type=DataType.ARRAY, direction=PortDirection.OUTPUT),
            Port(name="metadata", label="Video Metadata",
                 data_type=DataType.OBJECT, direction=PortDirection.OUTPUT),
        ],
        config_schema={
            "type": "object",
            "properties": {
                "language": {"type": "string", "default": "en"},
                "include_timestamps": {"type": "boolean", "default": True},
            },
        },
    ),
    "dom.gemini.deep_research": NodeDef(
        type="dom.gemini.deep_research",
        category=NodeCategory.DOM_ACTION,
        label="Gemini Deep Research",
        description="Run a Gemini Deep Research browser automation sequence",
        executor="dom.sequence",
        input_ports=[
            Port(name="query", label="Research Query",
                 data_type=DataType.STRING, direction=PortDirection.INPUT),
        ],
        output_ports=[
            Port(name="result", label="Result",
                 data_type=DataType.STRING, direction=PortDirection.OUTPUT),
            Port(name="actions", label="Actions",
                 data_type=DataType.ARRAY, direction=PortDirection.OUTPUT),
        ],
        config_schema={
            "type": "object",
            "properties": {
                "provider": {"const": "gemini"},
                "mode": {"enum": ["fast", "balanced", "comprehensive"]},
                "timeout_ms": {"type": "integer", "default": 600000},
                "dom_action_sequence": {"type": "array"},
            },
        },
        tags=["dom", "gemini", "deep-research"],
    ),
    "dom.perplexity.pro_search": NodeDef(
        type="dom.perplexity.pro_search",
        category=NodeCategory.DOM_ACTION,
        label="Perplexity Pro Search",
        description="Run a Perplexity browser search sequence",
        executor="dom.sequence",
        input_ports=[
            Port(name="query", label="Search Query",
                 data_type=DataType.STRING, direction=PortDirection.INPUT),
        ],
        output_ports=[
            Port(name="result", label="Result",
                 data_type=DataType.STRING, direction=PortDirection.OUTPUT),
            Port(name="actions", label="Actions",
                 data_type=DataType.ARRAY, direction=PortDirection.OUTPUT),
        ],
        config_schema={
            "type": "object",
            "properties": {
                "provider": {"const": "perplexity"},
                "focus": {"enum": ["web", "news", "academic", "writing"]},
                "timeout_ms": {"type": "integer", "default": 300000},
                "dom_action_sequence": {"type": "array"},
            },
        },
        tags=["dom", "perplexity", "search", "research"],
    ),
    "code.youtube_id_extract": NodeDef(
        type="code.youtube_id_extract",
        category=NodeCategory.CODE,
        label="Extract YouTube IDs",
        description="Extract YouTube video IDs from URLs or text",
        executor="code.run",
        input_ports=[
            Port(name="input", label="Input",
                 data_type=DataType.STRING, direction=PortDirection.INPUT),
        ],
        output_ports=[
            Port(name="ids", label="IDs",
                 data_type=DataType.ARRAY, direction=PortDirection.OUTPUT),
            Port(name="output", label="Output",
                 data_type=DataType.ARRAY, direction=PortDirection.OUTPUT),
        ],
        config_schema={
            "type": "object",
            "properties": {
                "extract_all": {"type": "boolean", "default": True},
            },
        },
        tags=["code", "youtube", "extract"],
    ),
    "export.file": NodeDef(
        type="export.file",
        category=NodeCategory.EXPORT,
        label="File Export",
        description="Export data to a file",
        executor="code.run",
        input_ports=[
            Port(name="data", label="Data",
                 data_type=DataType.ANY, direction=PortDirection.INPUT, required=True),
            Port(name="filename", label="Filename",
                 data_type=DataType.STRING, direction=PortDirection.INPUT, required=True),
        ],
        output_ports=[
            Port(name="path", label="File Path",
                 data_type=DataType.STRING, direction=PortDirection.OUTPUT),
            Port(name="size", label="File Size",
                 data_type=DataType.NUMBER, direction=PortDirection.OUTPUT),
        ],
        config_schema={
            "type": "object",
            "properties": {
                "format": {"enum": ["json", "markdown", "yaml", "csv", "text"]},
                "directory": {"type": "string"},
            },
            "required": ["format"],
        },
    ),
    "subgraph.invoke": NodeDef(
        type="subgraph.invoke",
        category=NodeCategory.SUBGRAPH,
        label="Subgraph Invocation",
        description="Invoke a reusable sub-workflow",
        executor="subgraph.expand",
        dynamic_inputs=True,
        dynamic_outputs=True,
        input_ports=[],
        output_ports=[],
        config_schema={
            "type": "object",
            "properties": {
                "subgraph_id": {"type": "string"},
            },
            "required": ["subgraph_id"],
        },
    ),
}


def default_registry() -> WorkflowSchemaRegistry:
    """Create a registry pre-populated with built-in node definitions."""
    return WorkflowSchemaRegistry(node_defs=dict(BUILTIN_NODE_DEFS))
