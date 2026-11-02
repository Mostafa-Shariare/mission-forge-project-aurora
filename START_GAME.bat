@echo off
title MISSION FORGE - PROJECT AURORA
echo ========================================================
echo   STARTING MISSION FORGE - PROJECT AURORA SERVER
echo ========================================================
echo Server starting at http://localhost:8080/ ...
cd /d "%~dp0"
start "" "http://localhost:8080/"
node server.js
pause
