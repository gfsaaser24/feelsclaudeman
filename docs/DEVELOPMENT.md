# FeelsClaudeMan Development Guide

Guide for extending and customizing FeelsClaudeMan.

## Table of Contents

1. [Adding New Emotions](#adding-new-emotions)
2. [Customizing Meta-Commentary](#customizing-meta-commentary)
3. [Customizing Internal Monologue](#customizing-internal-monologue)
4. [Customizing the UI](#customizing-the-ui)
5. [WebSocket API Reference](#websocket-api-reference)
6. [Testing](#testing)
7. [Contributing](#contributing)

## Adding New Emotions

### Step 1: Add to EMOTIONS Dictionary

**File:** `scripts/feels-daemon.py`

Add your new emotion with GIF search variations and intensity range:

```python
EMOTIONS = {
    # ... existing emotions

    "my_new_emotion": {
        "gif_searches": [
            "search term 1",
            "search term 2",
            "search term 3",
            "search term 4",
            "search term 5"
        ],
        "intensity_range": (5, 8)  # min, max intensity
    }
}
```

**Guidelines:**
- Include 5-7 GIF search variations for variety
- Intensity range should be (min, max) from 1-10
- Higher intensity = more impactful moments

### Step 2: Add Tool Mapping (Optional)

Map specific tools to trigger your emotion:

```python
TOOL_EMOTIONS = {
    # ... existing mappings

    "MyTool": ["my_new_emotion", "focused", "thinking"]
}
```

### Step 3: Add Text Patterns (Optional)

Trigger emotion based on result text:

```python
TEXT_PATTERNS = {
    # ... existing patterns

    "my_new_emotion": ["keyword1", "keyword2", "specific phrase"]
}
```

### Example: Adding "overwhelmed" Emotion

```python
# In EMOTIONS dict
"overwhelmed": {
    "gif_searches": [
        "overwhelmed stressed",
        "too much work",
        "drowning in tasks",
        "head exploding",
        "panic mode"
    ],
    "intensity_range": (7, 9)
}

# In TEXT_PATTERNS dict
TEXT_PATTERNS = {
    # ...
    "overwhelmed": ["too many", "overwhelming", "so much", "endless", "buried"]
}
```

### Step 4: Test Your Emotion

1. Restart the daemon:
   ```bash
   cd scripts
   python feels-daemon.py
   ```

2. Trigger the emotion in Claude Code

3. Watch the dashboard for your new emotion

## Customizing Meta-Commentary

### Modify the System Prompt

**File:** `scripts/feels-daemon.py`

Edit `META_COMMENTARY_PROMPT`:

```python
META_COMMENTARY_PROMPT = """Your custom system prompt here.

Guidelines for the prompt:
- Define the personality/voice
- Specify what to comment on
- What to avoid
- Examples of good commentary

You ONLY output the commentary itself."""
```

### Commentary Style Examples

**Professional/Helpful:**
```python
META_COMMENTARY_PROMPT = """You are a helpful coding companion
observing Claude's work. Provide brief, encouraging observations
about the coding process.

Keep comments:
- Supportive and positive
- Under 100 characters
- Focused on progress

Examples:
- "Making good progress on that feature!"
- "Smart approach to debugging there."
- "Clean code incoming!"
"""
```

**Sarcastic/Funny:**
```python
META_COMMENTARY_PROMPT = """You are a sarcastic coding buddy
watching Claude work. Your commentary should be witty and
self-deprecating about the coding process.

Keep comments:
- Sarcastic but not mean
- Relatable to developers
- Under 120 characters

Examples:
- "Another console.log? Bold debugging strategy."
- "Fixing the fix that fixed the fix. Classic."
- "Works on my machine energy detected."
"""
```

### Disable Commentary Entirely

```python
ENABLE_META_COMMENTARY = False
```

### Using a Different Model

```python
HAIKU_MODEL = "claude-haiku-4-5-20251001"  # Change to another model
```

## Customizing Internal Monologue

### Adding Tool-Specific Thoughts

**File:** `scripts/internal_monologue.py`

Add thoughts for specific tools in `_generate_monologue()`:

```python
tool_thoughts = {
    # ... existing tools

    "MyNewTool": [
        "Thought 1 for this tool.",
        "Thought 2 for this tool.",
        "Thought 3 with more context.",
    ]
}
```

### Adding Streak-Based Thoughts

Modify success/error streak handling:

```python
if success_streak > 5:
    streak_thoughts = [
        "Your custom success streak thought!",
        "Another winning thought here.",
    ]
```

### Adding Meta-Observations

Add rare self-aware thoughts:

```python
observations = [
    "Your philosophical observation here.",
    "Another introspective thought.",
]
```

These appear randomly (15% chance).

## Customizing the UI

### Color Palette

**File:** `web-ui/src/app/globals.css`

Modify the Claude-inspired color variables:

```css
:root {
  --claude-coral: #E07A5F;        /* Primary accent */
  --claude-coral-dark: #C86B52;   /* Darker accent */
  --claude-coral-light: #F4A393;  /* Lighter accent */
  --claude-cream: #FBF8F3;        /* Background */
  --claude-cream-dark: #F5F0E8;   /* Secondary background */
  --claude-charcoal: #292524;     /* Dark elements */
  --claude-charcoal-light: #44403C;
  --claude-text: #1C1917;         /* Body text */
  --claude-muted: #78716C;        /* Muted text */
}
```

### Adding Emotion-Specific Colors

```css
/* Add to globals.css */
.emotion-overwhelmed { --emotion-color: #9333EA; }
.emotion-zen { --emotion-color: #22C55E; }
```

### Modifying Components

**File:** `web-ui/src/app/page.tsx`

#### Add a New Component

```tsx
function MyNewComponent({ data }: { data: SomeType }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="font-display text-lg">{data.title}</h3>
      <p className="text-claude-muted">{data.content}</p>
    </div>
  );
}
```

#### Modify the GIF Display

```tsx
function GifDisplay({ thought }: { thought: Thought | null }) {
  // Add your custom behavior
  if (thought?.intensity >= 9) {
    return (
      <div className="relative">
        {/* Full-screen mode for high intensity */}
        <img src={thought.gif_url} className="w-full animate-pulse" />
      </div>
    );
  }
  // Default display
  // ...
}
```

### Typography

**File:** `web-ui/src/app/layout.tsx`

Modify Google Fonts import:

```tsx
<link
  href="https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap"
  rel="stylesheet"
/>
```

### CSS Effects

**Glassmorphism:**
```css
.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(224, 122, 95, 0.15);
}
```

**Dark card:**
```css
.dark-card {
  background: linear-gradient(135deg, var(--claude-charcoal) 0%, #1C1917 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**Commentary glow:**
```css
.commentary-glow {
  background: linear-gradient(135deg, rgba(224, 122, 95, 0.1) 0%, rgba(224, 122, 95, 0.05) 100%);
  border-left: 3px solid var(--claude-coral);
}
```

## WebSocket API Reference

### Connection

```typescript
const ws = new WebSocket('ws://localhost:3848');
```

### Events

#### connection

Sent on initial connection:

```json
{
  "type": "connection",
  "data": {
    "message": "Connected to FeelsClaudeMan daemon",
    "client_id": 12345
  }
}
```

#### thought

Sent when a new emotion is detected:

```typescript
interface ThoughtEvent {
  type: 'thought';
  data: {
    id: number;
    session_id: string;
    timestamp: string;
    tool_name: string;
    tool_input: string;
    tool_result: string;
    tool_success: boolean;
    thinking_block: string | null;
    gif_search: string;
    gif_url: string;
    gif_title: string;
    gif_id: string;
    intensity: number;
    display_mode: string;
    internal_monologue: string;
    meta_observation: string | null;
    meta_commentary: string | null;
    context_usage: number;
    emotion: string;
  };
}
```

### Client Example

```typescript
const ws = new WebSocket('ws://localhost:3848');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'connection':
      console.log('Connected:', message.data.client_id);
      break;
    case 'thought':
      handleNewThought(message.data);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
  // Implement reconnection logic
};
```

## Testing

### Manual Testing

**Start daemon manually:**
```bash
cd scripts
python feels-daemon.py
```

**Start web UI in dev mode:**
```bash
cd web-ui
npm run dev
```

**Trigger emotions in Claude:**
```
> Run `echo "test"` in bash
> Read the README file
> Fix the typo in line 5
```

**Watch for:**
- GIF appears in dashboard
- Internal monologue shows
- Meta-commentary appears (if thinking captured)
- Timeline updates

### Testing Specific Emotions

**Test frustrated:**
```
> Run a command that will fail
> Try to read a non-existent file
```

**Test success:**
```
> Run `npm test` (if tests pass)
> Fix a bug and verify it works
```

**Test curious:**
```
> Search the codebase for "function"
> Read multiple files
```

### Checking Feed File

```bash
# Watch for new entries
tail -f ~/.claude/feels-feed.jsonl

# Check specific fields
cat ~/.claude/feels-feed.jsonl | python -m json.tool | less
```

### Checking GIF Cache

```bash
# View cached search terms
cat ~/.claude/gif-cache.json | python -m json.tool | head -100
```

### Debug Logging

Enable in `hooks/capture.py`:
```python
DEBUG = True
```

View logs:
```bash
tail -f hooks/.capture_debug.log
```

## Contributing

### Project Structure

```
feelsclaudeman/
├── scripts/
│   ├── feels-daemon.py       # Main daemon process
│   └── internal_monologue.py # Thought generation
├── hooks/
│   ├── capture.py           # PostToolUse hook
│   ├── stop-hook.py         # Stop hook
│   ├── start-daemon.py      # SessionStart hook
│   └── hooks.json           # Hook configuration
├── web-ui/
│   └── src/
│       ├── app/
│       │   ├── page.tsx     # Main dashboard
│       │   ├── layout.tsx   # Layout/fonts
│       │   └── globals.css  # Styles
│       └── types/
│           └── emotions.ts  # TypeScript types
```

### Code Style

**Python:**
```python
def my_function(param: str) -> dict:
    """
    Docstring explaining function.

    Args:
        param: Description of parameter

    Returns:
        Description of return value
    """
    result = do_something(param)
    return {"key": result}
```

**TypeScript/React:**
```tsx
interface Props {
  data: DataType;
  onAction: () => void;
}

function MyComponent({ data, onAction }: Props) {
  const [state, setState] = useState<string>('');

  useEffect(() => {
    // Effect logic
  }, [data]);

  return <div>{data.value}</div>;
}
```

### Pull Request Guidelines

1. **Description** - What changed and why
2. **Testing** - How you tested the changes
3. **Screenshots** - For UI changes
4. **Documentation** - Update docs if needed

**Checklist:**
- [ ] Code runs without errors
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly noted)

## Resources

- **Python asyncio:** https://docs.python.org/3/library/asyncio.html
- **websockets:** https://websockets.readthedocs.io/
- **watchdog:** https://python-watchdog.readthedocs.io/
- **Next.js:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Anthropic API:** https://docs.anthropic.com/
- **Giphy API:** https://developers.giphy.com/docs/api

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [SETUP.md](./SETUP.md) - Installation guide
- [CONFIGURATION-SHORT.md](./CONFIGURATION-SHORT.md) - Configuration options
