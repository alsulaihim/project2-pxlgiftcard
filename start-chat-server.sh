#!/bin/bash
# Development server startup script

echo "🚀 Starting PXL Chat Server in development mode..."

# Check if .env file exists
if [ ! -f chat-server/.env ]; then
    echo "⚠️  .env file not found, copying from .env.example"
    cp chat-server/.env.example chat-server/.env
    echo "📝 Please update chat-server/.env with your Firebase credentials"
fi

# Navigate to chat-server directory
cd chat-server

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start development server
echo "🔌 Starting Socket.io server on port 8080..."
npm run dev

