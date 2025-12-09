@echo off
echo ==========================================
echo       LUMEN LAB - Fabric Design Tool
echo ==========================================

echo.
echo [1/2] Checking dependencies...
if not exist node_modules (
    echo node_modules not found. Installing...
    call npm install
) else (
    echo Dependencies found. Skipping install.
)

echo.
echo [2/2] Starting Development Server...
echo.
echo Opening browser...
start http://localhost:5173
call npm run dev

pause
