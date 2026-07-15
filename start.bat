@echo off
title S-TextPaste 本地开发服务器
chcp 65001 >nul

echo ╔══════════════════════════════════════╗
echo ║     S-TextPaste 本地开发启动脚本     ║
╚══════════════════════════════════════╝
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装：https://nodejs.org
    pause
    exit /b 1
)

:: 检查后端端口
netstat -ano | findstr ":8787 " >nul
if %errorlevel% equ 0 (
    echo [警告] 端口 8787 已被占用，请先关闭占用程序
)

:: 检查前端端口
netstat -ano | findstr ":3000 " >nul
if %errorlevel% equ 0 (
    echo [警告] 端口 3000 已被占用，请先关闭占用程序
)

:: 安装前端依赖（如需要）
if not exist "frontend\node_modules" (
    echo [1/3] 安装前端依赖...
    cd frontend && npm install --silent && cd ..
)

:: 启动后端 API
echo [1/3] 启动后端 API (http://localhost:8787)
start "S-TextPaste-Backend" cmd /c "node worker\server.js"
timeout /t 2 /nobreak >nul

:: 启动前端开发服务器
echo [2/3] 启动前端开发服务器 (http://localhost:3000)
start "S-TextPaste-Frontend" cmd /c "cd frontend && npx vite --port 3000"
timeout /t 3 /nobreak >nul

:: 验证
echo [3/3] 验证服务状态...
curl -s -o nul -w "  后端 API: %%{http_code}\n" http://localhost:8787/health
curl -s -o nul -w "  前端页面: %%{http_code}\n" http://localhost:3000

echo.
echo ╔══════════════════════════════════════╗
echo ║  启动完成！                           ║
║                                      ║
echo ║  前端: http://localhost:3000           ║
echo ║  后端: http://localhost:8787           ║
║                                      ║
echo ║  按任意键关闭所有服务...               ║
╚══════════════════════════════════════╝
echo.

pause >nul

:: 关闭启动的进程
echo 正在关闭服务...
taskkill /f /fi "WINDOWTITLE eq S-TextPaste-Backend" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq S-TextPaste-Frontend" >nul 2>&1
echo 服务已关闭。
timeout /t 2 /nobreak >nul
