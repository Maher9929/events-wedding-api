@echo off
chcp 65001 >nul
title Dousha - Selenium + Cucumber Tests
echo.
echo ╔══════════════════════════════════════════════════╗
echo ║   Dousha - Tests E2E (Selenium + Cucumber)       ║
echo ╚══════════════════════════════════════════════════╝
echo.

:: ── Step 1: Start Backend ────────────────────────
echo [1/5] Démarrage du backend NestJS...
cd /d "%~dp0"
start /b cmd /c "npm run start:dev > test\reports\backend.log 2>&1"
timeout /t 5 /nobreak >nul

:: ── Step 2: Start Frontend ───────────────────────
echo [2/5] Démarrage du frontend React...
cd /d "%~dp0frontend"
start /b cmd /c "npm run dev > ..\test\reports\frontend.log 2>&1"
cd /d "%~dp0"
timeout /t 5 /nobreak >nul

:: ── Step 3: Wait for servers ─────────────────────
echo [3/5] Attente que les serveurs soient prêts...
:wait_backend
curl -s http://localhost:3000/api >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_backend
)
echo       ✅ Backend prêt (port 3000)

:wait_frontend
curl -s http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_frontend
)
echo       ✅ Frontend prêt (port 5173)
echo.

:: ── Step 4: Run Cucumber Tests ───────────────────
echo [4/5] 🧪 Lancement des tests Selenium + Cucumber...
echo ─────────────────────────────────────────────────
call npx cucumber-js
echo ─────────────────────────────────────────────────
echo.

:: ── Step 5: Generate HTML Report ─────────────────
echo [5/5] 📊 Génération du rapport HTML...
call node test\generate-report.js
echo.

:: ── Cleanup ──────────────────────────────────────
echo Arrêt des serveurs...
taskkill /f /im node.exe >nul 2>&1
echo.
echo ╔══════════════════════════════════════════════════╗
echo ║   ✅ Tests terminés !                             ║
echo ║                                                  ║
echo ║   📄 Rapport: test\reports\rapport-tests.html     ║
echo ║   📸 Captures: test\reports\screenshots\          ║
echo ╚══════════════════════════════════════════════════╝
echo.
pause
