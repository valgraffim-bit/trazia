@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 goto :python_launcher
start "Trazia - servidor local" /min node server.mjs
goto :open_app

:python_launcher
where py >nul 2>&1
if not errorlevel 1 goto :use_py
where python >nul 2>&1
if errorlevel 1 goto :missing_python
start "Trazia - servidor local" /min python -m http.server 8000 --bind 127.0.0.1
goto :open_app

:use_py
start "Trazia - servidor local" /min py -m http.server 8000 --bind 127.0.0.1

:open_app
timeout /t 2 /nobreak >nul
start "" "http://localhost:8000"
exit /b 0

:missing_python
echo No se encontro Node.js ni Python. Pide ayuda para iniciar Trazia en localhost.
pause
exit /b 1
AIzaSyBTa9G3ZEmUtw8AE5vLlKU68nDd2JvMNwc
