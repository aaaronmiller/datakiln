# Contributing to DataKiln

Thank you for your interest in contributing to DataKiln! This document provides guidelines and information for contributing to our workflow automation platform.

## 🌟 How to Contribute

We welcome contributions in many forms:
- 🐛 Bug reports and feature requests
- 💻 Code contributions
- 📝 Documentation improvements
- 🎨 UI/UX improvements
- 🧪 Test coverage
- 🌐 Translations

## 🚀 Quick Start for Developers

### Prerequisites
- **Python 3.8+** for backend development
- **Node.js 18+** for frontend development
- **Git** for version control

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/datakiln.git
   cd datakiln
   ```

2. **Set up the development environment**
   ```bash
   # Install all dependencies
   ./setup.sh

   # Or on Windows
   ./setup.bat
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

4. **Make your changes**
   - Follow our coding standards
   - Add tests for new functionality
   - Update documentation as needed

5. **Run tests**
   ```bash
   # Backend tests
   cd backend && python -m pytest

   # Frontend tests
   cd frontend && npm test
   ```

6. **Submit your contribution**
   - Commit your changes with a descriptive message
   - Push to your fork
   - Create a Pull Request

## 📋 Development Guidelines

### Code Style

#### Backend (Python)
- Follow [PEP 8](https://pep8.org/) guidelines
- Use type hints for all function signatures
- Maximum line length: 88 characters (Black formatting)
- Use `snake_case` for variables and functions
- Use `PascalCase` for classes

```python
# Good example
from typing import Optional, List
from dataclasses import dataclass

@dataclass
class WorkflowNode:
    """A node in the workflow graph."""

    id: str
    name: str
    node_type: str
    inputs: List[str] = None
    outputs: List[str] = None

    def execute(self) -> Optional[dict]:
        """Execute the node logic."""
        pass
```

#### Frontend (TypeScript/React)
- Use ESLint and Prettier configuration
- Follow React best practices
- Use functional components with hooks
- Proper TypeScript typing

```typescript
// Good example
interface NodeProps {
  id: string;
  data: NodeData;
  selected: boolean;
}

const WorkflowNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  return (
    <div className={clsx('node', { 'selected': selected })}>
      <h3>{data.label}</h3>
    </div>
  );
};
```

### Testing

#### Backend Tests
- Write unit tests for all new functionality
- Use `pytest` with async support
- Mock external dependencies
- Test error conditions

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_workflow_execution():
    """Test workflow execution with mocked dependencies."""
    workflow = Workflow(nodes=[...])
    result = await workflow.execute()

    assert result['status'] == 'completed'
```

#### Frontend Tests
- Use Vitest for unit tests
- Test React components with React Testing Library
- Mock API calls and external dependencies

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('WorkflowNode', () => {
  it('renders node with correct label', () => {
    render(<WorkflowNode id="1" data={{ label: 'Test' }} selected={false} />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

### Commit Conventions

We follow [Conventional Commits](https://conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

#### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **style**: Code style changes
- **refactor**: Code refactoring
- **test**: Test additions/changes
- **chore**: Maintenance tasks

#### Examples
```bash
feat(workflows): add support for conditional nodes
fix(api): resolve timeout issue in provider calls
docs: update installation instructions
test: add unit tests for workflow executor
```

## 🐛 Reporting Issues

### Bug Reports
When reporting bugs, please include:
- **Description**: Clear description of the issue
- **Steps to Reproduce**: Step-by-step instructions
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, Python/Node version, browser
- **Screenshots**: If applicable

### Feature Requests
For feature requests:
- **Use Case**: Describe the problem you're solving
- **Proposed Solution**: How you think it should work
- **Alternatives Considered**: Other approaches you've considered
- **Additional Context**: Screenshots, examples, etc.

## 📝 Documentation

### Updating Documentation
- Update README.md for user-facing changes
- Update API documentation for backend changes
- Add code comments for complex logic
- Update type hints and docstrings

### Building Documentation
```bash
# Install documentation dependencies
pip install mkdocs mkdocs-material

# Serve documentation locally
mkdocs serve
```

## 🔧 Code Review Process

1. **Automated Checks**: All PRs run automated tests and linting
2. **Review**: At least one maintainer reviews the code
3. **Testing**: Ensure all tests pass
4. **Merge**: Approved PRs are merged by maintainers

### Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes without discussion
- [ ] Commits follow conventional commit format

## 🏗️ Architecture Guidelines

### Backend Architecture
- Keep business logic in separate modules
- Use dependency injection for testability
- Handle errors gracefully with proper logging
- Use async/await for I/O operations

### Frontend Architecture
- Use custom hooks for shared logic
- Keep components small and focused
- Use context/state management appropriately
- Follow React performance best practices

## 🚀 Performance Considerations

### Backend
- Use connection pooling for databases
- Implement caching where appropriate
- Monitor database query performance
- Use pagination for large datasets

### Frontend
- Implement lazy loading
- Use React.memo for expensive components
- Optimize re-renders with useMemo/useCallback
- Monitor bundle size

## 🔒 Security Considerations

- Validate all user inputs
- Use parameterized queries
- Implement rate limiting
- Keep dependencies updated
- Use HTTPS for all communications

## 📞 Getting Help

- **Issues**: [GitHub Issues](https://github.com/your-username/datakiln/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/datakiln/discussions)
- **Email**: contributors@datakiln.dev

## 🙏 Acknowledgments

Thank you for contributing to DataKiln! Your efforts help make workflow automation more accessible and powerful for everyone.

---

**Happy coding! 🎉**