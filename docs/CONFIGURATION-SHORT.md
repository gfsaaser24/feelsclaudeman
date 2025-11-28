# FeelsClaudeMan Configuration

Quick reference for configuration options.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GIPHY_API_KEY` | Built-in key | Giphy API key for GIF searches |
| `ANTHROPIC_API_KEY` | Built-in key | Anthropic API key for Haiku commentary |
| `FEELS_WS_PORT` | 3848 | WebSocket server port |

## Setting Variables

```bash
# Linux/Mac - add to ~/.bashrc or ~/.zshrc
export GIPHY_API_KEY="your_giphy_key"
export ANTHROPIC_API_KEY="your_anthropic_key"
export FEELS_WS_PORT=3848

# Windows PowerShell
$env:GIPHY_API_KEY = "your_giphy_key"
$env:ANTHROPIC_API_KEY = "your_anthropic_key"
```

## Daemon Configuration

**File:** `scripts/feels-daemon.py`

### Toggle Meta-Commentary

```python
ENABLE_META_COMMENTARY = True  # Set to False to disable
```

### Change Haiku Model

```python
HAIKU_MODEL = "claude-haiku-4-5-20251001"
```

### Feed File Location

```python
FEED_FILE = Path.home() / ".claude" / "feels-feed.jsonl"
```

### GIF Cache Location

```python
GIF_CACHE_FILE = Path.home() / ".claude" / "gif-cache.json"
```

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Web UI | Next.js development server |
| 3848 | WebSocket | Daemon broadcasts emotions |
| 3847 | MCP Server | Optional (legacy) |

## Key Files

| File | Purpose |
|------|---------|
| `~/.claude/feels-feed.jsonl` | Hook → Daemon communication |
| `~/.claude/gif-cache.json` | Cached GIF results |
| `hooks/.capture_debug.log` | Hook debug logs |

## See Also

- [SETUP.md](./SETUP.md) - Installation guide
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Customization
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
