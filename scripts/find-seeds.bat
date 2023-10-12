@echo off
cd ..

set /p "filter=Filter: "
set "args=--filter %filter%"

choice /m "Randomizer mode: "
if %errorlevel% == 1 set "args=%args% --randomizer "

choice /m "Bravery mode: "
if %errorlevel% == 1 set "args=%args% --bravery "

choice /m "Relics mode: "
if %errorlevel% == 1 set "args=%args% --relics "

echo.
node build find %args%
echo. & pause
