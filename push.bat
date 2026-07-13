@echo off
cd /d "%~dp0"
echo =========================================
echo       RMS - Pushing Changes to GitHub     
echo =========================================
echo.
echo 1. Adding changes to Git...
git add .
echo.
echo 2. Committing changes...
git commit -m "feat: Integrate Razorpay payment gateway on client and server"
echo.
echo 3. Pushing to GitHub...
git push
echo.
echo =========================================
echo Done! Press any key to exit.
echo =========================================
pause
