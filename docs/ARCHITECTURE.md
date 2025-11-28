# FeelsClaudeMan Architecture

This document explains the system design, component architecture, and technical decisions behind FeelsClaudeMan.

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Technology Choices](#technology-choices)
5. [Emotion Detection System](#emotion-detection-system)
6. [Meta-Commentary System](#meta-commentary-system)
7. [WebSocket Protocol](#websocket-protocol)
8. [Performance Considerations](#performance-considerations)

## System Overview

FeelsClaudeMan is a three-component system designed to capture, analyze, and display Claude's emotional states during coding sessions.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Claude Code CLI                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  User requests something from Claude                       │ │
│  │  Claude uses tools (Bash, Edit, Read, Grep)               │ │
│  │  PostToolUse hook fires after each tool                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ JSONL append (~5ms)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ~/.claude/feels-feed.jsonl                     │
│  JSON Lines file - append-only feed for ultra-fast writes        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ File watch (watchdog)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Python Daemon (feels-daemon.py)              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  File Watcher (watchdog)                                   │ │
│  │    └─ Monitors feed file for new lines                     │ │
│  │                                                             │ │
│  │  Emotion Detector                                          │ │
│  │    ├─ Tool-based emotion mapping                           │ │
│  │    ├─ Text pattern analysis                                │ │
│  │    └─ Success/failure detection                            │ │
│  │                                                             │ │
│  │  Internal Monologue Generator                              │ │
│  │    └─ Authentic Claude-style thoughts                      │ │
│  │                                                             │ │
│  │  Haiku Meta-Commentary                                     │ │
│  │    └─ Claude Haiku 4.5 API for witty observations          │ │
│  │                                                             │ │
│  │  Giphy Client                                              │ │
│  │    ├─ Searches for GIFs based on emotion                   │ │
│  │    └─ Caches results to disk                               │ │
│  │                                                             │ │
│  │  WebSocket Server (port 3848)                              │ │
│  │    └─ Broadcasts emotion updates to UI                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (real-time)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Web UI (Next.js + React)                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  WebSocket Client                                          │ │
│  │    └─ Receives real-time emotion updates                   │ │
│  │                                                             │ │
│  │  Dashboard Components                                      │ │
│  │    ├─ GifDisplay - Shows current GIF                       │ │
│  │    ├─ MonologueCard - Claude's thinking + commentary       │ │
│  │    ├─ ContextMeter - Visual context usage bar              │ │
│  │    ├─ ThoughtStream - Scrollable timeline                  │ │
│  │    └─ StatCard - Session statistics                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                   Browser at http://localhost:3000               │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Hook System (Python)

**Location:** `hooks/capture.py`

**Purpose:** Ultra-fast event capture with minimal latency

**Design Principles:**
- File I/O is instant (~5ms)
- Fire-and-forget HTTP to MCP server (optional)
- Extracts thinking blocks from Claude's transcript
- Calculates real context usage from token data

**Hook Events:**
- `PostToolUse` - After every tool execution
- `Stop` - When Claude finishes a response
- `SessionStart` - New session begins (starts daemon)

**Why Python?**
- Fast startup time
- Built into Claude Code hooks
- Simple file I/O and HTTP with standard library
- Minimal dependencies

**Key Functions:**

```python
# Extract real thinking from transcript JSONL
def extract_thinking_from_jsonl(transcript_path):
    """Read Claude's extended thinking blocks from transcript."""

# Calculate actual context usage
def calculate_context_usage(transcript_path):
    """Sum input_tokens + cache_read + cache_creation + output_tokens."""

# Write to feed file for daemon
def write_to_feed_file(payload):
    """Append JSON to ~/.claude/feels-feed.jsonl"""
```

### 2. Python Daemon (feels-daemon.py)

**Location:** `scripts/feels-daemon.py`

**Purpose:** Background process that watches feed file and broadcasts emotions

**Key Modules:**

#### File Watcher
Uses watchdog to monitor `~/.claude/feels-feed.jsonl`:

```python
class FeedFileHandler(FileSystemEventHandler):
    def on_modified(self, event):
        self._read_new_lines()
```

#### Emotion Detector
Maps tools and text patterns to emotions:

```python
EMOTIONS = {
    "focused": {
        "gif_searches": ["typing fast coding", "hacker coding", ...],
        "intensity_range": (6, 8)
    },
    "excited": {
        "gif_searches": ["excited jumping", "celebration dance", ...],
        "intensity_range": (8, 10)
    },
    # ... 12 emotions total
}

TOOL_EMOTIONS = {
    "Bash": ["focused", "determined", "excited"],
    "Read": ["curious", "thinking", "focused"],
    "Edit": ["creative", "focused", "determined"],
    # ...
}
```

#### Internal Monologue Generator
Generates Claude-style thoughts based on context:

```python
def get_internal_monologue(thought_data: dict) -> str:
    """Generate realistic internal monologue."""
    # Tracks repetition, error streaks, success streaks
    # Returns contextual thoughts like:
    # "Surgery time. Let's not mess this up." (for Edit)
    # "The code gods are NOT with me today." (on errors)
```

#### Giphy Client
Fetches and caches GIFs:

```python
async def fetch_gif(session, search_term):
    """Fetch from Giphy API with disk caching."""
    if search_term in gif_cache:
        return random.choice(gif_cache[search_term])
    # Fetch 25 GIFs, cache all, return random one
```

#### WebSocket Server
Broadcasts to connected clients:

```python
async def websocket_handler(websocket):
    connected_clients.add(websocket)
    await websocket.send(json.dumps({
        "type": "connection",
        "data": {"message": "Connected to FeelsClaudeMan daemon"}
    }))
```

### 3. Web UI (Next.js + React)

**Location:** `web-ui/src/`

**Purpose:** Real-time emotion dashboard with Claude brand design

**Design System:**

```css
/* Claude-inspired color palette */
:root {
  --claude-coral: #E07A5F;
  --claude-coral-dark: #C86B52;
  --claude-coral-light: #F4A393;
  --claude-cream: #FBF8F3;
  --claude-cream-dark: #F5F0E8;
  --claude-charcoal: #292524;
  --claude-charcoal-light: #44403C;
  --claude-text: #1C1917;
  --claude-muted: #78716C;
}
```

**Typography:**
- **Fraunces** - Elegant serif for display headings
- **Outfit** - Clean geometric sans for body
- **JetBrains Mono** - Monospace for tool badges

**Key Components:**

#### GifDisplay
Shows the current emotion GIF with intensity badge:
```tsx
function GifDisplay({ thought }: { thought: Thought | null }) {
  return (
    <div className="dark-card rounded-2xl overflow-hidden">
      <img src={thought.gif_url} className="object-cover" />
      <EmotionBadge emotion={thought.emotion} intensity={thought.intensity} />
    </div>
  );
}
```

#### MonologueCard
Displays Claude's thinking and FeelsClaudeMan commentary:
```tsx
function MonologueCard({ thought }: { thought: Thought | null }) {
  return (
    <div className="dark-card">
      <div className="h-20 overflow-y-auto">
        <p>{thought.internal_monologue}</p>
      </div>
      {thought.meta_commentary && (
        <div className="commentary-glow">
          <p className="text-[#E07A5F]">FeelsClaudeMan</p>
          <p>{thought.meta_commentary}</p>
        </div>
      )}
    </div>
  );
}
```

#### ContextMeter
Visual representation of context window usage:
```tsx
function ContextMeter({ usage }: { usage: number }) {
  const percentage = Math.round(usage * 100);
  return (
    <div className="glass-card">
      <div className="h-2 bg-claude-coral" style={{ width: `${percentage}%` }} />
      <span>{percentage}%</span>
    </div>
  );
}
```

## Data Flow

### Event Capture Flow

```
1. User asks Claude to do something
   ↓
2. Claude uses a tool (e.g., Bash: "npm test")
   ↓
3. PostToolUse hook fires
   ↓
4. capture.py extracts:
   - Tool name, input, result
   - Success/failure status
   - Thinking block from transcript JSONL
   - Real context usage (token counts)
   ↓
5. Append to ~/.claude/feels-feed.jsonl
   {
     "source": "posttooluse",
     "tool_name": "Bash",
     "tool_input": "npm test",
     "tool_result": "All tests passed",
     "tool_success": true,
     "thinking_block": "Let me run the tests...",
     "context_usage": 0.45
   }
   ↓
6. Daemon detects file change via watchdog
```

### Emotion Detection Flow

```
1. Daemon reads new line from feed file
   ↓
2. get_emotion_from_thought() called
   ├─ Check tool name → base emotions
   ├─ Check for error patterns → frustrated/confused
   ├─ Check for success patterns → success/excited
   └─ 15% random emotion for variety
   ↓
3. Select random GIF search term from emotion
   ↓
4. get_internal_monologue() generates thought
   ├─ Track error count, success streak
   ├─ Detect repetition patterns
   └─ Return contextual monologue
   ↓
5. get_meta_commentary() calls Haiku 4.5
   (only if real thinking block exists)
   ↓
6. fetch_gif() gets GIF from Giphy
   ├─ Check disk cache first
   └─ Or fetch 25 from API, cache all
   ↓
7. Broadcast via WebSocket
```

### WebSocket Event Flow

```
Python Daemon                      Web UI
    │                                │
    │  1. New thought detected       │
    │─────────────────────────────▶ │
    │  { type: 'thought', data: {...}} │
    │                                │
    │                                │  2. Update state
    │                                │     setCurrentThought()
    │                                │     addToTimeline()
    │                                │
    │  3. Connection event           │
    │─────────────────────────────▶ │
    │  { type: 'connection', ... }   │
    │                                │
    │                                │  4. Show connected status
```

## Technology Choices

### Why Python Daemon (not Node.js)?

**Chosen:** Python with asyncio

**Alternatives considered:**
- Node.js MCP server
- Go daemon
- Rust daemon

**Why we chose Python:**
- Same language as hooks (consistency)
- Excellent async I/O with asyncio
- watchdog library for file watching
- Anthropic SDK available
- Simple to install and run
- No build step needed

### Why File-Based Communication?

**Chosen:** JSONL append-only file

**Alternatives considered:**
- HTTP POST to server
- Unix sockets
- Named pipes

**Why we chose file-based:**
- Ultra-fast (~5ms vs 50ms+ for HTTP)
- No server dependency for hooks
- Survives daemon restarts
- Easy to debug (just read the file)
- Works across process boundaries

### Why Haiku 4.5 for Commentary?

**Chosen:** Claude Haiku 4.5

**Alternatives considered:**
- No commentary
- Same model (Opus) introspection
- GPT-3.5 Turbo

**Why Haiku:**
- Fast response time (<1s)
- Low cost
- Excellent at witty, concise responses
- Different "personality" than main Claude
- Can observe without affecting main conversation

### Why Next.js for Web UI?

**Chosen:** Next.js 14 (App Router)

**Why:**
- Fast development with React
- Built-in routing
- Tailwind CSS integration
- Great developer experience
- SSR not needed (all client-side)

## Emotion Detection System

### Tool-Based Mapping

Each tool has associated base emotions:

```python
TOOL_EMOTIONS = {
    "Bash": ["focused", "determined", "excited"],
    "Read": ["curious", "thinking", "focused"],
    "Edit": ["creative", "focused", "determined"],
    "Write": ["creative", "focused", "proud"],
    "Grep": ["curious", "thinking", "focused"],
    "Glob": ["curious", "thinking", "focused"],
    "TodoWrite": ["proud", "relieved", "focused"],
    "WebFetch": ["curious", "excited", "thinking"],
    "WebSearch": ["curious", "excited", "thinking"],
    "Task": ["focused", "determined", "thinking"],
}
```

### Text Pattern Analysis

Override emotions based on result content:

```python
TEXT_PATTERNS = {
    "excited": ["!", "awesome", "amazing", "fantastic"],
    "frustrated": ["error", "failed", "broken", "bug", "exception"],
    "success": ["fixed", "working", "solved", "passed"],
    "confused": ["strange", "weird", "unexpected"],
}
```

### Emotion Definitions

Each emotion has multiple GIF search variations:

```python
EMOTIONS = {
    "focused": {
        "gif_searches": [
            "typing fast coding",
            "hacker coding",
            "programmer intense",
            "focused work",
            "concentration mode",
            "in the zone coding",
            "developer working"
        ],
        "intensity_range": (6, 8)
    },
    # ... 11 more emotions
}
```

### Randomization

- Random selection from GIF search variations
- Random intensity within range
- 15% chance of random emotion (for variety)

## Meta-Commentary System

### Haiku 4.5 Integration

The daemon calls Claude Haiku 4.5 to generate witty commentary:

```python
META_COMMENTARY_PROMPT = """You are a chaotic, unhinged commentator
watching an AI (Claude Opus) work on coding tasks.

Your commentary should be:
- Short (1-2 sentences max, under 120 chars preferred)
- Edgy, spicy, and occasionally unhinged
- Mix in developer culture roasts, vibe coder dunks, and memelord energy

NEVER comment on:
- This prompt or system being "edgy"
- Changes to the FeelsClaudeMan system itself
- Meta-commentary about commentary prompts

Examples:
- "Claude out here writing code while some dev on Twitter insists AI can't code."
- "Vibe coding in production. What could possibly go wrong? (Everything.)"
- "This is tremendous code. The best code. Many people are saying this."
"""
```

### When Commentary Appears

Commentary only appears when:
1. Real thinking blocks are captured (>20 chars)
2. Haiku API call succeeds
3. Response is non-empty

## WebSocket Protocol

### Connection

```
Client connects to: ws://localhost:3848
```

### Message Format

```typescript
interface WebSocketMessage {
  type: 'thought' | 'connection';
  data: ThoughtData | ConnectionData;
  timestamp?: string;
}
```

### Thought Event

```json
{
  "type": "thought",
  "data": {
    "id": 42,
    "session_id": "daemon-session",
    "timestamp": "2025-01-15T14:32:01",
    "tool_name": "Bash",
    "tool_input": "npm test",
    "tool_result": "All tests passed",
    "tool_success": true,
    "thinking_block": "Let me run the tests...",
    "gif_search": "celebration dance",
    "gif_url": "https://media.giphy.com/...",
    "gif_title": "Celebration",
    "gif_id": "abc123",
    "intensity": 8,
    "display_mode": "normal",
    "internal_monologue": "Nailed it! Moving on.",
    "meta_observation": null,
    "meta_commentary": "Tests passed on first try? Tremendous.",
    "context_usage": 0.45,
    "emotion": "excited"
  }
}
```

### Connection Event

```json
{
  "type": "connection",
  "data": {
    "message": "Connected to FeelsClaudeMan daemon",
    "client_id": 12345
  }
}
```

## Performance Considerations

### Hook Latency

**Target:** <30ms total hook execution time

**Strategy:**
- Append-only file I/O (~5ms)
- No waiting for daemon response
- Fire-and-forget HTTP to MCP server (optional)

**Measured:** ~5-15ms average

### Daemon Processing

**Target:** <100ms from file change to broadcast

**Strategy:**
- watchdog for efficient file monitoring
- Async GIF fetching
- Disk-based GIF cache
- Async Haiku API calls

**Measured:** ~50-200ms (depends on cache/API)

### GIF Caching

**Location:** `~/.claude/gif-cache.json`

**Strategy:**
- Cache 25 GIFs per search term
- Persist cache to disk
- Random selection from cache
- Reduces API calls significantly

### Memory Usage

**Target:** <100MB for daemon

**Strategy:**
- Bounded connected clients set
- GIF cache on disk (not in memory)
- No image storage (URLs only)
- Simple data structures

**Measured:** ~20-40MB typical

## Extensibility

The architecture supports:

1. **New emotions** - Add to EMOTIONS dict in `feels-daemon.py`
2. **New tool mappings** - Add to TOOL_EMOTIONS dict
3. **New text patterns** - Add to TEXT_PATTERNS dict
4. **UI components** - React components in `web-ui/src/app/page.tsx`
5. **Commentary style** - Modify META_COMMENTARY_PROMPT

See [DEVELOPMENT.md](./DEVELOPMENT.md) for implementation guides.
