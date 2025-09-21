@echo off
REM DataKiln Setup Script for Windows
REM This script sets up the complete DataKiln environment with a single command

echo 🚀 DataKiln Setup Starting...
echo ================================
echo.

REM Check if Python is installed
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 3.8+ is required but not installed.
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

python --version
echo ✅ Python check passed
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 18+ is required but not installed.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

node --version
echo ✅ Node.js check passed
echo.

REM Setup backend
echo Setting up backend...
cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment and install dependencies
echo Installing Python dependencies...
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

REM Install Playwright browsers
echo Installing Playwright browsers...
playwright install --with-deps chromium

REM Go back to root directory
cd ..
echo ✅ Backend setup completed
echo.

REM Setup frontend
echo Setting up frontend...
cd frontend

REM Install npm dependencies
echo Installing Node.js dependencies...
npm install

REM Go back to root directory
cd ..
echo ✅ Frontend setup completed
echo.

REM Create environment file
echo Creating environment configuration...
if not exist ".env" (
    (
        echo # DataKiln Environment Configuration
        echo # Copy this file and modify as needed
        echo.
        echo # Backend Configuration
        echo BACKEND_PORT=8000
        echo DATABASE_URL=sqlite:///datakiln.db
        echo LOG_LEVEL=INFO
        echo.
        echo # Provider API Keys ^(Add your keys here^)
        echo # GEMINI_API_KEY=your_gemini_api_key_here
        echo # PERPLEXITY_API_KEY=your_perplexity_api_key_here
        echo.
        echo # Frontend Configuration
        echo FRONTEND_PORT=3000
        echo VITE_API_BASE_URL=http://localhost:8000
        echo.
        echo # Browser Configuration
        echo BROWSER_HEADLESS=false
        echo BROWSER_TIMEOUT=30000
        echo.
        echo # Development
        echo DEBUG=true
    ) > .env
    echo ✅ Environment file created
) else (
    echo ⚠️  Environment file already exists, skipping creation
)
echo.

REM Ask if user wants to start services
set /p "start_services=Would you like to start the services now? (y/N): "
if /i "%start_services%"=="y" goto :start_services
if /i "%start_services%"=="yes" goto :start_services

echo.
echo You can start the services manually:
echo   Backend: cd backend ^&^& venv\Scripts\activate ^&^& uvicorn main:app --reload
echo   Frontend: cd frontend ^&^& npm run dev
goto :end

:start_services
echo.
echo Starting services...
echo.

REM Start backend in background
echo Starting backend server...
cd backend
start /B cmd /c "call venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
cd ..

REM Start frontend in background
echo Starting frontend server...
cd frontend
start /B cmd /c "npm run dev"
cd ..

REM Wait a moment for services to start
timeout /t 3 /nobreak >nul

echo ✅ Services started!
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔌 Backend API: http://localhost:8000
echo 📚 API Documentation: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop all services
echo.

REM Keep window open
pause >nul
goto :end

:end
echo.
echo ✅ Setup completed successfully!
echo.
pause