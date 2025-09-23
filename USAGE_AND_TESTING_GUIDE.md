# DataKiln Workflow System - Setup and Testing Guide

## Overview

DataKiln is a comprehensive workflow automation platform that combines AI-powered research, DOM automation, and real-time collaboration features. This guide provides complete instructions for setting up test servers and auditing the completed workflow system.

## Prerequisites

### System Requirements
- **Operating System**: macOS 12+, Windows 10+, Linux (Ubuntu 18.04+)
- **Python**: 3.8+ for backend services
- **Node.js**: 18+ for frontend development
- **Browser**: Chrome/Chromium for DOM automation
- **RAM**: Minimum 8GB, recommended 16GB+
- **Storage**: 2GB free space for application and data

### Required Software
- Python 3.8+ with pip
- Node.js 18+ with npm/yarn
- Chrome or Chromium browser
- Git (for cloning repository)

### API Keys Required
- **Gemini API Key**: From [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Perplexity API Key**: From [Perplexity API](https://www.perplexity.ai/settings/api)

## Current System Status

### ✅ Working Components
- **Backend Setup**: Automated setup script works correctly ✅
- **Dependencies**: All Python and Node.js dependencies install successfully ✅
- **Playwright**: Browser automation framework installs and configures properly ✅
- **Backend API**: FastAPI server starts successfully and serves on port 8000 ✅
- **Selector Registry**: Successfully loads 14 selectors from selectors.json ✅
- **Database**: Ready for SQLite/PostgreSQL integration
- **Testing Framework**: Comprehensive test suite available ✅

### ⚠️ Components Needing Attention
- **Frontend TypeScript**: Multiple type definition conflicts need resolution
- **Workflow Types**: Inconsistencies between different workflow type definitions
- **Template System**: Type mismatches in template handling
- **Validation Service**: Property access issues in error handling

### 🧪 Testing Readiness
- **Backend APIs**: Can be tested via direct HTTP calls and API documentation
- **Workflow Engine**: Core execution engine can be tested with Python scripts
- **Node System**: Individual node types can be tested programmatically
- **Integration Tests**: Backend integration tests are available

## Setup Methods

### Method 1: Local Development Setup (Recommended for Testing)

#### Step 1: Clone and Initial Setup
```bash
# Clone the repository
git clone https://github.com/your-username/datakiln.git
cd datakiln

# Make setup script executable (Linux/macOS)
chmod +x setup.sh
```

#### Step 2: Run Automated Setup
```bash
# This will install all dependencies and set up the environment
./setup.sh
```

The setup script will:
- Check Python and Node.js versions
- Create Python virtual environment
- Install backend dependencies (including Playwright)
- Install frontend dependencies
- Create `.env` configuration file
- Install Playwright browsers

#### Step 3: Configure API Keys
Edit the created `.env` file:
```bash
# Add your API keys
GEMINI_API_KEY=your_actual_gemini_api_key_here
PERPLEXITY_API_KEY=your_actual_perplexity_api_key_here
```

#### Step 4: Start Services
```bash
# Start both backend and frontend servers
./setup.sh
# Select 'y' when prompted to start services
```

**Alternative Manual Startup:**
```bash
# Backend (Terminal 1)
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (Terminal 2)
cd frontend
npm run dev
```

### Method 2: Docker Container Setup

#### Prerequisites for Docker
- Docker Desktop installed and running
- At least 4GB available RAM for containers

#### Setup Steps
```bash
# Ensure you're in the project root
cd datakiln

# Set environment variables for API keys
export GEMINI_API_KEY=your_gemini_api_key
export PERPLEXITY_API_KEY=your_perplexity_api_key

# Start all services with Docker Compose
docker-compose up --build
```

#### Docker Services
- **Backend**: http://localhost:8000 (FastAPI)
- **Frontend**: http://localhost:3000 (React/Vite)
- **Database**: PostgreSQL on port 5432
- **Redis**: Cache on port 6379
- **Nginx**: Reverse proxy on port 80 (optional)

### Method 3: Windows Setup

#### Using setup.bat
```batch
# Run the Windows setup script
setup.bat
```

#### Manual Windows Setup
```batch
# Backend setup
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

# Frontend setup
cd ..\frontend
npm install

# Start services
# Backend (Command Prompt 1)
cd backend
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (Command Prompt 2)
cd frontend
npm run dev
```

## Service Verification

### Backend API Verification
```bash
# Check backend health
curl http://localhost:8000/docs
# Should open FastAPI interactive documentation

# Test API endpoints
curl http://localhost:8000/selectors/registry
curl http://localhost:8000/providers/status
```

### Frontend Verification
**Note**: The frontend currently has TypeScript compilation errors that need to be resolved for full functionality. However, the backend API can be tested independently.

- Backend API testing can proceed without frontend
- Use API documentation at http://localhost:8000/docs for testing
- Frontend will need TypeScript fixes before full UI testing

## Key Features to Test

### 1. Workflow Editor Interface

#### Visual Node Editor
- **Test**: Drag and drop nodes from the palette
- **Nodes Available**:
  - DOM Action Node (click, fill, extract)
  - Prompt Node (AI text generation)
  - Provider Node (Gemini/Perplexity research)
  - Transform Node (data processing)
  - Export Node (file output)
  - Condition Node (branching logic)
  - Filter Node (data filtering)
  - Aggregate Node (data grouping)

#### Node Configuration
- **Test**: Click on nodes to open property panels
- **Verify**: Each node type has appropriate configuration options
- **Test**: Node connections (drag from output to input handles)

### 2. AI Provider Integration

#### Gemini Provider Testing
```bash
# Test Gemini connection
curl -X POST "http://localhost:8000/providers/test" \
  -H "Content-Type: application/json" \
  -d '{"provider": "gemini", "test_query": "Hello world"}'
```

#### Perplexity Provider Testing
```bash
# Test Perplexity connection
curl -X POST "http://localhost:8000/providers/test" \
  -H "Content-Type: application/json" \
  -d '{"provider": "perplexity", "test_query": "What is AI?"}'
```

### 3. DOM Automation Engine

#### Browser Setup Verification
```bash
# Check Playwright installation
cd backend
source venv/bin/activate
playwright --version
playwright install --dry-run chromium
```

#### Selector Registry Testing
```bash
# Get available selectors
curl http://localhost:8000/selectors/registry
```

### 4. Workflow Execution Engine

#### Basic Workflow Test
Create a simple workflow with:
1. Data Source Node (mock data)
2. Filter Node (age > 30)
3. Export Node (JSON output)

Execute and verify:
- All nodes execute successfully
- Data flows between connected nodes
- Output file is generated

#### Complex Workflow Test
Create a comprehensive workflow:
1. Data Source → Filter → Transform → Export
2. Data Source → Aggregate → Export (parallel branch)

Verify execution order and data integrity.

### 5. Real-time Collaboration Features

#### WebSocket Testing
```bash
# Test WebSocket connection (requires wscat or similar)
wscat -c ws://localhost:8000/ws/collaborate
```

#### Multi-user Editing
- Open multiple browser tabs/windows
- Test simultaneous node editing
- Verify conflict resolution
- Check presence indicators

### 6. Version Management

#### Version Control Testing
```bash
# Create a test workflow
curl -X POST "http://localhost:8000/workflows" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Workflow", "nodes": [...], "edges": [...]}'

# Create version
curl -X POST "http://localhost:8000/versions/create" \
  -H "Content-Type: application/json" \
  -d '{"entity_type": "workflow", "entity_id": "test-workflow-id"}'
```

### 7. Export and Persistence

#### File Export Testing
- Execute workflows with Export nodes
- Verify files are created in expected locations
- Test different export formats (JSON, YAML, Markdown, CSV)

#### Workflow Persistence
- Save workflows through UI
- Reload saved workflows
- Verify workflow integrity after save/load cycle

## Immediate Testing (Backend-Only)

Since the frontend has TypeScript issues, you can test the core DataKiln functionality through:

### 1. Backend API Testing
```bash
# Start the backend server
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# In another terminal, test endpoints
curl http://localhost:8000/docs  # API documentation
curl http://localhost:8000/selectors/registry  # Selector registry
```

### 2. Comprehensive Workflow Testing
```bash
# Run the comprehensive workflow test
cd backend
source venv/bin/activate
python test_comprehensive_workflow.py
```

### 3. Unit Test Execution
```bash
# Run backend unit tests
cd backend
source venv/bin/activate
python -m pytest tests/ -v --tb=short
```

### 4. Manual Node Testing
```python
# Test individual nodes programmatically
cd backend
source venv/bin/activate
python3 -c "
from nodes.data_source_node import DataSourceNode
from nodes.filter_node import FilterNode
import asyncio

async def test():
    # Create test data
    data_node = DataSourceNode('test', {'source_type': 'mock', 'mock_data': [{'name': 'Alice', 'age': 30}]})
    result = await data_node.execute({})
    print('Data node result:', result)

asyncio.run(test())
"
```

## Testing Scenarios

### Scenario 1: Basic Research Workflow
1. Create workflow: Provider Node → Export Node
2. Configure Gemini Deep Research with "balanced" depth
3. Execute with query: "Latest developments in AI safety"
4. Verify research output and citations
5. Check export file generation

### Scenario 2: DOM Automation Workflow
1. Create workflow: DOM Action Node (navigate) → DOM Action Node (extract)
2. Configure selectors for a test website
3. Execute automation sequence
4. Verify extracted data accuracy

### Scenario 3: Data Processing Pipeline
1. Create workflow: Data Source → Filter → Transform → Aggregate → Export
2. Use mock data with user records
3. Apply filtering (age > 30)
4. Transform to markdown format
5. Aggregate by city
6. Export results
7. Verify each step's output

### Scenario 4: Conditional Workflow
1. Create workflow with Condition Node
2. Set up true/false branches
3. Execute with varying input data
4. Verify correct branch execution

### Scenario 5: Multi-user Collaboration
1. Open workflow in multiple browser tabs
2. Have users edit simultaneously
3. Test node locking mechanism
4. Verify real-time updates

## Automated Testing

### Backend Unit Tests
```bash
cd backend
source venv/bin/activate
python -m pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
cd backend
source venv/bin/activate
python test_comprehensive_workflow.py
```

### Performance Testing
```bash
cd backend
source venv/bin/activate
python -m pytest tests/test_performance_scaling.py -v
```

## Monitoring and Debugging

### Backend Logs
- Check console output during execution
- Enable debug logging: `LOG_LEVEL=DEBUG` in `.env`
- Monitor execution events and errors

### Frontend Debugging
- Open browser developer tools
- Check console for JavaScript errors
- Monitor network requests to backend API
- Verify WebSocket connections

### Performance Monitoring
- Monitor system resources during execution
- Check execution times for different workflow types
- Verify memory usage patterns

## Troubleshooting Guide

### Common Issues

#### Backend Won't Start
**Symptoms**: Port 8000 not accessible
**Solutions**:
- Check Python virtual environment activation
- Verify all dependencies installed: `pip list`
- Check for port conflicts: `lsof -i :8000`
- Review error logs in console

#### Frontend Build Fails
**Symptoms**: npm install or npm run dev fails
**Solutions**:
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version`
- Verify package.json integrity
- Check for network issues during installation

#### API Key Errors
**Symptoms**: Provider tests fail with authentication errors
**Solutions**:
- Verify API keys in `.env` file
- Check key format and validity
- Test keys directly with provider APIs
- Ensure keys have correct permissions

#### Playwright Browser Issues
**Symptoms**: DOM automation fails
**Solutions**:
- Reinstall browsers: `playwright install chromium`
- Check Chrome/Chromium installation
- Verify browser permissions
- Test with headless=false for debugging

#### Workflow Execution Fails
**Symptoms**: Nodes fail during execution
**Solutions**:
- Check node configuration validity
- Verify data flow between nodes
- Review execution logs for specific errors
- Test individual nodes in isolation

#### Database Connection Issues (Docker)
**Symptoms**: Backend can't connect to PostgreSQL
**Solutions**:
- Check Docker containers: `docker ps`
- Verify environment variables in docker-compose.yml
- Check container logs: `docker logs datakiln-backend`
- Ensure database is healthy: `docker logs datakiln-db`

### Performance Issues
- **Slow Execution**: Reduce workflow complexity or use Fast research mode
- **Memory Usage**: Monitor system resources, close unnecessary applications
- **Network Timeouts**: Check internet connection, increase timeout values

### Reset Procedures
```bash
# Reset backend environment
cd backend
rm -rf venv
source ../setup.sh  # Re-run setup

# Reset frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# Reset Docker environment
docker-compose down -v
docker-compose up --build
```

## Validation Checklist

### Setup Validation
- [ ] Python 3.8+ installed and virtual environment created
- [ ] Node.js 18+ installed
- [ ] Backend dependencies installed successfully
- [ ] Frontend dependencies installed successfully
- [ ] Playwright browsers installed
- [ ] API keys configured in `.env`
- [ ] Backend server starts on port 8000
- [ ] Frontend server starts on port 3000
- [ ] API documentation accessible at `/docs`

### Feature Validation
- [ ] Workflow editor loads and displays node palette
- [ ] Nodes can be dragged and dropped on canvas
- [ ] Node connections work properly
- [ ] Node configuration panels open and save
- [ ] AI providers connect and respond
- [ ] Workflows execute successfully
- [ ] Export functionality works
- [ ] Real-time collaboration features work
- [ ] Version management functions
- [ ] File persistence works

### Testing Validation
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Performance benchmarks met
- [ ] Error handling works correctly
- [ ] Logging provides useful information

## Support and Resources

### Documentation
- API Documentation: http://localhost:8000/docs (when running)
- Workflow System README: `frontend/WORKFLOW_SYSTEM_README.md`
- User Manual: `specs/guides/user-manual.md`

### Getting Help
1. Check this guide first for common issues
2. Review troubleshooting section above
3. Check backend/frontend logs for error details
4. Test individual components in isolation
5. Verify configuration against requirements

### Next Steps
After successful setup and testing:
1. Explore advanced workflow patterns
2. Test with real AI provider API keys
3. Experiment with custom node development
4. Set up production deployment
5. Configure monitoring and alerting

---

**DataKiln Testing Complete**: This guide ensures comprehensive validation of the DataKiln workflow system's functionality, performance, and reliability.