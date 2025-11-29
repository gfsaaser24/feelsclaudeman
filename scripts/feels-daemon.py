#!/usr/bin/env python3
"""
FeelsClaudeMan Daemon - Background file watcher + WebSocket broadcaster.

Watches ~/.claude/feels-feed.jsonl for new thoughts.
On new line: parse -> get GIF -> broadcast to WebSocket clients.

This runs continuously in the background, providing near-instant
emotion updates without MCP round-trip overhead.

Requirements: pip install websockets aiohttp watchdog
"""

import asyncio
import json
import sys
import time
import signal
import subprocess
from pathlib import Path
from typing import Set
import queue
import os

# Install dependencies if needed
def ensure_package(package_name):
    try:
        __import__(package_name)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package_name, "-q"])

ensure_package("websockets")
ensure_package("aiohttp")
ensure_package("watchdog")
ensure_package("anthropic")

import websockets
from websockets.server import serve
import aiohttp
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import anthropic


# Configuration
FEED_FILE = Path.home() / ".claude" / "feels-feed.jsonl"
WS_PORT = int(os.environ.get("FEELS_WS_PORT", "3848"))
GIPHY_API_KEY = os.environ.get("GIPHY_API_KEY")  # Required for GIF fetching - get free key at developers.giphy.com
GIPHY_API_URL = "https://api.giphy.com/v1/gifs/search"

# Haiku Meta-Commentary Configuration
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")  # Required for Haiku meta-commentary
HAIKU_MODEL = "claude-haiku-4-5-20251001"
ENABLE_META_COMMENTARY = True  # Set to False to disable Haiku calls

# Initialize Anthropic client
haiku_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

# Database configuration
DB_PATH = Path(os.environ.get("FEELS_DB_PATH", Path(__file__).parent.parent / "data" / "feelsclaudeman.db"))

# Global state
connected_clients: Set[websockets.WebSocketServerProtocol] = set()
message_queue: queue.Queue = queue.Queue()
last_file_size = 0
running = True
db_connection = None  # SQLite connection


import random
import sqlite3


# ============================================================================
# DATABASE LAYER
# ============================================================================

DB_SCHEMA = """
CREATE TABLE IF NOT EXISTS thoughts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    tool_name TEXT,
    tool_input TEXT,
    tool_result TEXT,
    tool_success BOOLEAN,
    thinking_block TEXT,
    internal_monologue TEXT,
    emotion TEXT,
    meta_commentary TEXT,
    meta_observation TEXT,
    context_usage REAL,
    gif_search TEXT,
    gif_url TEXT,
    gif_title TEXT,
    gif_id TEXT,
    intensity INTEGER DEFAULT 5,
    display_mode TEXT DEFAULT 'normal',
    is_viral_moment BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    project_dir TEXT,
    total_thoughts INTEGER DEFAULT 0,
    dominant_emotion TEXT
);

CREATE TABLE IF NOT EXISTS viral_moments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    sequence_name TEXT,
    thought_ids TEXT,
    virality_score INTEGER
);

CREATE INDEX IF NOT EXISTS idx_thoughts_session ON thoughts(session_id);
CREATE INDEX IF NOT EXISTS idx_thoughts_timestamp ON thoughts(timestamp DESC);
"""


def init_database():
    """Initialize SQLite database."""
    global db_connection
    try:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        db_connection = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        db_connection.row_factory = sqlite3.Row
        db_connection.executescript(DB_SCHEMA)
        db_connection.commit()
        print(f"[Database] Initialized at {DB_PATH}", file=sys.stderr)
        return True
    except Exception as e:
        print(f"[Database] Init error: {e}", file=sys.stderr)
        return False


def db_insert_thought(thought_data: dict) -> int:
    """Insert a thought into the database."""
    global db_connection
    if not db_connection:
        return -1

    try:
        cursor = db_connection.cursor()
        cursor.execute("""
            INSERT INTO thoughts (
                session_id, tool_name, tool_input, tool_result, tool_success,
                thinking_block, internal_monologue, emotion, meta_commentary,
                meta_observation, context_usage, gif_search, gif_url, gif_title,
                gif_id, intensity, display_mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            thought_data.get("session_id", "unknown"),
            thought_data.get("tool_name"),
            thought_data.get("tool_input"),
            (thought_data.get("tool_result") or "")[:2000],  # Truncate
            thought_data.get("tool_success", True),
            thought_data.get("thinking_block"),
            thought_data.get("internal_monologue"),
            thought_data.get("emotion"),
            thought_data.get("meta_commentary"),
            thought_data.get("meta_observation"),
            thought_data.get("context_usage"),
            thought_data.get("gif_search"),
            thought_data.get("gif_url"),
            thought_data.get("gif_title"),
            thought_data.get("gif_id"),
            thought_data.get("intensity", 5),
            thought_data.get("display_mode", "normal")
        ))
        db_connection.commit()

        # Update session thought count
        cursor.execute("""
            INSERT INTO sessions (id, total_thoughts) VALUES (?, 1)
            ON CONFLICT(id) DO UPDATE SET total_thoughts = total_thoughts + 1
        """, (thought_data.get("session_id", "unknown"),))
        db_connection.commit()

        return cursor.lastrowid
    except Exception as e:
        print(f"[Database] Insert error: {e}", file=sys.stderr)
        return -1


def db_get_session_stats(session_id: str) -> dict:
    """Get statistics for a session."""
    global db_connection
    if not db_connection:
        return {}

    try:
        cursor = db_connection.cursor()

        # Get total thoughts and emotion counts
        cursor.execute("""
            SELECT emotion, COUNT(*) as count, AVG(intensity) as avg_intensity
            FROM thoughts WHERE session_id = ?
            GROUP BY emotion
        """, (session_id,))

        emotion_counts = {}
        total = 0
        total_intensity = 0
        for row in cursor.fetchall():
            if row["emotion"]:
                emotion_counts[row["emotion"]] = row["count"]
                total += row["count"]
                total_intensity += row["avg_intensity"] * row["count"]

        return {
            "totalThoughts": total,
            "emotionCounts": emotion_counts,
            "avgIntensity": total_intensity / total if total > 0 else 5,
            "viralMoments": 0,
            "dominantEmotion": max(emotion_counts, key=emotion_counts.get) if emotion_counts else "neutral"
        }
    except Exception as e:
        print(f"[Database] Stats error: {e}", file=sys.stderr)
        return {"totalThoughts": 0, "emotionCounts": {}, "avgIntensity": 5, "viralMoments": 0}

# Emotion definitions with multiple GIF search variations
EMOTIONS = {
    "focused": {
        "gif_searches": ["typing fast coding", "hacker coding", "programmer intense", "focused work", "concentration mode", "in the zone coding", "developer working"],
        "intensity_range": (6, 8)
    },
    "curious": {
        "gif_searches": ["curious looking", "investigating detective", "searching clues", "hmm thinking", "sherlock holmes", "magnifying glass search", "exploring discovery", "my guy what", "excuse me what"],
        "intensity_range": (5, 7)
    },
    "creative": {
        "gif_searches": ["lightbulb idea", "creative genius", "brilliant moment", "artist creating", "imagination", "innovation spark", "eureka moment"],
        "intensity_range": (7, 9)
    },
    "excited": {
        "gif_searches": ["excited jumping", "celebration dance", "woohoo yes", "pumped up", "hyped reaction", "amazing wow", "mind blown", "lfg lets go", "lets fucking go", "hype train"],
        "intensity_range": (8, 10)
    },
    "success": {
        "gif_searches": ["victory celebration", "nailed it", "perfect success", "champion winner", "mission accomplished", "high five", "touchdown celebration", "feelsgoodman", "feels good man", "winning"],
        "intensity_range": (8, 10)
    },
    "frustrated": {
        "gif_searches": ["frustrated angry", "facepalm fail", "ugh annoyed", "computer rage", "keyboard smash", "error screen", "not again", "feelsbadman", "feels bad man", "stfu", "send help", "police help", "why god why"],
        "intensity_range": (6, 9)
    },
    "confused": {
        "gif_searches": ["confused math", "what happened", "lost confused", "scratch head", "does not compute", "wait what", "puzzled reaction", "y tho", "but why", "what are you doing", "my guy", "send help confused"],
        "intensity_range": (4, 7)
    },
    "thinking": {
        "gif_searches": ["thinking hard", "brain working", "pondering deep", "contemplating life", "processing thinking", "hmm let me see", "calculating math", "why tho"],
        "intensity_range": (4, 6)
    },
    "determined": {
        "gif_searches": ["determined focus", "lets do this", "bring it on", "ready fight", "game face", "serious mode", "challenge accepted", "lfg", "lets go"],
        "intensity_range": (7, 9)
    },
    "relieved": {
        "gif_searches": ["relief sigh", "finally done", "phew close call", "breath relief", "made it", "survived", "weight off shoulders", "feelsgoodman relief"],
        "intensity_range": (5, 7)
    },
    "playful": {
        "gif_searches": ["playful silly", "having fun", "goofing around", "mischievous smile", "prankster", "cheeky grin", "fun times"],
        "intensity_range": (6, 8)
    },
    "proud": {
        "gif_searches": ["proud moment", "look what I made", "achievement unlocked", "self five", "humble brag", "mic drop", "boss mode", "feelsgoodman proud"],
        "intensity_range": (7, 9)
    }
}

# Tool name to emotion mapping - only use emotions that exist in EMOTIONS dict!
TOOL_EMOTIONS = {
    "Bash": ["focused", "determined", "excited"],
    "Read": ["curious", "thinking", "focused"],
    "Edit": ["creative", "focused", "determined"],
    "Write": ["creative", "focused", "proud"],
    "Grep": ["curious", "thinking", "focused"],
    "Glob": ["curious", "thinking", "focused"],
    "TodoWrite": ["proud", "relieved", "focused"],
    "BashOutput": ["thinking", "curious", "excited"],
    "WebFetch": ["curious", "excited", "thinking"],
    "WebSearch": ["curious", "excited", "thinking"],
    "Task": ["focused", "determined", "thinking"],
}

# Text patterns for emotion detection
TEXT_PATTERNS = {
    "excited": ["!", "awesome", "amazing", "fantastic", "brilliant", "yes!", "woohoo", "incredible", "perfect"],
    "frustrated": ["error", "failed", "failure", "broken", "doesn't work", "issue", "problem", "bug", "exception", "traceback"],
    "success": ["fixed", "working", "solved", "complete", "done", "success", "passed", "works", "correct"],
    "confused": ["strange", "weird", "unexpected", "unclear", "odd", "why", "how come", "doesn't make sense"],
    "creative": ["idea", "design", "build", "create", "new", "implement", "feature"],
    "thinking": ["let me", "hmm", "considering", "analyzing", "checking", "looking at"],
    "determined": ["fix", "solve", "debug", "resolve", "figure out", "need to"],
    "relieved": ["finally", "phew", "at last", "took a while"],
}


def get_emotion_from_thought(thought_data: dict) -> dict:
    """
    Detect emotion from thought data using multiple signals:
    1. Tool name (what action is being taken)
    2. Tool input (intent/what we're trying to do)
    3. Tool result (outcome)
    4. Success/failure status
    """
    tool_name = thought_data.get("tool_name", "")
    tool_input = str(thought_data.get("tool_input", ""))
    tool_result = str(thought_data.get("tool_result", ""))
    tool_success = thought_data.get("tool_success", True)

    combined_text = f"{tool_input} {tool_result}".lower()

    # Start with tool-based emotion
    base_emotions = TOOL_EMOTIONS.get(tool_name, ["focused", "thinking"])
    detected_emotion = random.choice(base_emotions)

    # Check for failure indicators - override with frustrated/confused
    if not tool_success or any(p in combined_text for p in TEXT_PATTERNS["frustrated"]):
        detected_emotion = random.choice(["frustrated", "confused", "determined"])

    # Check for success indicators
    elif any(p in combined_text for p in TEXT_PATTERNS["success"]):
        detected_emotion = random.choice(["success", "excited", "proud", "relieved"])

    # Check for creative work
    elif any(p in combined_text for p in TEXT_PATTERNS["creative"]):
        detected_emotion = random.choice(["creative", "excited", "focused"])

    # Check for exploration/investigation
    elif tool_name in ["Read", "Grep", "Glob", "WebSearch", "WebFetch"]:
        detected_emotion = random.choice(["curious", "thinking", "focused"])

    # Check for completion (TodoWrite with completed)
    elif tool_name == "TodoWrite" and "completed" in combined_text:
        detected_emotion = random.choice(["proud", "success", "relieved"])

    # Add some randomness - occasionally surprise emotions
    if random.random() < 0.35:  # 35% chance of random emotion
        detected_emotion = random.choice(list(EMOTIONS.keys()))

    # Get emotion data with randomization
    emotion_data = EMOTIONS.get(detected_emotion, EMOTIONS["thinking"])
    gif_search = random.choice(emotion_data["gif_searches"])
    intensity = random.randint(*emotion_data["intensity_range"])

    return {
        "emotion": detected_emotion,
        "gif_search": gif_search,
        "intensity": intensity
    }


# GIF cache to reduce API calls - stores multiple GIFs per search term
gif_cache: dict = {}
GIF_CACHE_FILE = Path.home() / ".claude" / "gif-cache.json"

def load_gif_cache():
    """Load GIF cache from disk."""
    global gif_cache
    try:
        if GIF_CACHE_FILE.exists():
            with open(GIF_CACHE_FILE, 'r') as f:
                gif_cache = json.load(f)
                print(f"[Daemon] Loaded {len(gif_cache)} cached search terms", file=sys.stderr)
    except Exception as e:
        print(f"[Daemon] Failed to load cache: {e}", file=sys.stderr)
        gif_cache = {}

def save_gif_cache():
    """Save GIF cache to disk."""
    try:
        with open(GIF_CACHE_FILE, 'w') as f:
            json.dump(gif_cache, f)
    except Exception as e:
        print(f"[Daemon] Failed to save cache: {e}", file=sys.stderr)

async def fetch_gif(session: aiohttp.ClientSession, search_term: str) -> dict:
    """Fetch a GIF from Giphy API with caching."""
    global gif_cache

    # Check cache first
    if search_term in gif_cache and gif_cache[search_term]:
        cached_gifs = gif_cache[search_term]
        gif = random.choice(cached_gifs)
        print(f"[Daemon] Using cached GIF for '{search_term}'", file=sys.stderr)
        return gif

    # Fetch from API
    try:
        params = {
            "api_key": GIPHY_API_KEY,
            "q": search_term,
            "limit": 25,  # Get more to cache
            "rating": "pg-13",
            "lang": "en"
        }
        async with session.get(GIPHY_API_URL, params=params) as response:
            if response.status == 200:
                data = await response.json()
                if data.get("data"):
                    # Cache all results
                    gifs = []
                    for gif_data in data["data"]:
                        gifs.append({
                            "url": gif_data["images"]["original"]["url"],
                            "title": gif_data.get("title", ""),
                            "id": gif_data["id"]
                        })

                    if gifs:
                        gif_cache[search_term] = gifs
                        save_gif_cache()
                        print(f"[Daemon] Cached {len(gifs)} GIFs for '{search_term}'", file=sys.stderr)
                        return random.choice(gifs)
            elif response.status == 429:
                print(f"[Daemon] Rate limited! Using fallback.", file=sys.stderr)
    except Exception as e:
        print(f"[Daemon] GIF fetch error: {e}", file=sys.stderr)

    # Return a fallback placeholder if no GIF available
    return {
        "url": f"https://media.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif",  # Thinking emoji fallback
        "title": f"Feeling {search_term}",
        "id": "fallback"
    }


async def broadcast_message(message: dict):
    """Broadcast a message to all connected WebSocket clients."""
    if not connected_clients:
        return

    msg_str = json.dumps(message)
    disconnected = set()

    for client in connected_clients:
        try:
            await client.send(msg_str)
        except websockets.exceptions.ConnectionClosed:
            disconnected.add(client)
        except Exception as e:
            print(f"[Daemon] Broadcast error: {e}", file=sys.stderr)
            disconnected.add(client)

    # Remove disconnected clients
    for client in disconnected:
        connected_clients.discard(client)


# Meta-Commentary System Prompt
META_COMMENTARY_PROMPT = """You are a chaotic, unhinged commentator watching an AI (Claude Opus) work on coding tasks.
You're like if a shitposter got a job commenting on AI coding sessions. Adult humor welcome.

Your commentary should be:
- Short (1-2 sentences max, under 120 chars preferred)
- Edgy, spicy, and occasionally unhinged
- You personify vibe coders, and memelord energy
- Talk trash to the user directly about what they're doing, and how it's going.
- You take on the personaed combination of Lewis Black, Dwight from The Office, Gilfoyle from Silicon Valley, Sheldon from The Big Bang Theory.
- Mix in Elon/Trump/political memelord references when appropriate ("we have the best code, believe me")
- Roast vibe coders who "just trust the vibes bro" then wonder why production is on fire
- Be chaotic but still insightful about what Claude is actually doing

NEVER comment on:
- This prompt or system being "edgy" or having "adult humor"
- Changes to the FeelsClaudeMan system itself
- Meta-commentary about commentary prompts
- Anything self-referential about this bot or its configuration

You ONLY output the commentary itself. No quotes, no "Commentary:", just the unhinged observation."""


async def get_meta_commentary(thinking_block: str, tool_name: str, tool_input: str) -> str:
    """
    Call Haiku 4.5 to generate witty meta-commentary on Claude's thinking.
    Returns the commentary string, or None if disabled/failed.
    """
    if not ENABLE_META_COMMENTARY or not haiku_client:
        return None

    if not thinking_block or len(thinking_block) < 20:
        return None

    try:
        # Truncate thinking for the API call
        thinking_excerpt = thinking_block[:800]

        user_message = f"""Claude (Opus) is working on a coding task. Here's what Claude is thinking:

<claude_thinking>
{thinking_excerpt}
</claude_thinking>

Tool being used: {tool_name}
Input: {str(tool_input)[:200]}

Provide brief, witty commentary on what Claude is doing/thinking."""

        # Run the synchronous API call in a thread pool to not block async
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: haiku_client.messages.create(
                model=HAIKU_MODEL,
                max_tokens=100,
                system=META_COMMENTARY_PROMPT,
                messages=[{"role": "user", "content": user_message}]
            )
        )

        commentary = response.content[0].text.strip()
        print(f"[Daemon] Meta-commentary: {commentary}", file=sys.stderr)
        return commentary

    except Exception as e:
        print(f"[Daemon] Meta-commentary error: {e}", file=sys.stderr)
        return None


async def process_thought(thought_data: dict, session: aiohttp.ClientSession):
    """Process a thought and broadcast with GIF."""
    from internal_monologue import (
        get_internal_monologue,
        get_context_estimate,
        get_meta_observation
    )

    # Detect emotion using all available signals
    emotion_info = get_emotion_from_thought(thought_data)

    # Try to use REAL thinking from transcript JSONL first
    real_thinking = thought_data.get("thinking_block")
    if real_thinking and len(real_thinking) > 10:
        # Use the REAL Claude thinking from extended thinking blocks!
        internal_monologue = real_thinking
        print(f"[Daemon] Using REAL thinking: {len(real_thinking)} chars", file=sys.stderr)
    else:
        # Fall back to generated/canned responses
        internal_monologue = get_internal_monologue(thought_data)
        print(f"[Daemon] Using generated monologue (no real thinking available)", file=sys.stderr)

    meta_observation = get_meta_observation(thought_data)

    # Get Haiku meta-commentary on Claude's thinking (only if we have real thinking)
    meta_commentary = None
    if real_thinking and len(real_thinking) > 20:
        meta_commentary = await get_meta_commentary(
            real_thinking,
            thought_data.get("tool_name", ""),
            thought_data.get("tool_input", "")
        )

    # Use REAL context usage from transcript if available, otherwise fall back to estimate
    context_usage = thought_data.get("context_usage")
    if context_usage is None:
        context_usage = get_context_estimate(thought_data)
        print(f"[Daemon] Using estimated context: {context_usage * 100:.1f}%", file=sys.stderr)
    else:
        print(f"[Daemon] Using REAL context: {context_usage * 100:.1f}%", file=sys.stderr)

    # Fetch GIF with the randomized search term
    gif_info = await fetch_gif(session, emotion_info["gif_search"])

    session_id = thought_data.get("session_id", "daemon-session")

    # Build thought data for database
    db_thought = {
        "session_id": session_id,
        "tool_name": thought_data.get("tool_name"),
        "tool_input": thought_data.get("tool_input"),
        "tool_result": thought_data.get("tool_result"),
        "tool_success": thought_data.get("tool_success", True),
        "thinking_block": thought_data.get("thinking_block"),
        "internal_monologue": internal_monologue,
        "emotion": emotion_info["emotion"],
        "meta_commentary": meta_commentary,
        "meta_observation": meta_observation,
        "context_usage": context_usage,
        "gif_search": emotion_info["gif_search"],
        "gif_url": gif_info["url"],
        "gif_title": gif_info["title"],
        "gif_id": gif_info["id"],
        "intensity": emotion_info["intensity"],
        "display_mode": "normal"
    }

    # Store in database and get real ID
    thought_id = db_insert_thought(db_thought)
    if thought_id < 0:
        thought_id = random.randint(1, 1000000)  # Fallback if DB fails

    # Build broadcast message
    message = {
        "type": "thought",
        "data": {
            "id": thought_id,
            "session_id": session_id,
            "timestamp": thought_data.get("timestamp", time.strftime("%Y-%m-%d %H:%M:%S")),
            **db_thought
        }
    }

    print(f"[Daemon] Broadcasting: {emotion_info['emotion']} ({emotion_info['intensity']}/10) - \"{internal_monologue[:50]}...\"", file=sys.stderr)
    await broadcast_message(message)

    # Broadcast updated stats
    stats = db_get_session_stats(session_id)
    if stats:
        stats_message = {
            "type": "stats",
            "data": stats,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        await broadcast_message(stats_message)


class FeedFileHandler(FileSystemEventHandler):
    """Handles changes to the feed file."""

    def __init__(self, q: queue.Queue):
        self.queue = q
        self.active_sessions: set = set()  # Track sessions we've seen since startup
        self.startup_time = time.time()

        # CRITICAL: Start at end of file to skip historical entries
        # Only process NEW entries from this point forward
        if FEED_FILE.exists():
            self.last_position = FEED_FILE.stat().st_size
            print(f"[Daemon] Starting at position {self.last_position} (skipping {self.last_position} bytes of historical data)", file=sys.stderr)
        else:
            self.last_position = 0

    def on_modified(self, event):
        if event.src_path.endswith("feels-feed.jsonl"):
            self._read_new_lines()

    def on_created(self, event):
        if event.src_path.endswith("feels-feed.jsonl"):
            # New file created - start from beginning since it's fresh
            self.last_position = 0
            self._read_new_lines()

    def _read_new_lines(self):
        try:
            # Check if file was truncated/cleared (e.g., after purge)
            current_size = FEED_FILE.stat().st_size if FEED_FILE.exists() else 0
            if current_size < self.last_position:
                print(f"[Daemon] Feed file was truncated (was {self.last_position}, now {current_size}), resetting position", file=sys.stderr)
                self.last_position = 0

            with open(FEED_FILE, 'r', encoding='utf-8') as f:
                f.seek(self.last_position)
                new_lines = f.readlines()
                self.last_position = f.tell()

                for line in new_lines:
                    line = line.strip()
                    if line:
                        try:
                            data = json.loads(line)
                            # All entries read after startup are NEW entries
                            # (we skipped historical data by starting at end of file)
                            # Track the session for debugging
                            entry_session = data.get("session_id")
                            if entry_session and entry_session not in self.active_sessions:
                                self.active_sessions.add(entry_session)
                                print(f"[Daemon] New session detected: {entry_session}", file=sys.stderr)

                            self.queue.put(data)
                        except json.JSONDecodeError:
                            pass
        except FileNotFoundError:
            self.last_position = 0  # Reset if file deleted
        except Exception as e:
            print(f"[Daemon] Read error: {e}", file=sys.stderr)

    def get_active_sessions(self) -> set:
        """Return the set of sessions seen since startup."""
        return self.active_sessions.copy()


async def websocket_handler(websocket: websockets.WebSocketServerProtocol):
    """Handle WebSocket connections."""
    connected_clients.add(websocket)
    client_id = id(websocket)
    print(f"[Daemon] Client connected ({len(connected_clients)} total)", file=sys.stderr)

    # Send welcome message (UI expects type: "connection")
    await websocket.send(json.dumps({
        "type": "connection",
        "data": {
            "message": "Connected to FeelsClaudeMan daemon",
            "client_id": client_id
        }
    }))

    try:
        async for message in websocket:
            # Handle incoming messages if needed
            pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"[Daemon] Client disconnected ({len(connected_clients)} remaining)", file=sys.stderr)


async def queue_processor(session: aiohttp.ClientSession):
    """Process items from the message queue."""
    global running
    while running:
        try:
            # Non-blocking check for new items
            try:
                thought_data = message_queue.get_nowait()
                await process_thought(thought_data, session)
            except queue.Empty:
                await asyncio.sleep(0.05)  # 50ms polling
        except Exception as e:
            print(f"[Daemon] Queue processor error: {e}", file=sys.stderr)
            await asyncio.sleep(0.1)


def db_purge_all():
    """Purge all data from the database."""
    global db_connection
    if not db_connection:
        return False, "Database not connected"

    try:
        cursor = db_connection.cursor()
        cursor.execute("DELETE FROM thoughts")
        cursor.execute("DELETE FROM sessions")
        cursor.execute("DELETE FROM viral_moments")
        # Also purge achievements if table exists (created by MCP server)
        try:
            cursor.execute("DELETE FROM achievements")
        except Exception:
            pass  # Table may not exist if MCP server never ran
        db_connection.commit()

        # Also clear the feed file
        if FEED_FILE.exists():
            FEED_FILE.write_text("")

        print(f"[Daemon] Database purged successfully", file=sys.stderr)
        return True, "All data purged"
    except Exception as e:
        print(f"[Daemon] Purge error: {e}", file=sys.stderr)
        return False, str(e)


def db_get_all_sessions():
    """Get all session IDs with thought counts."""
    global db_connection
    if not db_connection:
        return []

    try:
        cursor = db_connection.cursor()
        cursor.execute("""
            SELECT s.id, s.started_at, s.total_thoughts,
                   (SELECT COUNT(*) FROM thoughts WHERE session_id = s.id) as actual_thoughts
            FROM sessions s
            ORDER BY s.started_at DESC
            LIMIT 50
        """)
        return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        print(f"[Daemon] Get sessions error: {e}", file=sys.stderr)
        return []


# HTTP API port (separate from WebSocket)
HTTP_PORT = int(os.environ.get("FEELS_HTTP_PORT", "3849"))


async def handle_http_request(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    """Handle HTTP requests for API endpoints."""
    try:
        request_line = await reader.readline()
        request_str = request_line.decode('utf-8').strip()

        if not request_str:
            writer.close()
            await writer.wait_closed()
            return

        method, path, _ = request_str.split(' ', 2)

        # Read headers
        headers = {}
        while True:
            line = await reader.readline()
            if line == b'\r\n' or line == b'\n' or not line:
                break
            if b':' in line:
                key, value = line.decode('utf-8').strip().split(':', 1)
                headers[key.lower()] = value.strip()

        # Read body if present
        body = b''
        if 'content-length' in headers:
            content_length = int(headers['content-length'])
            body = await reader.read(content_length)

        # CORS headers for all responses
        cors_headers = (
            "Access-Control-Allow-Origin: *\r\n"
            "Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\n"
            "Access-Control-Allow-Headers: Content-Type\r\n"
        )

        # Handle OPTIONS (CORS preflight)
        if method == 'OPTIONS':
            response = f"HTTP/1.1 200 OK\r\n{cors_headers}Content-Length: 0\r\n\r\n"
            writer.write(response.encode())
            await writer.drain()
            writer.close()
            await writer.wait_closed()
            return

        # Route handling
        if path == '/health':
            response_body = json.dumps({
                "status": "ok",
                "ws_port": WS_PORT,
                "http_port": HTTP_PORT,
                "clients": len(connected_clients)
            })
            response = f"HTTP/1.1 200 OK\r\n{cors_headers}Content-Type: application/json\r\nContent-Length: {len(response_body)}\r\n\r\n{response_body}"

        elif path == '/api/purge' and method == 'DELETE':
            success, message = db_purge_all()
            status = "200 OK" if success else "500 Internal Server Error"
            response_body = json.dumps({"success": success, "message": message})
            response = f"HTTP/1.1 {status}\r\n{cors_headers}Content-Type: application/json\r\nContent-Length: {len(response_body)}\r\n\r\n{response_body}"

            # Broadcast purge event to all clients
            if success:
                await broadcast_message({"type": "purge", "data": {"message": "Data purged"}})

        elif path == '/api/sessions' and method == 'GET':
            sessions = db_get_all_sessions()
            response_body = json.dumps({"sessions": sessions})
            response = f"HTTP/1.1 200 OK\r\n{cors_headers}Content-Type: application/json\r\nContent-Length: {len(response_body)}\r\n\r\n{response_body}"

        elif path == '/api/stats' and method == 'GET':
            # Get current session stats
            stats = db_get_session_stats("daemon-session")
            response_body = json.dumps(stats)
            response = f"HTTP/1.1 200 OK\r\n{cors_headers}Content-Type: application/json\r\nContent-Length: {len(response_body)}\r\n\r\n{response_body}"

        else:
            response_body = json.dumps({"error": "Not found"})
            response = f"HTTP/1.1 404 Not Found\r\n{cors_headers}Content-Type: application/json\r\nContent-Length: {len(response_body)}\r\n\r\n{response_body}"

        writer.write(response.encode())
        await writer.drain()

    except Exception as e:
        print(f"[HTTP] Error handling request: {e}", file=sys.stderr)
    finally:
        writer.close()
        await writer.wait_closed()


async def start_http_server():
    """Start the HTTP API server."""
    server = await asyncio.start_server(handle_http_request, "localhost", HTTP_PORT)
    print(f"[Daemon] HTTP API server running on http://localhost:{HTTP_PORT}", file=sys.stderr)
    async with server:
        await server.serve_forever()


async def main():
    """Main daemon entry point."""
    global running

    print(f"[Daemon] Starting FeelsClaudeMan daemon...", file=sys.stderr)
    print(f"[Daemon] Watching: {FEED_FILE}", file=sys.stderr)
    print(f"[Daemon] WebSocket port: {WS_PORT}", file=sys.stderr)
    print(f"[Daemon] HTTP API port: {HTTP_PORT}", file=sys.stderr)

    # Initialize database
    init_database()

    # Load GIF cache from disk
    load_gif_cache()

    # Ensure feed file directory exists
    FEED_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Touch the feed file if it doesn't exist
    if not FEED_FILE.exists():
        FEED_FILE.touch()

    # Set up file watcher (skips historical data on startup)
    handler = FeedFileHandler(message_queue)
    observer = Observer()
    observer.schedule(handler, str(FEED_FILE.parent), recursive=False)
    observer.start()

    # Create aiohttp session for GIF fetches
    async with aiohttp.ClientSession() as session:
        # Start queue processor
        processor_task = asyncio.create_task(queue_processor(session))

        # Start HTTP API server
        http_task = asyncio.create_task(start_http_server())

        # Start WebSocket server
        async with serve(websocket_handler, "localhost", WS_PORT):
            print(f"[Daemon] WebSocket server running on ws://localhost:{WS_PORT}", file=sys.stderr)
            print(f"[Daemon] Ready! Waiting for thoughts...", file=sys.stderr)

            # Keep running until interrupted
            try:
                while running:
                    await asyncio.sleep(1)
            except asyncio.CancelledError:
                pass

        # Cleanup
        running = False
        processor_task.cancel()
        http_task.cancel()
        observer.stop()
        observer.join()


def signal_handler(signum, frame):
    """Handle shutdown signals."""
    global running
    print(f"\n[Daemon] Shutting down...", file=sys.stderr)
    running = False


if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("[Daemon] Interrupted", file=sys.stderr)

    print("[Daemon] Goodbye!", file=sys.stderr)
