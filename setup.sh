#!/bin/bash

# DataKiln Setup Script
# This script sets up the complete DataKiln environment with a single command

set -e  # Exit on any error

echo "🚀 DataKiln Setup Starting..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if Python 3.8+ is installed
check_python() {
    echo "Checking Python installation..."
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3.8+ is required but not installed."
        exit 1
    fi

    PYTHON_VERSION=$(python3 --version | awk '{print $2}')
    echo "Python version: $PYTHON_VERSION"
    print_status "Python check passed"
}

# Check if Node.js 18+ is installed
check_nodejs() {
    echo "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js 18+ is required but not installed."
        exit 1
    fi

    NODE_VERSION=$(node --version | sed 's/v//')
    echo "Node.js version: $NODE_VERSION"
    print_status "Node.js check passed"
}

# Setup backend
setup_backend() {
    echo "Setting up backend..."
    cd backend

    # Create virtual environment
    if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
    fi

    # Activate virtual environment
    source venv/bin/activate

    # Upgrade pip
    pip install --upgrade pip

    # Install dependencies
    echo "Installing Python dependencies..."
    pip install -r requirements.txt

    # Install Playwright browsers
    echo "Installing Playwright browsers..."
    playwright install chromium

    # Go back to root directory
    cd ..

    print_status "Backend setup completed"
}

# Setup frontend
setup_frontend() {
    echo "Setting up frontend..."
    cd frontend

    # Install npm dependencies
    echo "Installing Node.js dependencies..."
    npm install

    # Go back to root directory
    cd ..

    print_status "Frontend setup completed"
}

# Create environment file
create_env_file() {
    echo "Creating environment configuration..."
    if [ ! -f ".env" ]; then
        cat > .env << EOL
# DataKiln Environment Configuration
# Copy this file and modify as needed

# Backend Configuration
BACKEND_PORT=8000
DATABASE_URL=sqlite:///datakiln.db
LOG_LEVEL=INFO

# Provider API Keys (Add your keys here)
# GEMINI_API_KEY=your_gemini_api_key_here
# PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Frontend Configuration
FRONTEND_PORT=3000
VITE_API_BASE_URL=http://localhost:8000

# Browser Configuration
BROWSER_HEADLESS=false
BROWSER_TIMEOUT=30000

# Development
DEBUG=true
EOL
        print_status "Environment file created"
    else
        print_warning "Environment file already exists, skipping creation"
    fi
}

# Start services
start_services() {
    echo "Starting services..."

    # Start backend in background
    echo "Starting backend server..."
    cd backend
    source venv/bin/activate
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    cd ..

    # Start frontend in background
    echo "Starting frontend server..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    # Wait a moment for services to start
    sleep 3

    print_status "Services started!"
    echo ""
    echo "📱 Frontend: http://localhost:3000"
    echo "🔌 Backend API: http://localhost:8000"
    echo "📚 API Documentation: http://localhost:8000/docs"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo ""

    # Wait for user interrupt
    trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; print_status "Services stopped"; exit 0' INT
    wait
}

# Main setup flow
main() {
    echo "Welcome to DataKiln! 🌟"
    echo ""

    # Check prerequisites
    check_python
    check_nodejs

    echo ""

    # Setup components
    create_env_file
    setup_backend
    setup_frontend

    echo ""
    print_status "Setup completed successfully!"
    echo ""

    # Ask if user wants to start services
    read -p "Would you like to start the services now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_services
    else
        echo "You can start the services manually:"
        echo "  Backend: cd backend && source venv/bin/activate && uvicorn main:app --reload"
        echo "  Frontend: cd frontend && npm run dev"
    fi
}

# Run main function
main "$@"