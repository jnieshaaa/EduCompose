@echo off
REM Installation script for Python 3.12
REM This script upgrades pip, setuptools, and wheel, then installs dependencies

echo ========================================
echo EduCompose Backend - Python 3.12 Setup
echo ========================================
echo.

echo Step 1: Upgrading pip, setuptools, and wheel...
python -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
    echo ERROR: Failed to upgrade pip/setuptools/wheel
    pause
    exit /b 1
)

echo.
echo Step 2: Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    echo.
    echo Trying alternative installation method...
    echo.
    echo Installing numpy separately first...
    pip install numpy>=1.26.0
    if errorlevel 1 (
        echo ERROR: Failed to install numpy
        pause
        exit /b 1
    )
    echo.
    echo Installing remaining dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install remaining dependencies
        pause
        exit /b 1
    )
)

echo.
echo Step 3: Downloading spaCy English model (large)...
python -m spacy download en_core_web_lg
if errorlevel 1 (
    echo WARNING: Failed to download spaCy model. You may need to run this manually:
    echo python -m spacy download en_core_web_lg
)

echo.
echo ========================================
echo Installation complete!
echo ========================================
echo.
echo Next steps:
echo 1. Copy env.example to .env and configure it
echo 2. Run: python start.py
echo.
pause

