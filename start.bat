@echo off
title S-TextPaste Dev Server
chcp 65001 >nul 2>&1

echo ========================================
echo   S-TextPaste Local Dev Server
echo ========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

:: Install frontend deps if needed
if not exist "frontend\node_modules" (
    echo [1] Installing frontend dependencies...
    cd frontend
    call npm install --silent
    cd ..
)

:: Start backend API
echo [1] Starting backend API on http://localhost:8787
start "s-tp-backend" cmd /c "node worker\server.js"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start backend
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul

:: Start frontend dev server
echo [2] Starting frontend on http://localhost:3000
start "s-tp-frontend" cmd /c "cd /d frontend && npx vite --port 3000 --host"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Servers started
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8787
echo ========================================
echo.
echo Press any key to stop all servers...
pause >nul

:: Cleanup
echo Stopping servers...
taskkill /fi "WINDOWTITLE eq s-tp-backend" >nul 2>&1
taskkill /fi "WINDOWTITLE eq s-tp-frontend" >nul 2>&1
echo Done.
timeout /t 2 /nobreak >nul
