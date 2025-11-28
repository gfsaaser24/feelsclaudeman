---
description: Check FeelsClaudeMan server status and current emotion
---

Check the status of the FeelsClaudeMan emotion tracking system.

**Instructions:**
Run a quick health check on the MCP server:
```bash
curl http://localhost:3847/health
```

This returns:
- Server status (ok/error)
- Current session ID
- Detection mode (pattern/claude/hybrid)
- Connected WebSocket clients

**Current Settings:**
- HTTP Port: 3847 (hook events)
- WebSocket Port: 3848 (real-time UI)
- Detection Mode: hybrid (pattern + Claude)
- Database: data/feelsclaudeman.db

**MCP Tools Available:**
- `get_current_emotion` - Get latest emotion and GIF
- `get_emotion_history` - Get recent emotions
- `set_detection_mode` - Change detection mode
- `get_session_stats` - Get session statistics
- `get_viral_moments` - Get viral moment history
