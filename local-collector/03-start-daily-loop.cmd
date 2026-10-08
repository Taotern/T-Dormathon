@echo off
call "%~dp0launch.cmd" loop
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%
