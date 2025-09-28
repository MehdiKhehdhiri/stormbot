#!/bin/bash

echo "🌩️ Starting StormBot Frontend Server"
echo "===================================="

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating template..."
    echo "API_KEY=your_blackbox_ai_api_key_here" > .env
    echo "📝 Please edit .env file and add your BlackBox AI API key"
fi

# Start the server
echo "🚀 Starting frontend server on http://localhost:3000"
echo "📊 Dashboard will be available at http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

node server.js
