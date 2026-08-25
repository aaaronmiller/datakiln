#!/bin/bash

# Quickstart script for DataKiln development

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔥 Starting DataKiln Quickstart...${NC}"

# Check for dependencies
echo -e "${BLUE}➜ Checking dependencies...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed.${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed.${NC}"
    exit 1
fi

# Setup Backend
echo -e "${BLUE}➜ Setting up Backend...${NC}"
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
if [ -f "requirements.txt" ]; then
    echo "Installing backend dependencies..."
    pip install -r requirements.txt > /dev/null 2>&1
    if [ $? -ne 0 ]; then
         echo -e "${RED}Failed to install backend dependencies.${NC}"
         exit 1
    fi
fi

# Start Backend
echo -e "${GREEN}➜ Starting Backend Server (Port 8000)...${NC}"
# Kill existing uvicorn if any
pkill -f "uvicorn app.main:app" || true
nohup uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

cd ..

# Setup Frontend
echo -e "${BLUE}➜ Setting up Frontend...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install > /dev/null 2>&1
    if [ $? -ne 0 ]; then
         echo -e "${RED}Failed to install frontend dependencies.${NC}"
         exit 1
    fi
fi

# Start Frontend
echo -e "${GREEN}➜ Starting Frontend Server (Port 3000)...${NC}"
# Kill existing vite if any (looking for "npm run dev")
# Note: process name might vary, pkill vite is safer if simple
pkill -f "vite" || true
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

cd ..

# Waiting for services
echo -e "${BLUE}➜ Waiting for services to initialize...${NC}"
sleep 5

# Open Browser
echo -e "${GREEN}➜ Opening DataKiln in Browser...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000 
    open http://127.0.0.1:8000/docs
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3000
    xdg-open http://127.0.0.1:8000/docs
fi

echo -e "${GREEN}✅ DataKiln is running!${NC}"
echo -e "${BLUE}Backend logs: backend/backend.log${NC}"
echo -e "${BLUE}Frontend logs: frontend/frontend.log${NC}"
echo -e "${RED}Press Ctrl+C to stop servers and exit.${NC}"

# Trap Ctrl+C to kill background processes
cleanup() {
    echo -e "\n${RED}Stopping servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# Keep script running
wait $BACKEND_PID $FRONTEND_PID
