#!/bin/bash

# DataKiln Test Runner
# This script runs all tests for the DataKiln project

set -e  # Exit on any error

echo "🧪 DataKiln Test Suite"
echo "======================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to run backend tests
test_backend() {
    print_info "Running backend tests..."

    # Check if virtual environment exists
    if [ ! -d "backend/venv" ]; then
        print_error "Backend virtual environment not found!"
        print_warning "Please run ./setup.sh first to set up the environment."
        return 1
    fi

    # Activate virtual environment
    source backend/venv/bin/activate

    # Change to backend directory
    cd backend

    # Run tests
    if python -m pytest -v --tb=short --cov=. --cov-report=html; then
        print_status "Backend tests passed"
        cd ..
        return 0
    else
        print_error "Backend tests failed"
        cd ..
        return 1
    fi
}

# Function to run frontend tests
test_frontend() {
    print_info "Running frontend tests..."

    # Check if node_modules exists
    if [ ! -d "frontend/node_modules" ]; then
        print_error "Frontend dependencies not installed!"
        print_warning "Please run ./setup.sh first to install dependencies."
        return 1
    fi

    # Change to frontend directory
    cd frontend

    # Run tests
    if npm test -- --run; then
        print_status "Frontend tests passed"
        cd ..
        return 0
    else
        print_error "Frontend tests failed"
        cd ..
        return 1
    fi
}

# Function to run integration tests
test_integration() {
    print_info "Running integration tests..."

    # Check if backend is running
    if ! curl -s http://localhost:8000/health > /dev/null; then
        print_warning "Backend service not running. Starting services..."

        # Start services in background
        ./start.sh &
        SERVICES_PID=$!

        # Wait for services to start
        sleep 5

        # Check if services are running
        if ! curl -s http://localhost:8000/health > /dev/null; then
            print_error "Could not start services for integration tests"
            return 1
        fi
    fi

    # Run integration tests
    if [ -f "tests/integration_test.py" ]; then
        cd backend
        source venv/bin/activate
        python -m pytest tests/integration_test.py -v
        cd ..

        print_status "Integration tests passed"
        return 0
    else
        print_warning "No integration tests found, skipping"
        return 0
    fi
}

# Function to run linting
run_linting() {
    print_info "Running code quality checks..."

    # Backend linting
    if command -v flake8 &> /dev/null; then
        print_info "Running Python linting..."
        if flake8 backend/ --count --select=E9,F63,F7,F82 --show-source --statistics; then
            print_status "Python linting passed"
        else
            print_error "Python linting failed"
            return 1
        fi
    fi

    # Frontend linting
    if [ -d "frontend/node_modules" ]; then
        print_info "Running frontend linting..."
        cd frontend
        if npm run lint; then
            print_status "Frontend linting passed"
            cd ..
        else
            print_error "Frontend linting failed"
            cd ..
            return 1
        fi
    fi
}

# Function to check test coverage
check_coverage() {
    print_info "Checking test coverage..."

    if [ -d "backend/htmlcov" ]; then
        print_info "Coverage report generated in backend/htmlcov/index.html"
        print_status "Coverage check completed"
    else
        print_warning "No coverage report found"
    fi
}

# Main test execution
main() {
    echo "Starting DataKiln test suite..."
    echo

    # Parse command line arguments
    RUN_BACKEND=true
    RUN_FRONTEND=true
    RUN_INTEGRATION=true
    RUN_LINTING=true

    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-only)
                RUN_FRONTEND=false
                RUN_INTEGRATION=false
                RUN_LINTING=false
                shift
                ;;
            --frontend-only)
                RUN_BACKEND=false
                RUN_INTEGRATION=false
                RUN_LINTING=false
                shift
                ;;
            --integration-only)
                RUN_BACKEND=false
                RUN_FRONTEND=false
                RUN_LINTING=false
                shift
                ;;
            --skip-linting)
                RUN_LINTING=false
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --backend-only     Run only backend tests"
                echo "  --frontend-only    Run only frontend tests"
                echo "  --integration-only Run only integration tests"
                echo "  --skip-linting     Skip linting checks"
                echo "  --help             Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Track test results
    TESTS_PASSED=0
    TESTS_RUN=0

    # Run tests based on flags
    if [ "$RUN_BACKEND" = true ]; then
        ((TESTS_RUN++))
        if test_backend; then
            ((TESTS_PASSED++))
        fi
    fi

    if [ "$RUN_FRONTEND" = true ]; then
        ((TESTS_RUN++))
        if test_frontend; then
            ((TESTS_PASSED++))
        fi
    fi

    if [ "$RUN_INTEGRATION" = true ]; then
        ((TESTS_RUN++))
        if test_integration; then
            ((TESTS_PASSED++))
        fi
    fi

    if [ "$RUN_LINTING" = true ]; then
        if run_linting; then
            print_status "Code quality checks passed"
        fi
    fi

    # Print summary
    echo
    echo "📊 Test Summary"
    echo "==============="
    echo "Tests run: $TESTS_RUN"
    echo "Tests passed: $TESTS_PASSED"

    if [ $TESTS_PASSED -eq $TESTS_RUN ] && [ $TESTS_RUN -gt 0 ]; then
        print_status "All tests passed! 🎉"
        exit 0
    else
        print_error "Some tests failed"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"