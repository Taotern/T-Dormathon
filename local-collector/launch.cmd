@echo off
setlocal
pushd "%~dp0"
set "NODE="
if exist "%~dp0bin\node.exe" set "NODE=%~dp0bin\node.exe"
if not defined NODE for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE set "NODE=%%N"
if not defined NODE (
  echo Node.js 24.x was not found.
  echo Get the official Windows Node.js 24.x from https://nodejs.org/en/download
  echo Or place the official standalone node.exe in this package's bin folder.
  echo This launcher does not install anything or change Windows settings.
  popd
  pause
  exit /b 2
)
"%NODE%" -e "if(process.versions.node.split('.')[0]!=='24'){console.error('Use Node.js 24.x, not '+process.versions.node);process.exit(2)}"
if errorlevel 1 (
  popd
  pause
  exit /b 2
)
"%NODE%" collector.mjs %*
set "RESULT=%ERRORLEVEL%"
popd
exit /b %RESULT%
