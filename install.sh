#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     DataLens — Auto Setup Script     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check Node.js version
NODE_VER=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VER" ] || [ "$NODE_VER" -lt 18 ]; then
  echo "ERROR: Node.js 18+ is required."
  echo "Install it from: https://nodejs.org"
  exit 1
fi
echo "✓ Node.js $(node -v) detected"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install
echo "✓ Dependencies installed"

# Setup .env.local
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "ACTION REQUIRED:"
  echo "Open .env.local and add your Anthropic API key."
  echo "Get a free key at: https://console.anthropic.com"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  read -p "Press Enter after you have added your API key..."
else
  echo "✓ .env.local already exists"
fi

# Validate API key is set
KEY=$(grep ANTHROPIC_API_KEY .env.local | cut -d'=' -f2)
if [ "$KEY" = "your_anthropic_api_key_here" ] || [ -z "$KEY" ]; then
  echo "WARNING: ANTHROPIC_API_KEY not set. AI features will not work."
else
  echo "✓ API key detected"
fi

echo ""
echo "✓ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
