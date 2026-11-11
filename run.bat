@echo off
title Dev Server
cd /d "%~dp0"

call npm run dev @REM // run development server
pause