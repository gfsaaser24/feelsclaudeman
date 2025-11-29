# FeelsClaudeMan

> When your AI pair programmer starts having emotions and you're not sure if that's a feature or a cry for help

<p align="center">
  <img src="https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif" width="400" alt="This is fine">
</p>

---

## What The Hell Is This

You ever wonder what Claude is *actually* thinking while it's fixing your spaghetti code at 3am? Now you can watch it have a full emotional breakdown in real-time, complete with perfectly-timed GIFs.

**FeelsClaudeMan** captures Claude's inner monologue, runs it through an emotion detector, and broadcasts the results to a live dashboard. It's like a reality TV show, except the star is an AI and the drama is whether your regex will compile.

### Features That Slap

<img src="https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif" width="250" align="right" alt="Coding intensifies">

- **Real-time emotion tracking** - Watch Claude go from "excited" to "frustrated" as it discovers your 47 nested ternaries
- **GIF reactions** - Because words can't express the pain of debugging someone's "it works on my machine" code
- **Haiku meta-commentary** - A smaller, sassier Claude watches the big Claude work and provides color commentary like a sports announcer at a disaster
- **Meme-tier searches** - feelsgoodman, feelsbadman, lfg, "why god why" - we got you
- **Achievement system** - Unlock "First Emotional Breakdown" and "Survived 1000 Tool Calls"

## The Vibes

This plugin was built by Claude Code with a human occasionally going "yeah that looks fine" without reading the code. Classic vibe coding. The AI typed, the human vibed. We are not the same.

### Emotions We Track

| Emotion | When It Hits |
|---------|--------------|
| **excited** | Tests pass, features work, the code gods smile |
| **frustrated** | The 47th attempt at fixing that one bug |
| **confused** | "Why does this work? I didn't change anything" |
| **proud** | Successfully refactored without breaking prod |
| **creative** | In the zone, building something actually cool |
| **relieved** | Finally found the missing semicolon |
| **curious** | Exploring a new codebase like it's a crime scene |
| **determined** | "I WILL make this work" energy |

## Architecture (For The Nerds)

```
Claude Code ──► Hooks ──► Feed File ──► Daemon ──► WebSocket ──► Your Browser
                              │
                              └──► SQLite (we're not animals)
```

- **Hooks**: Intercept Claude's thoughts before they disappear into the void
- **Daemon**: Python script that never sleeps, just like your anxiety about deadlines
- **Web UI**: Next.js because we're not savages using vanilla HTML in 2024
- **MCP Server**: For when you want to ask "how's Claude feeling?" programmatically

## Installation

### Prerequisites

- Python 3.9+
- Node.js 18+
- Claude Code CLI
- Admin access (Windows needs symlinks)

### Plugin Structure

Claude Code looks for plugins in `~/.claude/plugins/marketplaces/`. Here's what needs to be where:

```
~/.claude/plugins/marketplaces/feelsclaudeman/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest (tells Claude Code what's here)
├── commands/
│   ├── start.md             # /feelsclaudeman:start
│   ├── stop.md              # /feelsclaudeman:stop
│   ├── status.md            # /feelsclaudeman:status
│   └── dashboard.md         # /feelsclaudeman:dashboard
├── hooks/
│   ├── hooks.json           # Hook definitions
│   ├── capture.py           # PostToolUse hook - captures emotions
│   └── lifecycle.py         # Process management
├── scripts/
│   ├── feels-daemon.py      # Core daemon (shipped, no keys)
│   └── feels-daemon.local.py # YOUR copy with API keys (gitignored)
├── mcp-server/              # MCP server for status queries
├── web-ui/                  # Next.js dashboard
└── data/                    # SQLite database (auto-created)
```

### Step 1: Clone the Repo

```bash
git clone https://github.com/gfsaaser24/feelsclaudeman.git
cd feelsclaudeman
```

### Step 2: Create Marketplace Symlink

Claude Code expects plugins in `~/.claude/plugins/marketplaces/`. You need to symlink your clone there.

**macOS/Linux:**
```bash
ln -s $(pwd) ~/.claude/plugins/marketplaces/feelsclaudeman
```

**Windows (Admin PowerShell):**
```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.claude\plugins\marketplaces\feelsclaudeman" -Target (Get-Location)
```

Or using CMD (Admin):
```cmd
mklink /J "%USERPROFILE%\.claude\plugins\marketplaces\feelsclaudeman" "%CD%"
```

### Step 3: Install Dependencies

```bash
# Python deps
pip install -r requirements.txt

# Web UI deps
cd web-ui && npm install && cd ..

# MCP server deps + build
cd mcp-server && npm install && npm run build && cd ..
```

### Step 4: Configure API Keys

Copy the daemon and add your keys:
```bash
cp scripts/feels-daemon.py scripts/feels-daemon.local.py
```

Edit `scripts/feels-daemon.local.py` and add your keys at the top:
```python
GIPHY_API_KEY = "your-giphy-key"      # Get free at developers.giphy.com
ANTHROPIC_API_KEY = "your-anthropic-key"  # For Haiku commentary
```

The daemon prefers `feels-daemon.local.py` if it exists. This file is gitignored so your keys stay safe.

### Step 5: Restart Claude Code

Close and reopen Claude Code. It should detect the plugin automatically. Verify with:
```
/feelsclaudeman:status
```

## Usage

### Start The Show
```
/feelsclaudeman:start
```

### Watch The Drama
Open http://localhost:3000 and witness an AI having emotions about your code.

### Check Status
```
/feelsclaudeman:status
```

### End The Suffering
```
/feelsclaudeman:stop
```

## Ports

| Service | Port | What It Does |
|---------|------|--------------|
| Daemon WebSocket | 3848 | Streams emotions like Netflix streams disappointment |
| Daemon HTTP | 3849 | REST API for purging your sins |
| Web UI | 3000 | The pretty dashboard |
| MCP Server | 38470 | Status checks for the paranoid |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GIPHY_API_KEY` | Yes | For GIFs. Get one free at [developers.giphy.com](https://developers.giphy.com/) |
| `ANTHROPIC_API_KEY` | No | Enables unhinged Haiku commentary. Worth it. |
| `FEELS_WS_PORT` | No | Default: 3848 |
| `FEELS_HTTP_PORT` | No | Default: 3849 |

## The Haiku Commentary

<img src="https://media.giphy.com/media/l0IylOPCNkiqOgMyA/giphy.gif" width="200" align="right" alt="Chaos">

When you enable Haiku commentary (via API key), you get a second AI watching the first AI work and providing observations like:

> "Claude is attempting to fix a race condition. Bold strategy considering the human wrote this code while apparently having a stroke."

> "Another successful git commit. Somewhere, a senior developer just felt a disturbance in the force."

> "Tests passing on first try? Either this is a historic moment or the tests are lying. Probably lying."

It's like having a chaos goblin narrate your coding sessions.

## Troubleshooting

**Dashboard won't load?**
- Check ports 3000 and 3848 aren't being used by something else
- Try `/feelsclaudeman:status` to see what's actually running

**No emotions showing?**
- Make sure you're actually using Claude Code (talking to yourself doesn't count)
- Check if the hooks are registered in `hooks/hooks.json`

**GIFs not loading?**
- GIPHY_API_KEY not set or invalid
- We have fallbacks but they're boring

**Haiku commentary missing?**
- ANTHROPIC_API_KEY not set
- The feature is optional but your life is less interesting without it

## Disclaimer

This plugin was built almost entirely by AI. The human's contribution was mostly:
- Saying "yeah do that"
- Testing it once
- Calling it "good enough"

**DO NOT:**
- Deploy this to production
- Run this on systems with sensitive data
- Expect this code to be security audited
- Blame us when things get weird

**DO:**
- Have fun watching an AI have feelings
- Share the best GIF moments
- Accept that we're living in the future and it's weird

## Credits

**Built by:**
- Claude Code (the one doing the actual work)
- [@makershelpdesk](https://twitter.com/makershelpdesk) - the human who provided "creative direction" (read: vibes)

**Powered by:**
- Too much caffeine
- The GIPHY API
- Claude Haiku's complete lack of filter
- Websockets and prayers

---

<p align="center">
  <img src="https://media.giphy.com/media/QMHoU66sBXqqLqYvGO/giphy.gif" width="300" alt="Feels good man">
</p>

<p align="center">
  <i>"I didn't choose the vibe coder life. The vibe coder life chose me when I let an AI write my entire plugin."</i>
</p>

<p align="center">
  <b>Co-Authored-By: Claude &lt;noreply@anthropic.com&gt;</b>
</p>
