# Research Platform with Node-Based Query System

A comprehensive research and data analysis platform featuring a visual node-based query builder integrated into a workflow management system.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ and pip
- Git

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd research-platform
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the Application**

   **Terminal 1 - Backend:**
   ```bash
   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with Python
- **Main File**: `backend/main.py`
- **Research Agent**: `backend/research_agent.py`
- **API Endpoints**:
  - `GET /` - Health check
  - `POST /research` - Start research task
  - `POST /chat-logs` - Receive chat data

### Frontend (Next.js + React)
- **Framework**: Next.js 15 with React 19
- **UI Library**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Workflow Engine**: ReactFlow
- **Main Components**:
  - `WorkflowBuilder` - Main canvas for creating workflows
  - `TaskNode` - Individual workflow steps
  - `QueryNode` - Specialized node for visual query building
  - `QueryEditor` - Modal interface for building queries

## 🎯 Key Features

### Node-Based Query System
- **Visual Query Builder**: Drag-and-drop interface for building complex data queries
- **Multiple Node Types**:
  - DataSource: Connect to various data sources
  - Filter: Apply filtering conditions
  - Transform: Data transformation operations
  - Aggregate: Data aggregation functions
- **Workflow Integration**: Queries become steps in larger workflows
- **JSON Serialization**: Save and load query configurations

### Workflow Management
- **Visual Workflow Builder**: Create complex multi-step processes
- **Task Types**: Research, YouTube Analysis, Web Search, Data Analysis, Content Generation
- **Real-time Execution**: Monitor workflow progress
- **Persistence**: Save and load workflows

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Test Structure
- **Backend**: `backend/tests/` - Unit and integration tests
- **Frontend**: `frontend/src/**/*.test.tsx` - Component tests
- **Coverage**: Generate coverage reports with `npm run test:coverage`

## 📁 Project Structure

```
research-platform/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main API server
│   ├── research_agent.py   # Research functionality
│   ├── requirements.txt    # Python dependencies
│   └── tests/              # Backend tests
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── core/       # Core workflow components
│   │   │   └── ui/         # UI components
│   │   ├── stores/         # Zustand state management
│   │   └── types/          # TypeScript definitions
│   └── package.json        # Node dependencies
├── specs/                  # Project specifications
│   ├── node_based_query_system_plan.md
│   ├── vision.md
│   ├── future_plans.md
│   └── undefined_elements.md
└── README.md               # This file
```

## 🔧 Development

### Adding New Node Types
1. Create a new component in `frontend/src/components/core/`
2. Register it in `WorkflowBuilder.tsx` nodeTypes
3. Add to availableNodeTypes array
4. Update default parameters in `getDefaultParameters`

### API Integration
- Backend endpoints are automatically available at `/api/*`
- Use the provided API client utilities
- Check `/docs` for interactive API documentation

## 🚨 Known Issues & Solutions

### Path Issues with Special Characters
If you encounter build errors due to exclamation marks in paths:
1. Move the project to a path without special characters
2. Or use a different build tool configuration

### Port Conflicts
- Backend defaults to port 8000
- Frontend defaults to port 3000
- Modify ports in respective configuration files if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For questions or issues:
- Check the `specs/` folder for detailed documentation
- Review existing issues on GitHub
- Create a new issue with detailed information