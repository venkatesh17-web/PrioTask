@echo off
echo ========================================================
echo   Transferring PrioTask.apk to Motorola Phone
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0transfer_to_phone.ps1"
pause
