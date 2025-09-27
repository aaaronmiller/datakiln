# DataKiln Workflow Operator Path Guide

## Overview

This guide explains the operator path for DataKiln workflows, covering the complete lifecycle from workflow creation to execution and monitoring.

## Workflow Lifecycle

### 1. Workflow Creation

#### Using the Frontend Editor
1. Navigate to the Workflows page in the DataKiln frontend
2. Click "Create New Workflow"
3. Drag and drop nodes from the node palette:
   - **DomActionNode**: Interact with web page elements
   - **ConditionNode**: Add conditional branching logic
   - **DelayNode**: Introduce configurable delays
   - **WaitNode**: Wait for manual approval or external signals
   - **PromptNode**: Generate AI prompts
   - **TransformNode**: Transform data between steps
   - **ExportNode**: Export results to various destinations

#### Node Configuration
Each node requires specific configuration:
- **Selector Key**: References entries in `selectors.json`
- **Action Type**: click, type, extract, etc.
- **Input/Output Mappings**: Define data flow between nodes
- **Error Handling**: Retry counts, timeouts, fallback strategies

### 2. Workflow Validation

Before execution, workflows are validated for:
- **Graph Structure**: No cycles, valid connections
- **Node Configuration**: Required fields present
- **Selector Resolution**: All referenced selectors exist
- **Data Flow**: Compatible input/output types

### 3. Workflow Execution

#### Execution States
The workflow executor uses a state machine with these states:
- `IDLE`: Ready to start
- `LOAD_WORKFLOW`: Loading and validating workflow
- `RESOLVE_NODE`: Preparing current node for execution
- `RESOLVE_SELECTORS`: Resolving DOM selectors
- `EXECUTE_NODE`: Running node logic
- `WAIT_FOR_DOM`: Waiting for page readiness
- `PERFORM_ACTION`: Executing DOM actions
- `CAPTURE_OUTPUT`: Collecting results
- `NEXT_NODE`: Advancing to next node
- `PERSIST_ARTIFACTS`: Saving execution results
- `COMPLETE`: Execution finished
- `ERROR`: Execution failed
- `RETRY`: Retrying failed operation

#### Error Handling & Recovery
- **Per-Step Retries**: Exponential backoff for transient failures
- **WebSocket Reporting**: Real-time error notifications
- **Recovery Strategies**: Skip, retry, fallback, circuit breaker
- **Workflow-Level Handling**: Continue on error, rollback, compensate

### 4. Real-Time Monitoring

#### WebSocket Events
Execution progress is streamed via WebSocket:
- `execution_started`: Workflow begins
- `step_started`: Node execution begins
- `step_succeeded`: Node completes successfully
- `step_failed`: Node fails with error details
- `data_handoff`: Data passed between nodes
- `node_waiting`: Node waiting for approval/signal
- `execution_completed`: Workflow finishes

#### Browser Extension Integration
The Chrome extension provides:
- **Context Menu Triggers**: Right-click to execute workflows
- **Real-Time Notifications**: Desktop notifications for status updates
- **Manual Approvals**: Interactive approval dialogs for WaitNodes

## Node Types Reference

### DomActionNode
**Purpose**: Interact with web page elements
**Configuration**:
- `selector_key`: Reference to selectors.json entry
- `action`: click, type, extract, wait
- `value`: Input value for type actions
- `timeout`: Maximum wait time
- `fallback_selectors`: Alternative selectors if primary fails

### ConditionNode
**Purpose**: Conditional branching logic
**Configuration**:
- `expr`: Condition expression (Python or simple syntax)
- `condition_type`: simple, python, jsonpath, regex
- `true_next`: Nodes to execute if condition is true
- `false_next`: Nodes to execute if condition is false

### DelayNode
**Purpose**: Introduce configurable delays
**Configuration**:
- `delay_seconds`: Base delay duration
- `delay_type`: fixed, random, progressive
- `min_delay`/`max_delay`: Random delay range
- `skip_on_condition`: Optional condition to skip delay

### WaitNode
**Purpose**: Wait for manual approval or external signals
**Configuration**:
- `wait_type`: manual_approval, external_signal, condition
- `approval_message`: Message for manual approval requests
- `timeout_seconds`: Maximum wait time
- `signal_key`: Key for external signal waiting

## Best Practices

### Workflow Design
1. **Keep workflows focused**: Single responsibility per workflow
2. **Use descriptive names**: Clear node and workflow names
3. **Handle errors gracefully**: Configure appropriate retry and fallback strategies
4. **Test incrementally**: Validate each node before connecting others

### Performance Optimization
1. **Minimize DOM waits**: Use appropriate timeouts
2. **Batch operations**: Group related actions
3. **Cache selectors**: Reuse resolved selectors when possible
4. **Monitor resource usage**: Track memory and CPU usage

### Error Handling
1. **Configure retries**: Set appropriate retry counts for transient failures
2. **Use circuit breakers**: Prevent cascade failures
3. **Log comprehensive errors**: Include context for debugging
4. **Implement fallbacks**: Alternative paths for critical operations

## Troubleshooting

### Common Issues

#### Selector Resolution Failures
- **Symptom**: "Could not resolve selector" errors
- **Cause**: Missing or invalid selector in selectors.json
- **Solution**: Check selector key spelling, verify selectors.json format

#### Node Execution Timeouts
- **Symptom**: Nodes timing out during execution
- **Cause**: Network issues, slow page loads, or tight timeouts
- **Solution**: Increase timeout values, check network connectivity

#### WebSocket Connection Issues
- **Symptom**: No real-time updates, extension not responding
- **Cause**: Backend WebSocket server not running or network blocking
- **Solution**: Verify backend is running on correct port, check firewall settings

#### Memory Issues
- **Symptom**: Workflows failing with memory errors
- **Cause**: Large data processing or memory leaks
- **Solution**: Process data in chunks, monitor memory usage, restart services

### Debug Tools
- **Execution Logs**: Check WebSocket events for detailed step information
- **Browser DevTools**: Inspect network requests and DOM state
- **Backend Logs**: Review server logs for internal errors
- **Extension Console**: Check browser extension logs for client-side issues