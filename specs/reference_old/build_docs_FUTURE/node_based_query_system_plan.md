# Node-Based Query System Plan

This document outlines the technical specification for the node-based query system.

## 1. System Overview

The node-based query system provides a visual interface for constructing complex data queries. Users can create, connect, and configure nodes to define a data processing pipeline. This system is designed to be modular, extensible, and integrate seamlessly with the existing workflow.

## 2. Core Concepts

### 2.1. Nodes

Nodes are the fundamental building blocks of the query system. Each node represents a specific data operation, such as fetching, filtering, transforming, or outputting data.

#### 2.1.1. Node Types

There are two primary categories of nodes:

*   **Transmissional Nodes**: These nodes pass data through without modification. They are used for control flow, such as branching or merging data streams.
*   **Transformational Nodes**: These nodes modify the data that passes through them. Examples include filtering records, adding calculated fields, or aggregating data.

### 2.2. Connections

Connections link nodes together, defining the flow of data through the query. Each connection has a source and a destination node.

### 2.3. Graph

A collection of nodes and connections forms a query graph, representing a complete data processing workflow.

## 3. DOM Element Definitions

The system will interact with the DOM to render the node-based editor. Each node will be represented by a DOM element with the following structure:

```html
<div class="node" data-node-id="123">
  <div class="node-header">
    <span class="node-title">Node Title</span>
  </div>
  <div class="node-body">
    <!-- Node-specific UI for configuration -->
  </div>
  <div class="node-ports">
    <div class="port in"></div>
    <div class="port out"></div>
  </div>
</div>
```

### 3.1. Prompts (Prepend/Append)

To enhance user interaction, prompts will be displayed when hovering over connection ports, indicating whether a new node will be prepended or appended to the data flow.

## 4. JSON Representation

The query graph will be serialized to and from a JSON format for storage and transmission. This allows for saving, loading, and sharing of queries.

```json
{
  "nodes": [
    {
      "id": "1",
      "type": "DataSourceNode",
      "position": { "x": 100, "y": 100 },
      "properties": {
        "source": "users_table"
      }
    },
    {
      "id": "2",
      "type": "FilterNode",
      "position": { "x": 300, "y": 100 },
      "properties": {
        "condition": "age > 30"
      }
    }
  ],
  "connections": [
    {
      "source": "1",
      "target": "2"
    }
  ]
}
```

## 5. Formula Visualization

A formula bar will display a human-readable representation of the query as nodes are connected. This provides immediate feedback and helps users understand the logic of their query.

For example, connecting a `DataSourceNode` (Users) to a `FilterNode` (age > 30) would display: `FILTER(DATASOURCE("Users"), "age > 30")`.

## 6. Processing Model

### 6.1. Recursive and Iterative Processing

The system will support both recursive and iterative processing of the query graph. This allows for handling complex scenarios, such as nested queries or looping over datasets. The processing engine will traverse the graph, executing the operation defined by each node in the correct order.

## 7. User Interface

### 7.1. Drag-and-Drop

The UI will support drag-and-drop functionality for adding, removing, and reorganizing nodes within the editor.

## 8. Integration with Existing Workflow System

The node-based query system will be integrated with the existing workflow system. A completed query graph can be saved as a workflow step, allowing it to be executed as part of a larger automated process.
## 9. Integration with WorkflowBuilder

The node-based query system will be integrated into the existing `WorkflowBuilder` as a specialized node type called `QueryNode`.

### 9.1. `QueryNode` Component

A new `QueryNode.tsx` component will be created to represent the query task on the main workflow canvas. This component will provide a summary of the query and a button to open the advanced `QueryEditor`.

### 9.2. `QueryEditor` Modal

The `QueryEditor` will be a modal or separate view that contains a dedicated `ReactFlow` instance for building the query graph. The state of this query graph will be stored in the `data` property of the `QueryNode` in the main `workflowStore`.

### 9.3. Registration in `WorkflowBuilder`

The `QueryNode` will be registered in `WorkflowBuilder.tsx` by:

1.  Adding it to the `nodeTypes` object.
2.  Adding a new entry to the `availableNodeTypes` array to make it accessible from the toolbar.

This approach ensures that the query system is a seamless extension of the existing workflow functionality, rather than a separate system.