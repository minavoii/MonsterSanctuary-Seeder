@echo off
cd ..

echo This will generate all possible seeds and can take a while.
echo The current seeds.db file will be overwritten.
choice /m "Continue? "
if %errorlevel% NEQ 1 pause && exit

node build create-database
echo. & pause
