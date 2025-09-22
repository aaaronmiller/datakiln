# Developer Setup Guide

## Prerequisites

### System Requirements
- **Operating System**: macOS 12+, Windows 10+, Linux (Ubuntu 18.04+)
- **Node.js**: Version 18+ (LTS recommended)
- **Python**: Version 3.9+ (3.11+ recommended)
- **Git**: Version 2.30+
- **Docker**: Version 20.10+ (optional, for containerized development)
- **VS Code**: Latest version with devcontainer support

### Hardware Requirements
- **RAM**: 16GB minimum, 32GB recommended
- **Storage**: 10GB free space for development environment
- **CPU**: Multi-core processor (4+ cores recommended)

## Development Environment Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/datakiln.git
cd datakiln
```

### 2. Backend Setup (Python/FastAPI)

#### Install Python Dependencies
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Install development dependencies
pip install -r backend/requirements-dev.txt
```

#### Environment Configuration
```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit .env with your API keys
nano backend/.env
```

Required environment variables:
```env
# AI Provider API Keys
GEMINI_API_KEY=your_gemini_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key

# Database Configuration
DATABASE_URL=sqlite:///./context_portal/context.db

# Application Settings
DEBUG=True
SECRET_KEY=your_secret_key_here

# Obsidian Integration
OBSIDIAN_VAULT_PATH=/path/to/your/vault

# Chrome Extension
CHROME_EXTENSION_ID=your_extension_id
```

#### Database Setup
```bash
# Initialize database
cd backend
alembic upgrade head

# Run database migrations
alembic revision --autogenerate -m "Initial setup"
```

### 3. Frontend Setup (Next.js/React)

#### Install Node Dependencies
```bash
# Install dependencies
cd frontend
pnpm install  # or npm install or yarn install

# Install additional dev dependencies if needed
pnpm add -D @types/node typescript
```

#### Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Configure API endpoints
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" >> .env.local
```

### 4. Chrome Extension Setup

#### Install Extension Dependencies
```bash
cd chrome-extension
npm install
```

#### Build Extension
```bash
npm run build
```

#### Load in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension/dist` folder

### 5. Development Scripts Setup

#### Install Script Dependencies
```bash
# Install global dependencies if needed
pip install playwright
playwright install

# Install Node.js dependencies for scripts
cd scripts
npm install
```

## Running the Application

### Development Mode

#### Start Backend
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Start Frontend
```bash
cd frontend
pnpm dev  # or npm run dev or yarn dev
```

#### Start Development Scripts
```bash
# YouTube transcript processing
python scripts/youtube_transcript.py

# Context portal integration
python scripts/context_portal_integration.py start_task "Development Setup"

# Todo integration
python scripts/todo_integration.py sync_todos
```

### Production Mode

#### Backend Deployment
```bash
# Using Docker
docker build -t datakiln-backend .
docker run -p 8000:8000 datakiln-backend

# Or using gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

#### Frontend Deployment
```bash
cd frontend
pnpm build
pnpm start  # or use nginx to serve the build folder
```

## Development Workflow

### Code Quality Tools

#### Linting and Formatting
```bash
# Backend (Python)
black backend/
flake8 backend/
mypy backend/

# Frontend (TypeScript/JavaScript)
cd frontend
pnpm lint
pnpm format
```

#### Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
pnpm test

# Integration tests
cd backend
pytest tests/test_integration.py
```

### Git Workflow

#### Branch Naming Convention
- `feature/description-of-feature`
- `bugfix/issue-description`
- `hotfix/critical-fix`
- `docs/update-documentation`

#### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Code Review Process
1. Create pull request with clear description
2. Ensure CI/CD checks pass
3. Request review from team members
4. Address review feedback
5. Merge after approval

## Debugging and Troubleshooting

### Common Issues

#### Backend Issues
```bash
# Check Python version
python --version

# Verify virtual environment
which python
# Should point to venv/bin/python

# Check dependencies
pip list | grep fastapi

# View logs
tail -f backend/logs/app.log
```

#### Frontend Issues
```bash
# Check Node version
node --version
npm --version

# Clear cache
rm -rf node_modules/.cache
pnpm install

# Check build
pnpm build
```

#### Database Issues
```bash
# Check database file
ls -la context_portal/context.db

# Reset database (CAUTION: destroys data)
rm context_portal/context.db
alembic upgrade head
```

### Debug Mode Configuration

#### Backend Debug Settings
```python
# In main.py or config
import logging
logging.basicConfig(level=logging.DEBUG)

# Enable SQL query logging
from sqlalchemy import create_engine
engine = create_engine(DATABASE_URL, echo=True)
```

#### Frontend Debug Settings
```javascript
// In development
localStorage.setItem('debug', 'true');

// Enable React DevTools
// Install from Chrome Web Store
```

### Performance Monitoring

#### Backend Monitoring
```bash
# Memory usage
ps aux | grep python

# API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/health

# Database connections
python -c "import sqlite3; conn = sqlite3.connect('context_portal/context.db'); print('DB OK')"
```

#### Frontend Monitoring
- Use Chrome DevTools Performance tab
- Monitor React DevTools Profiler
- Check Network tab for slow requests
- Use Lighthouse for performance audits

## Testing Strategy

### Unit Tests
```bash
# Run specific test file
pytest backend/tests/test_nodes.py -v

# Run with coverage
pytest --cov=backend --cov-report=html
```

### Integration Tests
```bash
# Test full workflow
pytest backend/tests/test_integration.py

# Test API endpoints
pytest backend/tests/test_api.py
```

### End-to-End Tests
```bash
# Using Playwright
cd frontend
pnpm test:e2e

# Manual testing checklist
# - Create workflow
# - Execute research query
# - View results
# - Export data
```

## Deployment

### Local Deployment
```bash
# Full system startup script
./scripts/start-dev.sh

# Check all services
curl http://localhost:8000/api/health
curl http://localhost:3000
```

### Docker Deployment
```bash
# Build all services
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Monitoring tools set up
- [ ] Backup strategy implemented
- [ ] Documentation updated

## Contributing

### Development Standards
- Follow PEP 8 for Python code
- Use ESLint/Prettier for JavaScript/TypeScript
- Write comprehensive tests for new features
- Update documentation for API changes
- Use conventional commits

### Documentation Updates
- Update this guide for setup changes
- Document new API endpoints
- Maintain changelog for releases
- Update troubleshooting section for common issues

### Code Review Guidelines
- Review for security vulnerabilities
- Check test coverage
- Verify documentation updates
- Ensure backward compatibility
- Test performance impact

## Support and Resources

### Getting Help
- Check existing issues on GitHub
- Review documentation in `specs/` folder
- Join development discussions
- Contact maintainers for urgent issues

### Useful Commands
```bash
# Quick health check
curl http://localhost:8000/api/health

# View recent logs
tail -f backend/logs/app.log

# Reset development environment
rm -rf venv node_modules && ./setup.sh

# Update dependencies
pip install -r backend/requirements.txt --upgrade
cd frontend && pnpm update
```

This setup guide is maintained alongside the codebase. Please update it when development processes change.