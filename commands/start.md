---
description: Start FeelsClaudeMan server
allowed-tools: Bash(node:*), Bash(cd:*), Bash(curl:*)
---

Start the FeelsClaudeMan MCP server.

**Execute these steps:**

1. Check if server is already running:
```bash
curl -s http://localhost:3847/health 2>/dev/null || echo "NOT_RUNNING"
```

2. If NOT_RUNNING, start the server in background:
```bash
cd /c/code/claudethinks/feelsclaudeman/mcp-server && GIPHY_API_KEY="REDACTED_GIPHY_KEY" node build/index.js &
```

3. Wait and verify:
```bash
sleep 2 && curl -s http://localhost:3847/health
```

Report success or failure to the user.
