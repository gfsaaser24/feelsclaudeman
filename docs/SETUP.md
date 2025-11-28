# FeelsClaudeMan Setup Guide

Complete installation and configuration guide for FeelsClaudeMan.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)
6. [Uninstallation](#uninstallation)

## Prerequisites

### Required Software

#### Python
- **Version:** 3.8 or higher
- **Check version:** `python --version` or `python3 --version`
- **Install:** [python.org](https://www.python.org/downloads/)

#### Node.js
- **Version:** 18.0 or higher
- **Check version:** `node --version`
- **Install:** [nodejs.org](https://nodejs.org/)

#### Claude Code CLI
- **Check:** `claude --version`
- **Install:** Follow [Claude Code documentation](https://claude.ai)

### Python Dependencies (Auto-Installed)

The daemon auto-installs these on first run:
- `websockets` - WebSocket server
- `aiohttp` - Async HTTP client for Giphy
- `watchdog` - File system monitoring
- `anthropic` - Haiku API for meta-commentary

### Optional API Keys

#### Giphy API Key
- **Required for:** Custom GIF searches
- **Get key:** [developers.giphy.com](https://developers.giphy.com/)
- **Note:** Plugin includes a default key that works out of the box

#### Anthropic API Key
- **Required for:** FeelsClaudeMan meta-commentary (Haiku 4.5)
- **Get key:** [console.anthropic.com](https://console.anthropic.com/)
- **Note:** Plugin includes a default key that works out of the box

## Installation

### Step 1: Clone the Repository

```bash
# Navigate to Claude plugins directory
cd ~/.claude/plugins

# Or on Windows:
cd %USERPROFILE%\.claude\plugins

# Clone the plugin
git clone https://github.com/yourusername/feelsclaudeman.git
cd feelsclaudeman
```

### Step 2: Install Web UI Dependencies

```bash
cd web-ui
npm install
```

**Expected output:**
```
added 250 packages in 8s
```

### Step 3: Pre-Install Python Dependencies (Optional)

The daemon auto-installs dependencies, but you can pre-install:

```bash
pip install websockets aiohttp watchdog anthropic
```

### Step 4: Verify Plugin Structure

Your plugin directory should look like:

```
feelsclaudeman/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   ├── hooks.json
│   ├── capture.py
│   ├── stop-hook.py
│   └── start-daemon.py
├── scripts/
│   ├── feels-daemon.py
│   └── internal_monologue.py
├── web-ui/
│   ├── package.json
│   ├── node_modules/
│   └── src/
│       ├── app/
│       │   ├── page.tsx
│       │   ├── layout.tsx
│       │   └── globals.css
│       └── types/
│           └── emotions.ts
├── commands/
│   ├── dashboard.md
│   └── status.md
├── mcp-server/ (optional, legacy)
└── docs/
```

### Step 5: Enable the Plugin

Claude Code automatically detects plugins via `.claude-plugin/plugin.json`.

**Verify plugin is detected:**

```bash
claude plugins list
```

You should see `feelsclaudeman` in the list.

## Configuration

### Environment Variables

Set these in your shell environment or `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `GIPHY_API_KEY` | Built-in key | Giphy API key for GIF searches |
| `ANTHROPIC_API_KEY` | Built-in key | Anthropic API key for Haiku commentary |
| `FEELS_WS_PORT` | 3848 | WebSocket server port |

### Optional: Custom API Keys

To use your own API keys:

```bash
# In your shell profile (.bashrc, .zshrc, etc.)
export GIPHY_API_KEY="your_giphy_api_key"
export ANTHROPIC_API_KEY="your_anthropic_api_key"
```

### Optional: Change WebSocket Port

If port 3848 is in use:

```bash
export FEELS_WS_PORT=3850
```

You'll also need to update the Web UI to connect to the new port.

### Disabling Meta-Commentary

To disable Haiku meta-commentary, edit `scripts/feels-daemon.py`:

```python
ENABLE_META_COMMENTARY = False  # Change from True
```

## Verification

### Step 1: Start a Claude Session

```bash
claude
```

The `SessionStart` hook should automatically start the daemon.

**Expected output (in daemon logs):**
```
[Daemon] Starting FeelsClaudeMan daemon...
[Daemon] Watching: ~/.claude/feels-feed.jsonl
[Daemon] WebSocket port: 3848
[Daemon] Loaded 15 cached search terms
[Daemon] WebSocket server running on ws://localhost:3848
[Daemon] Ready! Waiting for thoughts...
```

### Step 2: Start the Web UI

In a separate terminal:

```bash
cd web-ui
npm run dev
```

**Expected output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in 2.3s
```

### Step 3: Open the Dashboard

Visit `http://localhost:3000` in your browser.

You should see:
- "Connected" status indicator
- Gradient mesh background with Claude colors
- Empty timeline (waiting for thoughts)

### Step 4: Trigger an Emotion

In Claude Code, ask Claude to do something:

```
> Can you run `echo "Hello FeelsClaudeMan"` in bash?
```

**Expected in dashboard:**
- GIF appears
- Internal monologue shows
- FeelsClaudeMan commentary appears (if real thinking captured)
- Timeline updates

### Step 5: Check Logs

**Hook logs:**
```bash
cat ~/.claude/plugins/feelsclaudeman/hooks/.capture_debug.log
```

**Feed file:**
```bash
tail -f ~/.claude/feels-feed.jsonl
```

## Troubleshooting

### Plugin Not Detected

**Symptom:** `claude plugins list` doesn't show feelsclaudeman

**Solutions:**

1. **Check plugin.json exists:**
   ```bash
   ls -la .claude-plugin/plugin.json
   ```

2. **Validate JSON syntax:**
   ```bash
   cat .claude-plugin/plugin.json | python -m json.tool
   ```

3. **Check Claude plugins directory:**
   ```bash
   # Should be in one of:
   ~/.claude/plugins/feelsclaudeman
   %USERPROFILE%\.claude\plugins\feelsclaudeman
   ```

4. **Restart Claude CLI:**
   ```bash
   claude restart
   ```

### Daemon Not Starting

**Symptom:** No emotions appearing, daemon not running

**Check 1: Manual start**
```bash
cd scripts
python feels-daemon.py
```

**Check 2: Port already in use**
```bash
# Linux/Mac
lsof -i :3848

# Windows
netstat -an | findstr :3848

# Solution: Kill the process or change FEELS_WS_PORT
```

**Check 3: Missing Python dependencies**
```bash
pip install websockets aiohttp watchdog anthropic
```

### No Emotions Detected

**Symptom:** Dashboard connected but no thoughts appear

**Check 1: Hooks registered**
```bash
cat hooks/hooks.json
# Should contain PostToolUse, Stop, SessionStart
```

**Check 2: Feed file being written**
```bash
tail -f ~/.claude/feels-feed.jsonl
# Should show new lines on tool use
```

**Check 3: Daemon watching correct file**
```bash
# Daemon should log:
[Daemon] Watching: ~/.claude/feels-feed.jsonl
```

**Check 4: Hook script executable**
```bash
python hooks/capture.py posttooluse
# Should run without errors
```

### GIFs Not Loading

**Symptom:** Dashboard shows emotions but no GIFs

**Check 1: Giphy API connectivity**
```bash
curl "https://api.giphy.com/v1/gifs/search?api_key=ZPqMZkzxT3krxuHUJJyrD2uAJDktMm8I&q=test&limit=1"
# Should return JSON with gif data
```

**Check 2: GIF cache**
```bash
cat ~/.claude/gif-cache.json
# Should contain cached GIFs
```

**Check 3: Browser console**
- Open DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests

### No FeelsClaudeMan Commentary

**Symptom:** GIFs appear but no commentary

**Check 1: Real thinking blocks captured**
```bash
# In feed file, check for thinking_block
grep "thinking_block" ~/.claude/feels-feed.jsonl | tail -1
# Should have content, not empty
```

**Check 2: Anthropic API key valid**
```bash
# Daemon should log on success:
[Daemon] Meta-commentary: "Some witty comment..."
```

**Check 3: Commentary enabled**
In `scripts/feels-daemon.py`:
```python
ENABLE_META_COMMENTARY = True  # Should be True
```

### WebSocket Won't Connect

**Symptom:** Dashboard shows "disconnected"

**Check 1: Daemon running**
```bash
# Linux/Mac
ps aux | grep feels-daemon

# Windows
tasklist | findstr python
```

**Check 2: Correct port**
Dashboard connects to `ws://localhost:3848` by default.
Verify daemon is using same port.

**Check 3: Firewall**
- Try accessing from same machine
- Check firewall settings for port 3848

### Windows-Specific Issues

**Issue: Python not found**
```bash
# Use 'py' instead of 'python'
py --version
py scripts/feels-daemon.py
```

**Issue: taskkill not working in Git Bash**
```bash
# Use PowerShell for process management
powershell -Command "Stop-Process -Id <PID> -Force"
```

**Issue: Path separators**
- Use forward slashes in Git Bash
- Or use full Windows paths: `C:\Users\...\feelsclaudeman`

## Uninstallation

### Step 1: Stop Running Processes

```bash
# Stop the daemon
# Linux/Mac
pkill -f feels-daemon.py

# Windows PowerShell
Get-Process | Where-Object {$_.ProcessName -like "*python*"} | Stop-Process
```

### Step 2: Remove Plugin Directory

```bash
cd ~/.claude/plugins
rm -rf feelsclaudeman

# Or on Windows:
cd %USERPROFILE%\.claude\plugins
rmdir /s feelsclaudeman
```

### Step 3: Clean Up Data Files (Optional)

```bash
# Remove feed file
rm ~/.claude/feels-feed.jsonl

# Remove GIF cache
rm ~/.claude/gif-cache.json
```

### Step 4: Verify Removal

```bash
claude plugins list
# feelsclaudeman should not appear
```

## Next Steps

- See [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for customization
- See [CONFIGURATION-SHORT.md](./CONFIGURATION-SHORT.md) for quick reference

## Getting Help

**Enable debug logging:**
```bash
# In hooks/capture.py
DEBUG = True
```

**Check hook logs:**
```bash
tail -f hooks/.capture_debug.log
```

**Report issues:**
- GitHub Issues: [github.com/yourusername/feelsclaudeman/issues](https://github.com/yourusername/feelsclaudeman/issues)
- Include: OS, Python version, error logs, steps to reproduce
