@echo off
cd ..

set /p "seed=Seed: "
set "args=--seed %seed%"

choice /m "Randomizer mode: "
if %errorlevel% == 1 set "args=%args% --randomizer "

choice /m "Bravery mode: "
if %errorlevel% == 1 set "args=%args% --bravery "

choice /m "Relics mode: "
if %errorlevel% == 1 set "args=%args% --relics "

echo.
node build check %args%
echo. & pause
