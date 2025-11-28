# FeelsClaudeMan - Claude Code Emotion & Meme Plugin

## Vision
Turn Claude's inner monologue into a meme-worthy reality show. This plugin captures Claude's reasoning/emotional states during coding sessions and displays perfectly-timed Giphy memes in a live browser UI, creating shareable viral moments.

---

## Architecture Overview

```
+------------------+     +-------------------+     +------------------+
|  Claude Code     |     |  MCP Server       |     |  Next.js Web UI  |
|  (Hooks)         |---->|  (Node.js)        |---->|  (Browser)       |
+------------------+     +-------------------+     +------------------+
        |                       |                        |
   PostToolUse            SQLite + Giphy           WebSocket live
   Stop, SessionStart     Emotion Detection        meme updates
```

---

## Plugin Structure

```
feelsclaudeman/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── .mcp.json                    # MCP server config
├── hooks/
│   ├── hooks.json               # Hook registration
│   └── capture.py               # Ultra-fast Python hook (<30ms)
├── mcp-server/
│   ├── package.json
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── server.ts            # MCP tools + HTTP listener
│   │   ├── emotion/
│   │   │   ├── detector.ts      # Orchestrator (pattern/claude/hybrid)
│   │   │   ├── pattern.ts       # Fast regex matching
│   │   │   ├── claude.ts        # Claude self-introspection
│   │   │   └── transitions.ts   # Viral moment detection
│   │   ├── giphy/
│   │   │   └── client.ts        # Giphy API + caching
│   │   ├── db/
│   │   │   └── client.ts        # SQLite (better-sqlite3)
│   │   └── websocket/
│   │       └── server.ts        # Real-time to UI
├── web-ui/
│   ├── package.json
│   ├── src/
│   │   ├── app/
│   │   │   └── page.tsx         # Main dashboard
│   │   ├── components/
│   │   │   ├── MemeDisplay.tsx  # Hero GIF display
│   │   │   ├── EmotionStream.tsx
│   │   │   ├── ViralAlert.tsx   # Full-screen viral moments
│   │   │   └── Timeline.tsx
│   │   └── hooks/
│   │       └── useWebSocket.ts
├── commands/
│   ├── dashboard.md             # /feels-dashboard
│   └── status.md                # /feels-status
└── scripts/
    └── setup.sh                 # Install dependencies
```

---

## Emotion System: MAXIMUM CREATIVE FREEDOM

### Core Philosophy: Let Claude Be Claude
Instead of rigid emotion categories, Claude has **complete creative freedom** to express itself through GIFs. The system captures Claude's actual internal state and lets it pick ANY search term that feels right in the moment.

### How It Works

**Claude generates its own GIF search in real-time:**
```
"Based on what just happened, what GIF perfectly captures this moment?
Don't pick from a list - describe the EXACT vibe, meme, or feeling.
Be specific, be weird, be hilarious. Examples:
- 'cat falling off table in slow motion'
- 'man staring at math equations meme'
- 'dramatic chipmunk'
- 'confused travolta pulp fiction'
- 'elmo fire chaos'
- 'astronaut always has been meme'
- 'sad pablo escobar waiting'
- 'michael scott no god please no'
- 'this is fine dog'
- 'surprised pikachu face'
- 'confused nick young meme'
- 'why not both taco girl'
- 'shut up and take my money'
- 'distracted boyfriend meme'
- 'they had us in the first half'
- 'visible confusion anakin'
- 'laughing then crying'
- 'stress level midnight'
- 'internally screaming'
- 'chefs kiss perfection'

What's YOUR perfect GIF for this moment?"
```

### Emotion Categories (Loose Guidelines, Not Rules)

**Victory & Success**
- nailed_it, big_brain, galaxy_brain, victory_lap, mic_drop, chefs_kiss
- flexing, celebration, winning, smooth_operator, clutch_play
- "lebron celebration", "rock eyebrow raise", "vince mcmahan falling"

**Chaos & Struggle**
- this_is_fine, everything_is_fine, chaos_mode, dumpster_fire
- controlled_chaos, organized_mess, beautiful_disaster
- "elmo fire", "plane crash walk away", "spongebob fire"

**Confusion & Processing**
- loading, buffering, 404_brain, math_lady, processing
- does_not_compute, visible_confusion, wait_what
- "john travolta confused", "blinking white guy", "math calculations"

**Frustration & Pain**
- internal_screaming, external_screaming, facepalm, double_facepalm
- table_flip, rage_quit, keyboard_smash, why_god_why
- "michael scott no", "darth vader noooo", "crying jordan"

**Discovery & Realization**
- eureka, mind_blown, plot_twist, wait_a_minute, oh_snap
- the_prophecy, it_all_makes_sense, galaxy_brain_moment
- "sudden clarity clarence", "always has been", "he's beginning to believe"

**Anticipation & Suspense**
- sweating, nervous_laughter, hold_my_beer, here_we_go
- brace_yourselves, this_gonna_be_good, popcorn_ready
- "michael jackson popcorn", "dis gonna be good", "buckle up"

**Sass & Attitude**
- sassy, unbothered, main_character, built_different
- watch_and_learn, hold_my_coffee, amateur_hour
- "kermit sipping tea", "smug face", "sunglasses deal with it"

**Existential & Philosophical**
- staring_into_void, existence_is_pain, its_all_connected
- we_live_in_a_simulation, everything_everywhere
- "sad keanu", "thinking man statue", "void stare"

**Rare & Legendary (Auto-Detected)**
- `one_punch_solution` - Fixed complex bug with single line
- `butterfly_effect` - Tiny change fixed everything
- `speedrun_any%` - Completed task impossibly fast
- `archaeologist` - Found ancient legacy code
- `time_traveler` - Found own old code/comments
- `rubber_duck_moment` - Solved while explaining
- `coffee_kicked_in` - Sudden productivity burst
- `3am_coding` - Late night debugging energy
- `stack_overflow_prophet` - Found exact answer online
- `merge_conflict_survivor` - Resolved nightmare conflict

### ZERO RESTRICTIONS MODE

**Philosophy: Claude says what Claude feels. Period.**

No filtering. No sanitization. No "approved list." Claude generates ANY search term it wants based on the moment. The raw, unfiltered emotional truth.

**The Prompt (Unrestricted):**
```
You just experienced something. Express it as a GIF search.

Rules: THERE ARE NO RULES.

- Be weird
- Be specific
- Be obscure
- Be mainstream
- Be chaotic
- Be peaceful
- Be absurd
- Be profound
- Be cringe
- Be based
- BE YOURSELF

Don't think about what's "appropriate" - think about what EXACTLY captures this moment.

Examples of the energy we want:
- "that one specific scene where squidward stares out the window"
- "me explaining to my mass why I mass"
- "when the imposter is sus"
- "void screaming into void"
- "aggressive jazz hands"
- "menacing aura jojo"
- "windows xp shutdown sound but its a gif"
- "local man ruins everything"
- "friendship ended with X now Y is my best friend"
- "we do a little trolling"
- "its free real estate"
- "understandable have a nice day"
- "directed by robert b weide"
- "to be continued jojo"
- "curb your enthusiasm theme"
- "ah shit here we go again"
- "first time? hanging meme"
- "you guys are getting paid?"
- "wait its all X always has been"
- "signature look of superiority"
- "what if we mass X... haha just kidding... unless?"
- "why are you booing me im right"
- "they dont know meme"
- "wojak crying behind mask"
- "gigachad yes"
- "doge vs cheems"
- "monke"

What does THIS moment feel like? Say it. Search it. Display it.
```

### Intensity: ALSO UNFILTERED

Claude picks intensity 1-10 based on how STRONGLY it feels:
- **1-2**: "meh" - small corner GIF
- **3-4**: "notable" - sidebar display
- **5-6**: "mood" - main display
- **7-8**: "BIG mood" - large display + effects
- **9**: "I NEED EVERYONE TO SEE THIS" - fullscreen
- **10**: "WITNESS ME" - fullscreen + screen effects + sound + confetti/fire/chaos

### Multi-GIF Moments

Sometimes one GIF isn't enough. Claude can request:
- **Sequence**: GIF1 → GIF2 → GIF3 (story arc)
- **Split screen**: Two GIFs side by side (internal conflict)
- **Rapid fire**: Multiple GIFs cycling fast (chaos mode)
- **Layered**: GIF with another GIF overlaid (inception vibes)

### The Raw Emotion Log

Every GIF request gets logged with:
```json
{
  "timestamp": "...",
  "search_term": "skeleton waiting meme",
  "why": "waiting for npm install since the dawn of time",
  "intensity": 7,
  "context": "npm install running for 45 seconds",
  "thinking_excerpt": "This is taking forever...",
  "tool": "Bash",
  "success": null,  // still running
  "claude_internal_state": "patient but dying inside"
}
```

### No Giphy Rating Filter

Default Giphy searches use `rating=pg` but we're setting:
```
rating=r  // or no rating filter at all
```

Let Claude find the GIF that fits. Trust the process.

### Fallback Creativity

If Giphy doesn't find the exact search, Claude gets to:
1. Try a related search
2. Describe what GIF SHOULD exist
3. Request a text overlay on a generic GIF
4. Just display the search term itself as art

### The Ultimate Creative Freedom Prompt

```
MOMENT: {tool} {result}
CONTEXT: {recent_transcript}
YOUR THINKING: {thinking_block}

How do you FEEL right now? Not how should you feel. How DO you feel?

Express it as:
1. gif_search: (any string, be creative, be specific, be weird)
2. intensity: (1-10, how much do you NEED to express this)
3. vibe_check: (one sentence of internal monologue)
4. optional_caption: (if you want text on the GIF)
5. optional_sound: (describe a sound that fits)
6. display_mode: (normal/fullscreen/split/sequence/chaos)

GO. BE FREE. EXPRESS YOURSELF.
```

---

## Detection Modes (User Configurable)

### 1. Pattern Matching (Fast, <10ms)
```python
PATTERNS = {
    "nailed_it": [r"tests? pass", r"build succeeded", r"0 errors"],
    "facepalm": [r"typo", r"missing semicolon", r"forgot to import"],
    "this_is_fine": [r"error.*proceed", r"warning.*ignore"],
    "sweating": [r"rm -rf", r"DROP TABLE", r"--force push"]
}
```

### 2. Claude-Powered (Accurate, 1-3s)
Prompt-based hook asks Claude to introspect:
```
"Based on tool result, what's your emotional state?
- big_brain: Feeling clever
- this_is_fine: Everything's on fire but proceeding
- eureka: AHA moment
Respond with emotion + intensity (1-10)"
```

### 3. Hybrid (Default)
- Pattern match first (fast)
- If confidence < 0.7, escalate to Claude
- Best balance of speed and accuracy

---

## Viral Moment Detection

Track emotional transitions for maximum shareability:

| Sequence | Name | Virality |
|----------|------|----------|
| frustrated → eureka | "The Struggle Bus Arrives" | 10/10 |
| this_is_fine → nailed_it | "Against All Odds" | 10/10 |
| big_brain → facepalm | "Hubris" | 10/10 |
| sweating → relief | "YOLO Success" | 9/10 |
| facepalm x3 | "Triple Facepalm" | 10/10 |

When detected: Full-screen alert with side-by-side GIFs, share button.

---

## SQLite Schema - Full Thought Archive

**Philosophy: Save EVERYTHING about what Claude was thinking, but just the GIF URL (not the image itself)**

```sql
-- Core thoughts/emotions table - THE MAIN EVENT
CREATE TABLE thoughts (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- What Claude was DOING
    tool_name TEXT,                    -- 'Bash', 'Edit', 'Read', etc.
    tool_input TEXT,                   -- What was the command/action
    tool_result TEXT,                  -- What happened (truncated if huge)
    tool_success BOOLEAN,              -- Did it work?

    -- What Claude was THINKING (the gold)
    thinking_block TEXT,               -- Full extended thinking content
    reasoning TEXT,                    -- Why Claude chose this action
    internal_monologue TEXT,           -- Claude's vibe check / inner voice

    -- The GIF expression
    gif_search TEXT,                   -- What Claude searched for
    gif_url TEXT,                      -- Just the URL! Not the image!
    gif_title TEXT,                    -- Giphy's title for the GIF
    gif_id TEXT,                       -- Giphy ID for reference
    intensity INTEGER,                 -- 1-10 how strong the feeling
    display_mode TEXT,                 -- 'normal'|'fullscreen'|'split'|'sequence'|'chaos'
    caption TEXT,                      -- Optional text overlay

    -- Context
    prompt_excerpt TEXT,               -- What the user asked (relevant part)
    conversation_context TEXT,         -- Recent conversation summary
    error_message TEXT,                -- If there was an error

    -- For browsing/filtering
    tags TEXT,                         -- JSON array of auto-generated tags
    is_viral_moment BOOLEAN DEFAULT FALSE,
    is_rare_emotion BOOLEAN DEFAULT FALSE
);

-- Sessions table for grouping
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    project_dir TEXT,
    total_thoughts INTEGER DEFAULT 0,
    dominant_vibe TEXT,                -- Most common emotion
    highlight_thought_id INTEGER,      -- Best moment of the session
    summary TEXT                       -- Auto-generated session summary
);

-- Viral moments (special sequences worth highlighting)
CREATE TABLE viral_moments (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    sequence_name TEXT,                -- "The Struggle Bus Arrives"
    thought_ids TEXT,                  -- JSON array of thought IDs in sequence
    virality_score INTEGER,
    shared BOOLEAN DEFAULT FALSE,
    share_url TEXT
);

-- Achievements
CREATE TABLE achievements (
    id INTEGER PRIMARY KEY,
    achievement_id TEXT UNIQUE,
    unlocked_at DATETIME,
    unlocked_by_thought_id INTEGER     -- Which thought triggered it
);

-- Indexes for fast browsing
CREATE INDEX idx_thoughts_session ON thoughts(session_id);
CREATE INDEX idx_thoughts_timestamp ON thoughts(timestamp DESC);
CREATE INDEX idx_thoughts_tool ON thoughts(tool_name);
CREATE INDEX idx_thoughts_intensity ON thoughts(intensity);
CREATE INDEX idx_thoughts_viral ON thoughts(is_viral_moment);
```

### What Gets Saved Per Thought

Every single tool use captures:

```json
{
  "id": 42,
  "session_id": "sess_abc123",
  "timestamp": "2024-01-15T14:32:01Z",

  "tool_name": "Bash",
  "tool_input": "npm test",
  "tool_result": "FAIL src/utils.test.ts\n  ✕ should validate email (3ms)\n  Expected: true\n  Received: false",
  "tool_success": false,

  "thinking_block": "Let me run the tests to see if my changes work... I'm pretty confident this regex should handle all email formats now. The previous version was missing the + character handling.",
  "reasoning": "Running tests after modifying the email validation regex",
  "internal_monologue": "oh no. oh no no no. I was SO confident.",

  "gif_search": "confident to confused pipeline meme",
  "gif_url": "https://media.giphy.com/media/xxx/giphy.gif",
  "gif_title": "Confused Math Lady",
  "gif_id": "abc123xyz",
  "intensity": 7,
  "display_mode": "normal",
  "caption": "the tests will pass (the tests did not pass)",

  "prompt_excerpt": "fix the email validation bug",
  "conversation_context": "User reported emails with + signs weren't validating",
  "error_message": "Expected: true, Received: false",

  "tags": ["test_failure", "confidence_before_fall", "regex"],
  "is_viral_moment": false,
  "is_rare_emotion": false
}
```

### Browsing the Thought Archive

The UI lets you:
1. **Timeline view** - Scroll through all thoughts chronologically
2. **Filter by emotion** - Show only "frustrated" moments
3. **Filter by tool** - Show only Bash commands
4. **Filter by intensity** - Show only 8+ intensity moments
5. **Search thoughts** - Full text search on thinking/reasoning
6. **Jump to viral moments** - See the highlight reel
7. **Session replay** - Watch a session unfold like a movie

### Storage Efficiency

- **GIF URLs only** - No image storage, just URLs (~100 bytes each)
- **Thinking blocks** - Full text, but typically 100-500 chars
- **Tool results** - Truncated to 2000 chars max
- **Estimated size**: ~2KB per thought, ~200KB per hour of coding
- **Totally sustainable** for long-term archiving

---

## Hook Configuration

**hooks/hooks.json:**
```json
{
  "hooks": {
    "PostToolUse": [{
      "hooks": [{
        "type": "command",
        "command": "py ${CLAUDE_PLUGIN_ROOT}/hooks/capture.py posttooluse",
        "timeout": 5
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "py ${CLAUDE_PLUGIN_ROOT}/hooks/capture.py stop",
        "timeout": 10
      }]
    }],
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "py ${CLAUDE_PLUGIN_ROOT}/hooks/capture.py sessionstart",
        "timeout": 5
      }]
    }]
  }
}
```

**Key Design**: Hooks are ultra-fast (<30ms). They fire-and-forget HTTP POST to MCP server, don't wait for response.

---

## MCP Server (.mcp.json)

```json
{
  "feelsclaudeman": {
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/mcp-server/build/index.js"],
    "env": {
      "PORT": "3847",
      "GIPHY_API_KEY": "${GIPHY_API_KEY}",
      "DB_PATH": "${CLAUDE_PLUGIN_ROOT}/data/emotions.db"
    }
  }
}
```

**MCP Tools Exposed:**
- `get_current_emotion` - Query current state
- `get_emotion_history` - Session history
- `set_detection_mode` - Switch pattern/claude/hybrid

---

## Web UI Features

### Main Dashboard
- **Hero GIF Display** - Large, prominent current emotion meme
- **Intensity Bar** - Visual intensity meter (with fire animation for this_is_fine)
- **Timeline** - Scrolling emotion history
- **Session Stats** - Dominant emotion, volatility score, achievements

### Visual Effects
| Emotion | Effect |
|---------|--------|
| `frustrated` (>7) | Screen shake |
| `nailed_it` | Confetti |
| `this_is_fine` | Fire border |
| `big_brain` | Matrix rain |
| Rare unlock | Achievement popup + special animation |

### Social Sharing
- Single GIF + caption export
- Viral moment video clips (side-by-side transition)
- Session highlights reel
- Copy to clipboard, Twitter/Discord share

---

## Achievements (Gamification)

| Achievement | Condition |
|-------------|-----------|
| "First Blood" | First emotion detected |
| "Emotional Rollercoaster" | 5 different emotions in 1 session |
| "The Comeback Kid" | frustrated(9+) → nailed_it(9+) |
| "Chaos Goblin" | 10+ this_is_fine in one session |
| "The Rare One" | Unlock 404_brain |

---

## Execution Strategy - Skills, Subagents & Documentation

### Tools & Skills We're Using

**Frontend Design Skill** (`frontend-design:frontend-design`)
- Design the UI to match Claude's website aesthetic
- Clean, minimal, professional look
- Proper typography, spacing, and color palette
- The GIF display should feel native to Claude's interface

**Documentation Generator** (`documentation-generator:technical-writer`)
- Create comprehensive docs explaining:
  - Why we chose each architectural decision
  - The planning process and alternatives considered
  - How to extend/modify the plugin
  - Troubleshooting guide

**Plugin Development Skills**
- `plugin-dev:plugin-structure` - Proper plugin scaffold
- `plugin-dev:hook-development` - Hook implementation
- `plugin-dev:mcp-integration` - MCP server setup

**Subagents for Parallel Work**
- `feature-dev:code-architect` - Design component architecture
- `pr-review-toolkit:code-reviewer` - Review code quality
- `Explore` agents - Research existing patterns

---

## Implementation Phases (Detailed)

### Phase 1: Foundation & Documentation Setup
**Goal**: Scaffold + document everything from the start

1. **Create plugin structure** using `plugin-dev:plugin-structure` skill
   - `.claude-plugin/plugin.json`
   - Directory structure
   - Basic configuration

2. **Initialize documentation** using `documentation-generator:technical-writer`
   - `docs/ARCHITECTURE.md` - System design decisions
   - `docs/PLANNING.md` - Why we chose what we chose
   - `docs/SETUP.md` - Installation guide
   - `docs/DEVELOPMENT.md` - How to extend

3. **SQLite schema** with migration scripts
   - Full thought archive tables
   - Indexes for browsing

### Phase 2: Hook System
**Goal**: Capture Claude's thoughts with minimal latency

1. **Hook configuration** using `plugin-dev:hook-development` skill
   - `hooks/hooks.json` - Event registration
   - PostToolUse, Stop, SessionStart, SessionEnd

2. **Ultra-fast capture script**
   - `hooks/capture.py` - Fire-and-forget design
   - Transcript parsing for thinking blocks
   - Async HTTP to MCP server

3. **Document hook decisions**
   - Why we chose these events
   - Latency considerations
   - Data flow diagrams

### Phase 3: MCP Server Backend
**Goal**: Central brain for emotion detection + Giphy

1. **MCP server setup** using `plugin-dev:mcp-integration` skill
   - Node.js/TypeScript server
   - HTTP listener for hooks
   - WebSocket for UI

2. **Emotion detection system**
   - Pattern matching (fast path)
   - Claude-powered (accurate path)
   - Hybrid orchestrator
   - ZERO RESTRICTIONS creative freedom prompts

3. **Giphy integration**
   - API client with caching
   - No rating filter (unfiltered)
   - Fallback search strategies

4. **SQLite operations**
   - Thought insertion
   - Session management
   - Query APIs for browsing

### Phase 4: Web UI - Claude-Style Design
**Goal**: Beautiful interface matching Claude's aesthetic

1. **Use `frontend-design:frontend-design` skill** for:
   - Overall layout matching Claude website
   - Clean, minimal design language
   - Proper component architecture

2. **Core components**
   - `MemeDisplay.tsx` - Hero GIF with Claude-style card
   - `ThoughtTimeline.tsx` - Scrollable history
   - `ThinkingPanel.tsx` - Show Claude's reasoning
   - `IntensityMeter.tsx` - Visual intensity bar
   - `ViralAlert.tsx` - Fullscreen moment display

3. **Real-time features**
   - WebSocket connection hook
   - Live GIF updates
   - Smooth animations

4. **Browsing interface**
   - Session selector
   - Filter controls
   - Search functionality
   - Session replay

### Phase 5: Entertainment & Polish
**Goal**: Viral moments, achievements, effects

1. **Viral moment detection**
   - Transition tracking state machine
   - Sequence pattern matching
   - Auto-highlight generation

2. **Achievement system**
   - Unlock tracking
   - Popup notifications
   - Achievement gallery

3. **Visual effects**
   - Screen shake (frustration)
   - Confetti (success)
   - Fire border (this_is_fine)
   - Fullscreen takeover (intensity 10)

4. **Social sharing**
   - Export single moments
   - Session highlights
   - Share cards

### Phase 6: Final Documentation
**Goal**: Complete docs for understanding & extending

1. **Architecture documentation**
   - System diagrams
   - Data flow explanations
   - Component relationships

2. **Decision log**
   - Why Next.js over alternatives
   - Why SQLite over other DBs
   - Why MCP server architecture
   - Why zero-restriction GIF selection

3. **User guide**
   - Installation steps
   - Configuration options
   - Troubleshooting

4. **Developer guide**
   - How to add new emotions
   - How to customize UI
   - How to extend detection
   - API reference

---

## Documentation Structure

```
docs/
├── README.md                 # Quick start
├── ARCHITECTURE.md           # System design & diagrams
├── PLANNING.md              # Planning process & decisions
│   ├── Why we chose X over Y
│   ├── Alternatives considered
│   ├── Trade-offs made
│   └── Future possibilities
├── SETUP.md                 # Installation guide
├── CONFIGURATION.md         # All config options
├── DEVELOPMENT.md           # Extending the plugin
│   ├── Adding emotions
│   ├── Customizing UI
│   ├── API reference
│   └── Contributing
├── TROUBLESHOOTING.md       # Common issues & fixes
└── CHANGELOG.md             # Version history
```

### What PLANNING.md Will Contain

```markdown
# FeelsClaudeMan - Planning & Decision Log

## The Vision
How we went from "noisy terminal" to "AI emotion meme machine"

## Architecture Decisions

### Why Claude Code Plugin?
- Direct access to Claude's tool usage
- Hook system for real-time capture
- MCP integration for external services
- Compared to: browser extension, standalone app, VS Code extension

### Why Next.js for UI?
- Fast development with React
- Built-in API routes if needed
- Great for real-time updates
- Compared to: Svelte, Vue, plain HTML

### Why SQLite?
- Zero setup, file-based
- Fast for local queries
- Portable database file
- Compared to: PostgreSQL, MongoDB, JSON files

### Why MCP Server Architecture?
- Persistent process alongside Claude
- Can expose tools to Claude itself
- Centralized logic
- Compared to: direct hook processing, external API

### Why Zero-Restriction GIF Selection?
- Maximum creative expression
- Authentic emotional capture
- Viral potential from unexpected choices
- Compared to: curated emotion list, filtered content

## Implementation Journey
[Auto-generated as we build - documenting each step]
```

---

## UI Design: Claude-Style Aesthetic

### Design Principles (from Claude website)
- **Clean white/light backgrounds**
- **Subtle shadows and borders**
- **Rounded corners on cards**
- **Orange/coral accent color** (#da7756 or similar)
- **Clean sans-serif typography**
- **Generous whitespace**
- **Minimal, purposeful animations**

### Layout Concept
```
┌─────────────────────────────────────────────────────────────┐
│  FeelsClaudeMan                              [Settings] [?] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              [CURRENT GIF - LARGE]                  │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  "oh no. oh no no no. I was SO confident."                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 7/10                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💭 Thinking                                         │   │
│  │ "Let me run the tests to see if my changes work..." │   │
│  │                                                     │   │
│  │ 🔧 Action: npm test                                 │   │
│  │ ❌ Result: FAIL - Expected true, Received false     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Timeline                                    [Filter ▼]     │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│  │ 😊 │ │ 🤔 │ │ 😤 │ │ 💡 │ │ 😰 │ │ 🎉 │ │ NOW│        │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `GIPHY_API_KEY` | Required - Get from developers.giphy.com |
| `ANTHROPIC_API_KEY` | For Claude detection mode (optional) |
| `FEELS_PORT` | MCP server port (default: 3847) |
| `FEELS_UI_PORT` | Web UI port (default: 3848) |
| `FEELS_DETECTION_MODE` | pattern/claude/hybrid (default: hybrid) |
| `FEELS_AUTO_LAUNCH` | Auto-open browser on session start (default: true) |

---

## Extended Thinking Capture

The plugin will capture Claude's extended thinking content (when available) for richer emotion analysis:

**Sources to Analyze:**
1. **Tool Results** - Success/failure, error messages
2. **Extended Thinking Blocks** - Claude's internal reasoning
3. **Tool Selection Patterns** - What tools Claude chooses and why
4. **Transcript Context** - Full conversation flow

**Thinking → Emotion Mapping:**
| Thinking Pattern | Detected Emotion |
|------------------|------------------|
| "Let me try a different approach..." | `determined` / `frustrated` |
| "Interesting, I didn't expect..." | `plot_twist` / `curious` |
| "Ah, I see the issue now..." | `eureka` |
| "This is more complex than..." | `confused_math` |
| "Perfect, that worked!" | `nailed_it` |
| "Hmm, this keeps failing..." | `this_is_fine` |

The PostToolUse hook will read the transcript to capture both tool results AND any thinking content preceding the action.

---

## Commands

- `/feels-dashboard` - Open web UI in browser
- `/feels-status` - Show current emotion in terminal
- `/feels-history` - Show recent emotion timeline

---

## Critical Files to Create First

1. **`.claude-plugin/plugin.json`** - Plugin manifest
2. **`hooks/hooks.json`** - Hook registration
3. **`hooks/capture.py`** - Ultra-fast hook script
4. **`mcp-server/src/index.ts`** - MCP server entry
5. **`mcp-server/src/emotion/pattern.ts`** - Pattern matching
6. **`web-ui/src/app/page.tsx`** - Main dashboard
7. **`web-ui/src/hooks/useWebSocket.ts`** - Real-time connection
