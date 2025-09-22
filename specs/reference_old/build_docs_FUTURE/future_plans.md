# Future Plans and Roadmap

This document outlines the unimplemented ideas and the roadmap for the future development of the node-based query system.

## Short-Term Goals (Next 3-6 Months)

*   **Implementation of Core Features**:
    *   Develop the basic node types (DataSource, Filter, Sort, Aggregate).
    *   Implement the drag-and-drop UI for the node editor.
    *   Build the JSON serialization and deserialization for saving and loading queries.
    *   Create the formula visualization bar.
*   **Initial Integration**:
    *   Integrate the query system with the existing workflow system as a new step type.
*   **Testing**:
    *   Develop a suite of unit and integration tests for the core components.

## Medium-Term Goals (6-12 Months)

*   **Advanced Node Types**:
    *   Introduce more complex node types, such as Join, Union, and custom script nodes.
    *   Allow users to create and save their own custom nodes.
*   **Real-Time Collaboration**:
    *   Implement features for multiple users to collaborate on a single query graph in real-time.
*   **Performance Optimization**:
    *   Optimize the query processing engine for large datasets.
*   **Versioning**:
    *   Add support for versioning of query graphs.

## Long-Term Goals (1-2 Years)

*   **Machine Learning Integration**:
    *   Integrate machine learning models as node types, allowing users to build predictive queries.
*   **Natural Language Processing (NLP) Input**:
    *   Allow users to create queries by typing natural language questions, which will be automatically converted into a node graph.
*   **Expanded Data Source Support**:
    *   Add support for a wider range of data sources, including NoSQL databases, APIs, and streaming data platforms.

## Unimplemented Ideas

*   **Visual Debugging**: A tool for visually debugging the flow of data through the query graph.
*   **Automated Query Optimization**: A feature that automatically suggests optimizations to the query graph for better performance.
*   **Node Marketplace**: A place for users to share and download custom nodes.