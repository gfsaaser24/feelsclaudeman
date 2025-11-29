---
description: Check FeelsClaudeMan server status and current emotion
allowed-tools: Bash(py:*), Bash(curl:*)
---

Check the status of all FeelsClaudeMan processes.

**Check process status:**
```bash
python "${CLAUDE_PLUGIN_ROOT}/hooks/lifecycle.py" status
```

**Check daemon health (core processing):**
```bash
curl -s http://localhost:3849/health
```

**Process Ports:**
- Daemon WebSocket: 3848 (real-time emotion broadcast)
- Daemon HTTP API: 3849 (purge, stats, health)
- Web UI: 3000 (Next.js dashboard)
- MCP Server: 38470 (Claude Code integration)

**MCP Tools Available:**
- `get_current_emotion` - Get latest emotion and GIF
- `get_session_stats` - Get session statistics
