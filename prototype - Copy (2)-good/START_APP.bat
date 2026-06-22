@echo off
title Project Tracking - Mail Service
cd /d "%~dp0server"
set PYTHON="C:\Users\udayk\AppData\Local\Programs\Python\Python310\python.exe"
if not exist %PYTHON% set PYTHON=python

echo Installing Python packages (first run only)...
%PYTHON% -m pip install flask flask-cors -q

echo.
echo Starting app at http://localhost:3001/
echo Close this window to stop the server.
echo.

start "" "http://localhost:3001/"
%PYTHON% mail_server.py
