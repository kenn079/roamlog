@echo off
cd /d "%~dp0"
echo Starting RoamLog Server on http://localhost:3001 ...
start "" "http://localhost:3001"
npm start
