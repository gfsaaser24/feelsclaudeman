#!/usr/bin/env python3
"""
FeelsClaudeMan - Ultra-fast hook capture script

This script receives hook events from Claude Code and:
1. Appends to ~/.claude/feels-feed.jsonl (for daemon to process - FAST)
2. Optionally POSTs to MCP server (for database storage)

Design: File I/O is instant, HTTP is fire-and-forget.

Usage:
    python capture.py <event_type>

Event types: posttooluse, stop, sessionstart, sessionend

Input: JSON data from stdin (hook context)
Output: JSON to stdout (hook response)
"""

import sys
import json
import os
import threading
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError
import time

# Configuration
MCP_SERVER_URL = "http://localhost:38470/hook"
HTTP_TIMEOUT = 0.1  # 100ms timeout for fire-and-forget
FEED_FILE = Path.home() / ".claude" / "feels-feed.jsonl"
DEBUG = True  # Always debug for now to see what's happening

# Claude Code's context window size (tokens)
# This matches Claude Code's /context calculation: totalTokens / 200000
MAX_CONTEXT_TOKENS = 200000


def debug_log(message):
    """Log debug messages to .capture_debug.log if DEBUG is enabled."""
    if not DEBUG:
        return

    try:
        log_dir = os.path.dirname(os.path.abspath(__file__))
        debug_log_path = os.path.join(log_dir, ".capture_debug.log")

        with open(debug_log_path, "a", encoding="utf-8") as f:
            timestamp = datetime.now().isoformat()
            f.write(f"[{timestamp}] {message}\n")
    except Exception:
        pass  # Silently ignore logging errors


def calculate_context_usage(transcript_path):
    """
    Calculate actual context usage from Claude Code's transcript JSONL file.

    Based on reverse-engineered Claude Code calculation:
    - Find the MOST RECENT valid entry (not sidechain, not error)
    - Sum: input_tokens + cache_read_input_tokens + cache_creation_input_tokens
    - Divide by 200,000 (full context window)

    Returns: float between 0.0 and 1.0 representing context usage percentage
    """
    if not transcript_path:
        debug_log("No transcript_path provided, using estimate")
        return None

    try:
        transcript_file = Path(transcript_path)
        if not transcript_file.exists():
            debug_log(f"Transcript file not found: {transcript_path}")
            return None

        # Find the most recent valid entry
        latest_usage = None
        latest_timestamp = None

        with open(transcript_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    entry = json.loads(line)

                    # Skip sidechain entries (parallel agent calls)
                    if entry.get("isSidechain") == True:
                        continue

                    # Skip API error messages
                    if entry.get("isApiErrorMessage") == True:
                        continue

                    # Look for usage data - can be in "message" or directly in entry
                    usage = None
                    if "message" in entry and "usage" in entry.get("message", {}):
                        usage = entry["message"]["usage"]
                    elif "usage" in entry:
                        usage = entry["usage"]

                    if usage:
                        timestamp = entry.get("timestamp")
                        # Keep the most recent entry (last one in file order)
                        latest_timestamp = timestamp
                        latest_usage = usage

                except json.JSONDecodeError:
                    continue

        if latest_usage is None:
            debug_log("No token data found in transcript")
            return None

        # Calculate total tokens (ALL token types)
        # Claude Code includes: input_tokens + cache_read + cache_creation + output_tokens
        input_tokens = latest_usage.get("input_tokens", 0) or 0
        cache_read = latest_usage.get("cache_read_input_tokens", 0) or 0
        cache_creation = latest_usage.get("cache_creation_input_tokens", 0) or 0
        output_tokens = latest_usage.get("output_tokens", 0) or 0

        total_tokens = input_tokens + cache_read + cache_creation + output_tokens

        # Calculate percentage: totalTokens / 200000 (full context window)
        # This matches Claude Code's /context command calculation
        usage_percentage = min(total_tokens / MAX_CONTEXT_TOKENS, 1.0)

        debug_log(f"Context usage: {total_tokens} tokens / {MAX_CONTEXT_TOKENS} = {usage_percentage * 100:.1f}%")
        debug_log(f"  Breakdown: input={input_tokens}, cache_read={cache_read}, cache_creation={cache_creation}, output={output_tokens}")
        return usage_percentage

    except Exception as e:
        debug_log(f"Error parsing transcript: {e}")
        return None


def extract_thinking_from_jsonl(transcript_path):
    """
    Extract Claude's REAL thinking from the transcript JSONL file.

    This reads the actual thinking blocks that Claude produces during extended thinking,
    not from the hook's transcript array which may not contain them.

    Returns: The most recent thinking block text (up to 2000 chars), or None
    """
    if not transcript_path:
        debug_log("No transcript_path for thinking extraction")
        return None

    try:
        transcript_file = Path(transcript_path)
        if not transcript_file.exists():
            debug_log(f"Transcript file not found: {transcript_path}")
            return None

        latest_thinking = None

        # Read the file and find the most recent thinking block
        with open(transcript_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    entry = json.loads(line)

                    # Skip sidechain entries
                    if entry.get("isSidechain"):
                        continue

                    # Look for assistant messages with thinking blocks
                    message = entry.get("message", {})
                    if message.get("role") != "assistant":
                        continue

                    content = message.get("content", [])
                    if not isinstance(content, list):
                        continue

                    # Find thinking blocks in content
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "thinking":
                            thinking_text = block.get("thinking", "")
                            if thinking_text:
                                # Keep the most recent (last in file order)
                                latest_thinking = thinking_text

                except json.JSONDecodeError:
                    continue

        if latest_thinking:
            # Return up to 2000 chars of thinking
            debug_log(f"Found thinking block: {len(latest_thinking)} chars")
            return latest_thinking[:2000]

        debug_log("No thinking blocks found in transcript")
        return None

    except Exception as e:
        debug_log(f"Error extracting thinking: {e}")
        return None


def extract_thinking_excerpt(transcript):
    """Extract Claude's recent thinking from transcript array (legacy/fallback)."""
    if not transcript or not isinstance(transcript, list):
        return None

    # Look for the most recent assistant message with thinking
    for msg in reversed(transcript):
        if isinstance(msg, dict) and msg.get("role") == "assistant":
            content = msg.get("content", [])
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "thinking":
                        text = block.get("thinking", "")
                        # Return first 500 chars of thinking
                        return text[:500] if text else None
    return None


def extract_prompt_excerpt(transcript):
    """Extract user's most recent prompt from transcript."""
    if not transcript or not isinstance(transcript, list):
        return None

    # Look for the most recent user message
    for msg in reversed(transcript):
        if isinstance(msg, dict) and msg.get("role") == "user":
            content = msg.get("content")
            if isinstance(content, str):
                return content[:500]
            elif isinstance(content, list):
                # Concatenate text blocks
                text_parts = []
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        text_parts.append(block.get("text", ""))
                combined = " ".join(text_parts)
                return combined[:500] if combined else None
    return None


def detect_tool_success(tool_result):
    """Heuristically detect if a tool call succeeded or failed."""
    if not tool_result or not isinstance(tool_result, str):
        return True  # Assume success if no result

    # Common error indicators
    error_indicators = [
        "error", "failed", "failure", "exception", "traceback",
        "cannot", "unable to", "does not exist", "not found",
        "permission denied", "access denied", "invalid",
        "syntax error", "command not found"
    ]

    result_lower = tool_result.lower()
    return not any(indicator in result_lower for indicator in error_indicators)


def extract_error_message(tool_result):
    """Extract error message from tool result if present."""
    if not tool_result or not isinstance(tool_result, str):
        return None

    # If result looks like an error, return first few lines
    result_lower = tool_result.lower()
    if any(word in result_lower for word in ["error", "exception", "failed"]):
        lines = tool_result.split("\n")
        # Return first 3 non-empty lines
        error_lines = [line.strip() for line in lines if line.strip()][:3]
        return " | ".join(error_lines) if error_lines else None

    return None


def prepare_payload(event_type, context):
    """Prepare the payload to send to MCP server."""
    # Extract transcript_path for context usage calculation
    transcript_path = context.get("transcript_path")

    # Calculate real context usage from transcript
    context_usage = calculate_context_usage(transcript_path)

    payload = {
        "event_type": event_type,
        "timestamp": datetime.now().isoformat(),
        "session_id": context.get("session_id"),
        "context_usage": context_usage,  # Real context usage (or None if unavailable)
    }

    if event_type == "posttooluse":
        tool_name = context.get("tool_name")
        tool_input = context.get("tool_input", {})
        # Note: The field is called "tool_response" in hooks, not "tool_result"
        tool_result = context.get("tool_response", "") or context.get("tool_result", "")
        transcript = context.get("transcript", [])

        # Serialize tool_input to string if it's a dict
        if isinstance(tool_input, dict):
            # For common tools, extract the key field
            if "command" in tool_input:
                tool_input_str = tool_input["command"]
            elif "file_path" in tool_input:
                tool_input_str = tool_input["file_path"]
            elif "pattern" in tool_input:
                tool_input_str = tool_input["pattern"]
            else:
                tool_input_str = json.dumps(tool_input)[:200]
        else:
            tool_input_str = str(tool_input)[:200]

        # Truncate tool_result for payload
        tool_result_str = str(tool_result)[:1000] if tool_result else ""

        # Extract REAL thinking from transcript JSONL file (not hook's transcript array)
        real_thinking = extract_thinking_from_jsonl(transcript_path)
        # Fall back to hook's transcript array if JSONL extraction fails
        thinking = real_thinking or extract_thinking_excerpt(transcript)

        payload.update({
            "tool_name": tool_name,
            "tool_input": tool_input_str,
            "tool_result": tool_result_str,
            "tool_success": detect_tool_success(tool_result),
            "thinking_excerpt": thinking,
            "prompt_excerpt": extract_prompt_excerpt(transcript),
            "error_message": extract_error_message(tool_result),
        })

    elif event_type == "sessionstart":
        payload.update({
            "project_dir": context.get("project_dir"),
        })

    elif event_type == "stop":
        transcript = context.get("transcript", [])
        # Extract REAL thinking from transcript JSONL file
        real_thinking = extract_thinking_from_jsonl(transcript_path)
        thinking = real_thinking or extract_thinking_excerpt(transcript)

        payload.update({
            "thinking_excerpt": thinking,
            "prompt_excerpt": extract_prompt_excerpt(transcript),
        })

    # sessionend needs no extra fields

    return payload


def write_to_feed_file(payload):
    """Write payload to feed file for daemon to process. FAST."""
    try:
        # Build feed entry
        feed_entry = {
            "timestamp": payload.get("timestamp", datetime.now().isoformat()),
            "source": payload.get("event_type", "unknown"),
            "tool_name": payload.get("tool_name"),
            "tool_input": payload.get("tool_input"),
            "tool_result": payload.get("tool_result"),
            "tool_success": payload.get("tool_success"),
            "thinking_block": payload.get("thinking_excerpt"),
            "text": payload.get("tool_result") or payload.get("thinking_excerpt") or "",
            "session_id": payload.get("session_id"),
            "context_usage": payload.get("context_usage"),  # Real context usage from transcript
        }

        # Ensure directory exists
        FEED_FILE.parent.mkdir(parents=True, exist_ok=True)

        # Append to feed file (fast I/O)
        with open(FEED_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps(feed_entry) + "\n")
            f.flush()

        debug_log(f"Wrote {payload['event_type']} to feed file")

    except Exception as e:
        debug_log(f"Failed to write to feed file: {e}")


def post_to_mcp_server(payload):
    """Fire-and-forget POST to MCP server. Runs in background thread."""
    try:
        data = json.dumps(payload).encode("utf-8")
        request = Request(
            MCP_SERVER_URL,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        # Fire and forget - don't wait for response
        urlopen(request, timeout=HTTP_TIMEOUT)
        debug_log(f"Posted {payload['event_type']} event to MCP server")

    except URLError as e:
        # Server not running or network error - this is expected, don't fail
        debug_log(f"MCP server not reachable: {e}")

    except Exception as e:
        # Any other error - log but don't fail the hook
        debug_log(f"Error posting to MCP server: {e}")


def main():
    start_time = time.time()

    # Get event type from command line argument
    event_type = sys.argv[1] if len(sys.argv) > 1 else "unknown"

    # Read stdin (hook provides JSON context)
    try:
        input_data = sys.stdin.read()
        context = json.loads(input_data) if input_data else {}
    except (json.JSONDecodeError, Exception) as e:
        debug_log(f"Failed to parse stdin: {e}")
        context = {}

    debug_log(f"Received {event_type} event")
    debug_log(f"Context keys: {list(context.keys())}")
    debug_log(f"tool_result raw: {context.get('tool_result', 'NOT_FOUND')[:200] if context.get('tool_result') else 'EMPTY'}")

    # Prepare payload for daemon (via feed file)
    try:
        payload = prepare_payload(event_type, context)
    except Exception as e:
        debug_log(f"Failed to prepare payload: {e}")
        payload = {
            "event_type": event_type,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

    # Write to feed file for daemon to process
    # Daemon handles: emotion detection, GIF search, database, WebSocket broadcast
    write_to_feed_file(payload)

    # Calculate execution time (should be <30ms)
    elapsed_ms = (time.time() - start_time) * 1000
    debug_log(f"Hook execution time: {elapsed_ms:.2f}ms")

    # Output empty JSON response (hook success, no modifications)
    print(json.dumps({}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
