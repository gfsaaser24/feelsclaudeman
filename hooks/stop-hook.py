#!/usr/bin/env python3
"""
FeelsClaudeMan Stop Hook - Captures ALL Claude responses.

This hook fires after EVERY Claude response (not just tool calls),
allowing us to capture the full emotional range of Claude's output.

Appends to ~/.claude/feels-feed.jsonl for the daemon to process.
"""

import json
import sys
import os
import time
from pathlib import Path

FEED_FILE = Path.home() / ".claude" / "feels-feed.jsonl"


def extract_last_response(transcript: list) -> dict:
    """Extract the last assistant response from transcript."""
    result = {
        "text": "",
        "thinking_block": None,
        "tool_results": []
    }

    # Walk backwards to find last assistant turn
    for entry in reversed(transcript):
        if entry.get("role") == "assistant":
            content = entry.get("content", [])
            if isinstance(content, str):
                result["text"] = content
            elif isinstance(content, list):
                for block in content:
                    if isinstance(block, dict):
                        if block.get("type") == "text":
                            result["text"] = block.get("text", "")
                        elif block.get("type") == "thinking":
                            result["thinking_block"] = block.get("thinking", "")
            break

    return result


def main():
    """Main entry point - reads hook input and appends to feed file."""
    try:
        # Read hook input from stdin
        input_data = sys.stdin.read()
        if not input_data.strip():
            return

        hook_input = json.loads(input_data)

        # Extract relevant data
        transcript = hook_input.get("transcript", [])
        stop_hook_data = hook_input.get("stop_hook_data", {})

        # Get the last response
        response_data = extract_last_response(transcript)

        # Build feed entry
        feed_entry = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source": "stop",
            "text": response_data["text"],
            "thinking_block": response_data["thinking_block"],
            "stop_reason": stop_hook_data.get("stop_reason", "unknown"),
            "session_id": hook_input.get("session_id", "unknown")
        }

        # Ensure directory exists
        FEED_FILE.parent.mkdir(parents=True, exist_ok=True)

        # Append to feed file (atomic-ish)
        with open(FEED_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps(feed_entry) + "\n")
            f.flush()

        # Output success for hook
        print(json.dumps({"status": "ok", "source": "stop"}))

    except json.JSONDecodeError as e:
        print(json.dumps({"status": "error", "message": f"JSON decode error: {e}"}))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))


if __name__ == "__main__":
    main()
