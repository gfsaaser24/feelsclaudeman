---
description: Start FeelsClaudeMan server
allowed-tools: Bash(py:*), Bash(curl:*)
---

Start all FeelsClaudeMan processes (daemon, WebSocket server, and Web UI).

**Note:** The MCP server starts automatically when this plugin is loaded by Claude Code.

Start all services:
```bash
python "${CLAUDE_PLUGIN_ROOT}/hooks/lifecycle.py" start
```

Check daemon health (HTTP API on port 3849):
```bash
curl -s http://localhost:3849/health
```

If you updated daemon code and need to reload it, use restart instead:
```bash
python "${CLAUDE_PLUGIN_ROOT}/hooks/lifecycle.py" restart
```

After starting, the dashboard is available at: http://localhost:3000
