@echo off
rem One-click launcher for Windows: starts the dashboard and opens it in the browser.
cd /d "%~dp0\.."
where node >nul 2>nul || (echo Node.js 22.5+ is required: https://nodejs.org & pause & exit /b 1)
start "" http://127.0.0.1:3000
node src\dashboard-server.js
pause
