# FeelsClaudeMan Setup Script for Windows
# Run this script to install all dependencies

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FeelsClaudeMan Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory (plugin root)
$PLUGIN_ROOT = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Write-Host "Plugin root: $PLUGIN_ROOT" -ForegroundColor Gray

# Check Node.js
Write-Host "`n[1/4] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "  Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  Node.js not found! Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check Python
Write-Host "`n[2/4] Checking Python..." -ForegroundColor Yellow
$pythonVersion = py --version 2>$null
if ($pythonVersion) {
    Write-Host "  Python found: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "  Python not found! Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Install MCP Server dependencies
Write-Host "`n[3/4] Installing MCP Server dependencies..." -ForegroundColor Yellow
Push-Location "$PLUGIN_ROOT\mcp-server"
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "  MCP Server dependencies installed" -ForegroundColor Green
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  MCP Server built successfully" -ForegroundColor Green
    } else {
        Write-Host "  MCP Server build failed!" -ForegroundColor Red
    }
} else {
    Write-Host "  MCP Server npm install failed!" -ForegroundColor Red
}
Pop-Location

# Install Web UI dependencies
Write-Host "`n[4/4] Installing Web UI dependencies..." -ForegroundColor Yellow
Push-Location "$PLUGIN_ROOT\web-ui"
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Web UI dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  Web UI npm install failed!" -ForegroundColor Red
}
Pop-Location

# Create data directory
Write-Host "`nCreating data directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$PLUGIN_ROOT\data" | Out-Null
Write-Host "  Data directory created" -ForegroundColor Green

# Done
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. (Optional) Set GIPHY_API_KEY environment variable"
Write-Host "  2. Restart Claude Code to load the plugin"
Write-Host "  3. Start the Web UI: cd web-ui && npm run dev"
Write-Host "  4. Open http://localhost:3000 in your browser"
Write-Host ""
Write-Host "The MCP server starts automatically with Claude Code."
Write-Host ""
