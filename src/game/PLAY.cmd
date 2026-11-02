@echo off
cd /d "%~dp0"
title ODYSSEY - Mission Control
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js, then open PLAY.cmd again.
  pause
  exit /b 1
)
node launch.mjs
pause
