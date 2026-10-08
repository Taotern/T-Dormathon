@echo off
call "%~dp0launch.cmd" once
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%
