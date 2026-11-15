@REM  this file helps run the dev server automatically and opens the browser to the correct URL. It is intended to be run from the root of the project directory.
@echo off
title Dev Server

cd /d "%~dp0"

echo Scheduling Chrome to open...
start "" /b powershell -NoProfile -Command "Start-Sleep -Milliseconds 1500; Start-Process 'chrome' 'http://localhost:3000'"

echo Starting development server...
call npm run dev

echo Development server has stopped.
pause
