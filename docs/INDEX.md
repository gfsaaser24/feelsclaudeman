# FeelsClaudeMan Documentation Index

Welcome to the FeelsClaudeMan documentation!

## Quick Links

- **New User?** Start with [README.md](#readmemd)
- **Installing?** See [SETUP.md](#setupmd)
- **Configuring?** Check [CONFIGURATION-SHORT.md](#configuration-shortmd)
- **Developing?** Read [DEVELOPMENT.md](#developmentmd)
- **Understanding the system?** Review [ARCHITECTURE.md](#architecturemd)

## Documentation Files

### README.md
**Quick start guide and feature overview**

- What is FeelsClaudeMan
- Key features (emotions, meta-commentary, UI)
- Quick installation
- Basic usage
- Troubleshooting

### SETUP.md
**Detailed installation and configuration guide**

- Prerequisites (Python, Node.js, Claude Code)
- Step-by-step installation
- Environment configuration
- Verification steps
- Troubleshooting guide

### ARCHITECTURE.md
**System design and technical deep-dive**

- System overview with diagrams
- Component architecture (Hooks, Daemon, Web UI)
- Data flow explanations
- Technology choices
- Emotion detection system
- Meta-commentary system
- WebSocket protocol
- Performance considerations

### CONFIGURATION-SHORT.md
**Quick configuration reference**

- Environment variables
- Port configuration
- Key files

### DEVELOPMENT.md
**Developer guide for extending FeelsClaudeMan**

- Adding new emotions
- Customizing meta-commentary
- Customizing internal monologue
- Customizing the UI
- WebSocket API reference
- Testing guide
- Contributing guidelines

## Architecture Overview

```
┌──────────────────┐     ┌────────────────┐     ┌─────────────────┐
│  Claude Code     │     │  Python Daemon │     │  Next.js Web UI │
│  (Hooks)         │────▶│  (feels-daemon)│────▶│  (Browser)      │
└──────────────────┘     └────────────────┘     └─────────────────┘
        │                       │                        │
   PostToolUse         File-based feed          WebSocket live
   writes to JSONL     Giphy + Haiku API        GIF updates
```

**Components:**
1. **Hooks** - Capture tool events (~5ms)
2. **Python Daemon** - Detect emotions, fetch GIFs, call Haiku
3. **Web UI** - Display GIFs in real-time

## Key Features

### Emotion Detection
12 core emotions with 5-7 GIF variations each:
- focused, curious, creative, excited
- success, frustrated, confused, thinking
- determined, relieved, playful, proud

### FeelsClaudeMan Commentary
Haiku 4.5 provides edgy, witty observations:
- Developer culture roasts
- Vibe coder jokes
- Memelord energy

### Claude Brand UI
- Claude Coral (#E07A5F) accent
- Glassmorphism cards
- Fraunces/Outfit typography
- Dark mode GIF display

## Files Reference

### Core Files

| File | Purpose |
|------|---------|
| `scripts/feels-daemon.py` | Main daemon process |
| `scripts/internal_monologue.py` | Thought generation |
| `hooks/capture.py` | PostToolUse hook |
| `hooks/hooks.json` | Hook configuration |
| `web-ui/src/app/page.tsx` | Dashboard UI |
| `web-ui/src/app/globals.css` | Styles |

### Data Files

| File | Purpose |
|------|---------|
| `~/.claude/feels-feed.jsonl` | Hook → Daemon feed |
| `~/.claude/gif-cache.json` | Cached GIFs |
| `hooks/.capture_debug.log` | Debug logs |

## Ports

| Port | Service |
|------|---------|
| 3000 | Web UI (Next.js) |
| 3848 | WebSocket Server |

## Common Tasks

### Start Everything

```bash
# 1. Start Claude Code (auto-starts daemon)
claude

# 2. Start Web UI
cd web-ui && npm run dev

# 3. Open dashboard
open http://localhost:3000
```

### Add New Emotion

1. Edit `scripts/feels-daemon.py`
2. Add to `EMOTIONS` dict
3. Optionally add to `TOOL_EMOTIONS` and `TEXT_PATTERNS`
4. Restart daemon

### Change Commentary Style

1. Edit `scripts/feels-daemon.py`
2. Modify `META_COMMENTARY_PROMPT`
3. Restart daemon

### Debug Issues

```bash
# Check daemon output
cd scripts && python feels-daemon.py

# Check feed file
tail -f ~/.claude/feels-feed.jsonl

# Check hook logs
tail -f hooks/.capture_debug.log
```

---

**Documentation Version:** 2.0
**Last Updated:** 2025-11-27
**Plugin Version:** FeelsClaudeMan v2.0
