@echo off
setlocal

echo Installing dependencies...
npm install

if %errorlevel% neq 0 (
  echo.
  echo npm install failed.
  exit /b %errorlevel%
)

echo.
echo Done.
pause
