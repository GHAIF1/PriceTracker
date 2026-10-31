@echo off
rem Runs one price check; used by the two scheduled tasks.
cd /d "%~dp0"
call npm run once
