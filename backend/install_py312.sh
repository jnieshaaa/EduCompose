#!/bin/bash
# Installation script for Python 3.12
# This script upgrades pip, setuptools, and wheel, then installs dependencies

echo "========================================"
echo "EduCompose Backend - Python 3.12 Setup"
echo "========================================"
echo ""

echo "Step 1: Upgrading pip, setuptools, and wheel..."
python -m pip install --upgrade pip setuptools wheel
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to upgrade pip/setuptools/wheel"
    exit 1
fi

echo ""
echo "Step 2: Installing dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    echo ""
    echo "Trying alternative installation method..."
    echo ""
    echo "Installing numpy separately first..."
    pip install numpy>=1.26.0
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install numpy"
        exit 1
    fi
    echo ""
    echo "Installing remaining dependencies..."
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install remaining dependencies"
        exit 1
    fi
fi

echo ""
echo "Step 3: Downloading spaCy English model (medium)..."
python -m spacy download en_core_web_md
if [ $? -ne 0 ]; then
    echo "WARNING: Failed to download spaCy model. You may need to run this manually:"
    echo "python -m spacy download en_core_web_md"
fi

echo ""
echo "========================================"
echo "Installation complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Copy env.example to .env and configure it"
echo "2. Run: python start.py"
echo ""

