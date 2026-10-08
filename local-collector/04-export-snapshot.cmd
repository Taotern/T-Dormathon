@echo off
call "%~dp0launch.cmd" export
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%
