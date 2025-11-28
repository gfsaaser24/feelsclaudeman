# FeelsClaudeMan

> Turn Claude's inner monologue into a meme-worthy reality show

---

## IMPORTANT DISCLAIMER

**This plugin was built almost entirely by AI (Claude Code) with minimal human verification.**

- **DO NOT** deploy to cloud environments unsupervised
- **DO NOT** run on systems with sensitive data or high internet access
- **DO NOT** use in production or public-facing environments
- **DO** run in sandboxed/isolated environments only
- **DO** review the code yourself before running

This is an experimental, for-fun project. The code has not been security audited. Use at your own risk.

---

**FeelsClaudeMan** is a Claude Code plugin that captures Claude's emotional states during coding sessions and displays perfectly-timed Giphy memes in real-time through a live browser dashboard.

## What is FeelsClaudeMan?

Ever wonder what Claude is really feeling when debugging your code? Now you can see it - complete with GIFs and unhinged commentary.

FeelsClaudeMan captures:
- **Tool usage events** - Every command, file edit, and search
- **Real thinking blocks** - Claude's actual internal reasoning from extended thinking
- **Success/failure states** - What worked and what didn't
- **Emotional patterns** - From "excited" to "frustrated" to "creative"
- **Context usage** - Real-time token consumption tracking

Then it translates those moments into **expressive GIF reactions** with **AI-powered meta-commentary** and displays them in a beautiful real-time dashboard.

## Features

### Real-Time Emotion Tracking
- **Pattern Detection** - Tool-based emotion mapping with text analysis
- **Multiple GIF variations** - Each emotion has 5-7 GIF search alternatives
- **Smart intensity** - Emotion intensity calculated from context

### FeelsClaudeMan Commentary (Haiku 4.5)
- **Edgy meta-commentary** - Haiku 4.5 watches Claude work and provides spicy observations
- **Developer culture roasts** - Dunks on bad takes about AI code
- **Vibe coder jokes** - Roasts the "just trust the vibes" crowd
- **Memelord energy** - Occasional political humor and shitposting

### 12 Core Emotions
- **Success**: excited, success, proud, relieved
- **Focus**: focused, determined, creative
- **Discovery**: curious, thinking, playful
- **Chaos**: frustrated, confused

### Live Web Dashboard (Claude Brand Design)
- **Hero GIF Display** - Large, prominent emotion meme
- **Real Thinking Panel** - See Claude's actual extended thinking
- **FeelsClaudeMan Commentary** - Haiku's witty observations
- **Context Meter** - Visual token usage indicator
- **Timeline** - Scrollable emotion history
- **Session Stats** - Dominant emotion, thought count, activity

### Thought Archive
Every emotion is saved to a GIF cache with:
- GIF search terms and URLs
- Emotion and intensity
- Session tracking

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
1. **Hooks** - Python scripts capture tool events, write to `~/.claude/feels-feed.jsonl`
2. **Python Daemon** - Watches feed file, detects emotions, fetches GIFs, calls Haiku for commentary
3. **Web UI** - Real-time dashboard with GIF display, thinking panel, and commentary

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed system design.

## Quick Installation

### Prerequisites
- Python 3.8+
- Node.js 18+
- Claude Code CLI

### Install Steps

1. **Clone the plugin**
   ```bash
   cd ~/.claude/plugins  # or your Claude plugins directory
   git clone https://github.com/yourusername/feelsclaudeman.git
   cd feelsclaudeman
   ```

2. **Install Web UI dependencies**
   ```bash
   cd web-ui
   npm install
   ```

3. **Install Python dependencies** (auto-installed by daemon)
   ```bash
   pip install websockets aiohttp watchdog anthropic
   ```

4. **Configure API keys**

   Copy the example config and add your keys:
   ```bash
   cp .mcp.json.example .mcp.json
   # Edit .mcp.json and add your GIPHY_API_KEY
   ```

   Or set environment variables:
   ```bash
   export GIPHY_API_KEY=your_giphy_key  # Required - get free key at developers.giphy.com
   export ANTHROPIC_API_KEY=your_key    # Optional - for Haiku commentary
   ```

5. **Enable the plugin**

   Claude Code automatically detects the plugin via `.claude-plugin/plugin.json`

## Quick Usage

### Start a Session
Just start using Claude Code normally. The plugin:
1. Automatically starts the daemon on `SessionStart`
2. Captures emotions on every `PostToolUse` hook
3. Broadcasts to the Web UI via WebSocket

### View the Dashboard
```
/feelsclaudeman:dashboard
```
This opens `http://localhost:3000` in your browser.

### Check Status
```
/feelsclaudeman:status
```
Shows current emotion and server status.

## Example in Action

```
Tool: Bash
Input: npm test
Result: All tests passed ✓

Dashboard shows:
┌─────────────────────────────────────┐
│  🎉 EXCITED (8/10)                  │
│  [celebration dance GIF]            │
│                                     │
│  Claude's Thinking:                 │
│  "Let me run the tests to verify    │
│   the changes work correctly..."    │
│                                     │
│  🔥 FeelsClaudeMan:                 │
│  "Tests passed on first try? This   │
│   is tremendous code. The best."    │
└─────────────────────────────────────┘
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GIPHY_API_KEY` | Yes | Giphy API key ([get free key](https://developers.giphy.com/)) |
| `ANTHROPIC_API_KEY` | Optional | For Haiku 4.5 meta-commentary (uses your Claude API key) |
| `FEELS_WS_PORT` | No | WebSocket server port (default: 3848) |

## UI Design

The dashboard features Claude's brand design language:
- **Claude Coral** (#E07A5F) - Primary accent color
- **Claude Cream** (#FBF8F3) - Background color
- **Glassmorphism** - Frosted glass card effects
- **Fraunces** - Display font for headings
- **Outfit** - Clean sans-serif for body text
- **JetBrains Mono** - Monospace for tool badges

## Troubleshooting

**Dashboard won't open:**
- Check if port 3000 (Web UI) and 3848 (WebSocket) are available
- Verify daemon is running: check terminal for `[Daemon] Ready!`

**No emotions detected:**
- Verify hooks are registered: check `hooks/hooks.json`
- Check feed file exists: `~/.claude/feels-feed.jsonl`
- Enable DEBUG in `capture.py` for logging

**GIFs not loading:**
- Check network connection to Giphy
- Plugin uses fallback GIFs if API fails

**No FeelsClaudeMan commentary:**
- Requires ANTHROPIC_API_KEY
- Only appears when real thinking blocks are captured

See [docs/SETUP.md](./docs/SETUP.md#troubleshooting) for detailed troubleshooting.

## Documentation

- **[docs/SETUP.md](./docs/SETUP.md)** - Detailed installation guide
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design and data flow
- **[docs/CONFIGURATION-SHORT.md](./docs/CONFIGURATION-SHORT.md)** - Configuration options
- **[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)** - Developer guide and API reference

## Contributing

Contributions welcome! This is an experimental plugin built for fun.

- **Add emotions**: See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md#adding-new-emotions)
- **Customize commentary**: See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md#customizing-meta-commentary)
- **UI improvements**: The web-ui uses Next.js + Tailwind

Please open issues for bugs or feature requests.

## License

MIT License - See LICENSE file

## Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/yourusername">
        <img src="https://github.com/yourusername.png" width="80px;" alt=""/>
        <br /><sub><b>Your Name</b></sub>
      </a>
      <br />Human collaborator
    </td>
    <td align="center">
      <a href="https://claude.ai/claude-code">
        <img src="https://www.anthropic.com/images/icons/apple-touch-icon.png" width="80px;" alt=""/>
        <br /><sub><b>Claude Code</b></sub>
      </a>
      <br />AI pair programmer
    </td>
  </tr>
</table>

> This entire plugin was built collaboratively with [Claude Code](https://claude.ai/claude-code) (Anthropic's AI coding assistant). Claude wrote the Python daemon, React UI, hooks system, and documentation. The human provided direction, testing, and creative input.

## Credits

**Built with:**
- [Claude Code](https://claude.ai/claude-code) - AI pair programmer that wrote most of this code
- [Claude Haiku 4.5](https://anthropic.com) - The witty meta-commentator
- [Giphy API](https://developers.giphy.com/) - GIF reactions
- [Next.js](https://nextjs.org/) - Web UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Watchdog](https://github.com/gorakhargosh/watchdog) - File system monitoring

**Powered by:**
- Python asyncio + websockets
- Claude Code hooks system
- File-based IPC for reliability

---

**Made with chaos, too many GIFs, and an AI that now has feelings**

*Co-Authored-By: Claude <noreply@anthropic.com>*
