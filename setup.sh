#!/bin/bash
# Setup script for local development

echo "🎮 WorldBoss Setup Script"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo "✅ Node.js: $NODE_VERSION"
echo "✅ npm: $NPM_VERSION"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Create .env files if they don't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "🚀 To start development:"
echo "   npm run dev"
echo ""
echo "📖 Frontend: http://localhost:3000"
echo "📖 Backend: http://localhost:3001"
echo "📡 WebSocket: ws://localhost:3001"
