@echo off
REM Office Werkstatt – start the local server and open the browser (no internet needed)
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js 18+ wird benoetigt / Node.js 18+ gerekli: https://nodejs.org & pause & exit /b 1)
start "" http://localhost:8080
node server\server.js
