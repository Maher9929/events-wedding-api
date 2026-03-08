@echo off
echo ==========================================
echo    DOUSHA - STARTING DEMO SERVERS
echo ==========================================
echo.
echo [1/2] Starting Backend Server (Port 3000)...
start /B cmd /c "npm run start:dev"
echo.
echo [2/2] Starting Frontend Server (Port 5173)...
cd frontend
start /B cmd /c "npm run dev"
echo.
echo ==========================================
echo Servers are starting! 
echo Backend  : http://localhost:3000
echo Frontend : http://localhost:5173
echo ==========================================
pause
