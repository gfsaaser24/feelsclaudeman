---
description: Stop FeelsClaudeMan processes
allowed-tools: Bash(py:*)
---

Stop all FeelsClaudeMan processes (MCP server, WebSocket server, and Web UI).

**Note:** This will kill all processes associated with FeelsClaudeMan. Use `/feelsclaudeman:start` to restart them.

Stop all services:
```bash
python "${CLAUDE_PLUGIN_ROOT}/hooks/lifecycle.py" stop
```

This command is also automatically run when Claude Code session ends.
