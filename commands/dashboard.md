---
description: Open the FeelsClaudeMan emotion dashboard in browser
---

Open the FeelsClaudeMan web UI dashboard to view real-time emotions and memes.

**Instructions:**
1. Make sure the MCP server is running (it starts automatically with the plugin)
2. Make sure the web UI is running: `cd web-ui && npm run dev`
3. Open http://localhost:3000 in your browser

If the server isn't running, start it with:
```bash
cd mcp-server && npm run build && npm start
```

The dashboard shows:
- Current emotion GIF in real-time
- Intensity meter (1-10 scale)
- Claude's thinking and reasoning
- Timeline of past emotions
- Session statistics
- Viral moment alerts
