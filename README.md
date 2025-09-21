# DataKiln - Advanced Workflow Automation Platform

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)

DataKiln is a comprehensive workflow automation platform that combines AI-powered research, DOM automation, and real-time collaboration features. It enables users to create sophisticated workflows that can interact with web applications, process AI-generated content, and collaborate in real-time.

## 🚀 Key Features

### 🤖 AI-Powered Research Workflows
- **Multi-Provider Integration**: Gemini (Deep Research + Canvas) and Perplexity
- **Intelligent Content Processing**: Citation extraction, markdown transformation, and data merging
- **Template-Based Prompts**: Reusable prompt templates with variable substitution

### 🌐 DOM Automation Engine
- **Playwright Integration**: Browser-based DOM interactions and content extraction
- **Smart Selectors**: Dynamic selector resolution with provider-specific mappings
- **Contenteditable Operations**: Advanced text manipulation in web applications

### 👥 Real-Time Collaboration
- **WebSocket-Based Collaboration**: Live multi-user editing with presence indicators
- **Node Locking**: Prevent conflicts during simultaneous editing
- **Cursor Tracking**: Real-time cursor position sharing

### 📝 Version Management
- **Git-Like Versioning**: Complete version control with branching and merging
- **Rollback Capabilities**: Restore previous workflow versions
- **Version Comparison**: Visual diff between workflow versions

### 🔄 Advanced Execution Engine
- **State Machine Architecture**: Robust workflow execution with error handling
- **Retry Logic**: Configurable retry mechanisms with exponential backoff
- **Artifact Persistence**: Automatic saving of workflow outputs

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [License](#-license)

## 🏃 Quick Start

### Prerequisites

- **Python 3.8+** for backend services
- **Node.js 18+** for frontend development
- **Chrome/Chromium** for DOM automation (Playwright requirement)

### One-Command Installation

```bash
# Clone the repository
git clone https://github.com/your-username/datakiln.git
cd datakiln

# Install and start all services
./setup.sh

# Or on Windows
./setup.bat
```

This will automatically:
- Install Python backend dependencies
- Install Node.js frontend dependencies
- Set up the database
- Start both backend and frontend servers

### Manual Installation

#### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 🏗️ Architecture

DataKiln follows a modular architecture with clear separation of concerns:

### Backend Components

```
backend/
├── nodes/           # Node type implementations
├── providers/       # AI provider integrations
├── selectors.py     # DOM selector registry
├── executor.py      # Workflow execution engine
├── version_manager.py # Version control system
└── main.py         # FastAPI application
```

### Node Types

1. **BaseNode**: Foundation class with common node properties
2. **DomActionNode**: DOM interactions (click, fill, wait, copy)
3. **PromptNode**: Template-based AI prompts
4. **ProviderNode**: AI provider abstraction (Gemini, Perplexity)
5. **TransformNode**: Data transformation operations
6. **ExportNode**: Output formatting and file generation
7. **ConditionNode**: Branching logic with conditional expressions

### Execution Flow

The workflow execution follows a state machine pattern:

```
Idle → LoadWorkflow → ResolveNode → ResolveSelectors → ExecuteNode
    ↓
WaitForDom → PerformAction → CaptureOutput → NextNode
    ↓
Complete / Retry / Error
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Backend Configuration
BACKEND_PORT=8000
DATABASE_URL=sqlite:///datakiln.db
LOG_LEVEL=INFO

# Provider API Keys
GEMINI_API_KEY=your_gemini_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key

# Frontend Configuration
FRONTEND_PORT=3000
VITE_API_BASE_URL=http://localhost:8000

# Browser Configuration
BROWSER_HEADLESS=false
BROWSER_TIMEOUT=30000
```

### Provider Setup

#### Gemini Setup
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file as `GEMINI_API_KEY`

#### Perplexity Setup
1. Go to [Perplexity API](https://www.perplexity.ai/settings/api)
2. Create a new API key
3. Add it to your `.env` file as `PERPLEXITY_API_KEY`

## 🔐 Authentication Note

**Important**: The current DOM-based implementation requires users to login to LLM services (Gemini, Perplexity) via their browsers to ensure cookies and authentication are functional. This is by design to maintain session continuity and proper API access.

## 📖 Usage

### Creating a Workflow

1. **Start the Application**
   ```bash
   ./start.sh
   ```

2. **Access the Interface**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

3. **Create Nodes**
   - Drag and drop node types from the palette
   - Configure node properties (selectors, prompts, actions)
   - Connect nodes to create execution flow

4. **Execute Workflows**
   - Click the "Execute" button
   - Monitor progress in real-time
   - View results in the output panel

### API Usage Examples

#### Execute a Workflow

```bash
curl -X POST "http://localhost:8000/workflow/execute" \
     -H "Content-Type: application/json" \
     -d '{
       "nodes": [...],
       "connections": [...]
     }'
```

#### Create a Version

```bash
curl -X POST "http://localhost:8000/versions/create" \
     -H "Content-Type: application/json" \
     -d '{
       "entity_type": "workflow",
       "entity_id": "workflow-123",
       "data": {...},
       "metadata": {"description": "Initial version"}
     }'
```

## 🔌 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workflow/execute` | Execute a workflow graph |
| POST | `/workflow/validate` | Validate workflow structure |
| GET | `/selectors/registry` | Get available selectors |
| POST | `/providers/test` | Test provider connections |

### Version Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/versions/create` | Create a new version |
| GET | `/versions/{type}/{id}` | Get version history |
| POST | `/versions/rollback` | Rollback to version |
| POST | `/versions/branch` | Create a branch |
| POST | `/versions/merge` | Merge versions |

### Real-Time Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| WS | `/ws/collaborate` | WebSocket collaboration |
| GET | `/presence/users` | Get active users |
| POST | `/nodes/lock` | Lock a node for editing |

## 🧪 Testing

Run the test suite:

```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test

# Integration tests
./test.sh
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Style

- **Backend**: Follow PEP 8 with type hints
- **Frontend**: Use ESLint and Prettier configuration
- **Commits**: Follow [Conventional Commits](https://conventionalcommits.org/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Playwright** for browser automation
- **FastAPI** for the backend framework
- **React Flow** for workflow visualization
- **Google Gemini** and **Perplexity** for AI capabilities

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/datakiln/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/datakiln/discussions)
- **Email**: support@datakiln.dev

---

**DataKiln** - Transforming the way you work with AI and automation.