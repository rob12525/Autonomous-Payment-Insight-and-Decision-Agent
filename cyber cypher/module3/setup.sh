#!/bin/bash

# Module 3: Action Execution, Safety & Learning
# Setup Script

echo "=========================================="
echo "Module 3 Setup"
echo "=========================================="
echo ""

# Check Python version
echo "Checking Python version..."
python3 --version

if [ $? -ne 0 ]; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

echo "✅ Python 3 is installed"
echo ""

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

if [ $? -ne 0 ]; then
    echo "❌ Failed to create virtual environment"
    exit 1
fi

echo "✅ Virtual environment created"
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "ℹ️  .env file already exists"
fi

# Create necessary directories
echo "Creating directories..."
mkdir -p logs
mkdir -p chroma_db
echo "✅ Directories created"
echo ""

# Run tests
echo "Running tests..."
python tests/test_safety.py

if [ $? -ne 0 ]; then
    echo "❌ Safety tests failed"
    exit 1
fi

echo "✅ Safety tests passed"
echo ""

# Setup complete
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Activate virtual environment: source venv/bin/activate"
echo "2. Review configuration: edit config/module3.yaml"
echo "3. Run demo: python main.py"
echo "4. Run all tests: python tests/test_safety.py && python tests/test_executor.py"
echo ""
echo "⚠️  Remember: Always test in simulation mode first!"
echo ""