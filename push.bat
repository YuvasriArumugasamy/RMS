@echo off
cd /d "%~dp0"
echo =========================================
echo       RMS - Pushing Changes to GitHub     
echo =========================================
echo.
echo 1. Adding all changes to Git...
git add .
echo.
echo 2. Committing changes...
git commit -m "Update RMS application files and features"
echo.
echo 3. Pushing to GitHub (origin main)...
git push origin main
echo.
echo =========================================
echo Done! Press any key to exit.
echo =========================================
pause

