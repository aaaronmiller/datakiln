#!/bin/bash

# DataKiln Start Script
# This script starts all DataKiln services

set -e  # Exit on any error

echo "🚀 Starting DataKiln Services..."
echo "==============================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Check if environment file exists
if [ ! -f ".env" ]; then
    print_error "Environment file (.env) not found!"
    print_warning "Please run ./setup.sh first to create the environment configuration."
    exit 1
fi

# Check if backend virtual environment exists
if [ ! -d "backend/venv" ]; then
    print_error "Backend virtual environment not found!"
    print_warning "Please run ./setup.sh first to set up the environment."
    exit 1
fi

# Check if frontend node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    print_error "Frontend dependencies not installed!"
    print_warning "Please run ./setup.sh first to install dependencies."
    exit 1
fi

echo "Starting services..."

# Start backend server
echo "📡 Starting backend server..."
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend server
echo "🌐 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 3

print_status "All services started successfully!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    print_status "Services stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup INT TERM

# Wait for processes
wait