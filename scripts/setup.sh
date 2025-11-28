#!/bin/bash
# FeelsClaudeMan Setup Script for Unix/Mac
# Run this script to install all dependencies

echo "========================================"
echo "  FeelsClaudeMan Setup Script"
echo "========================================"
echo ""

# Get script directory (plugin root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
echo "Plugin root: $PLUGIN_ROOT"

# Check Node.js
echo ""
echo "[1/4] Checking Node.js..."
if command -v node &> /dev/null; then
    echo "  Node.js found: $(node --version)"
else
    echo "  Node.js not found! Please install Node.js 18+"
    exit 1
fi

# Check Python
echo ""
echo "[2/4] Checking Python..."
if command -v python3 &> /dev/null; then
    echo "  Python found: $(python3 --version)"
elif command -v python &> /dev/null; then
    echo "  Python found: $(python --version)"
else
    echo "  Python not found! Please install Python 3.8+"
    exit 1
fi

# Install MCP Server dependencies
echo ""
echo "[3/4] Installing MCP Server dependencies..."
cd "$PLUGIN_ROOT/mcp-server"
npm install
if [ $? -eq 0 ]; then
    echo "  MCP Server dependencies installed"
    npm run build
    if [ $? -eq 0 ]; then
        echo "  MCP Server built successfully"
    else
        echo "  MCP Server build failed!"
    fi
else
    echo "  MCP Server npm install failed!"
fi

# Install Web UI dependencies
echo ""
echo "[4/4] Installing Web UI dependencies..."
cd "$PLUGIN_ROOT/web-ui"
npm install
if [ $? -eq 0 ]; then
    echo "  Web UI dependencies installed"
else
    echo "  Web UI npm install failed!"
fi

# Create data directory
echo ""
echo "Creating data directory..."
mkdir -p "$PLUGIN_ROOT/data"
echo "  Data directory created"

# Done
echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. (Optional) Set GIPHY_API_KEY environment variable"
echo "  2. Restart Claude Code to load the plugin"
echo "  3. Start the Web UI: cd web-ui && npm run dev"
echo "  4. Open http://localhost:3000 in your browser"
echo ""
echo "The MCP server starts automatically with Claude Code."
echo ""
