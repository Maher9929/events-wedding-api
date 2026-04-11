@echo off
cd /d "%~dp0"
call node test\run-cucumber.js
