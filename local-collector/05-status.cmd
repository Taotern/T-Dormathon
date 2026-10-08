@echo off
call "%~dp0launch.cmd" status
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%
