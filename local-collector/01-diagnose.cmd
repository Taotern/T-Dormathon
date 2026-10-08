@echo off
call "%~dp0launch.cmd" diagnose
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%
