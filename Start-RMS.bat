@echo off
title Starting RMS Restaurant ERP...
echo ===================================================
echo     Starting RMS Restaurant ERP Desktop App...
echo ===================================================
echo.

:: 1. Start Server Backend in background
cd /d "%~dp0restaurant-erp\server"
start "RMS Server" /min npm start

:: 2. Wait 3 seconds for Server to initialize
timeout /t 3 /nobreak >nul

:: 3. Launch Electron Desktop Client
cd /d "%~dp0restaurant-erp\client"
npm run electron:dev

exit
