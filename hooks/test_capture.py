#!/usr/bin/env python3
"""
Test script for capture.py
Validates payload extraction and event handling
"""

import json
import sys
import os

# Add hooks directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from capture import (
    extract_thinking_excerpt,
    extract_prompt_excerpt,
    detect_tool_success,
    extract_error_message,
    prepare_payload
)

def test_extract_thinking():
    """Test thinking extraction from transcript."""
    transcript = [
        {
            "role": "user",
            "content": "Do something"
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "thinking",
                    "thinking": "I need to analyze this carefully. The user wants..."
                },
                {
                    "type": "text",
                    "text": "Sure, I'll help with that."
                }
            ]
        }
    ]

    result = extract_thinking_excerpt(transcript)
    assert result is not None
    assert "analyze this carefully" in result
    print("[PASS] extract_thinking_excerpt works")

def test_extract_prompt():
    """Test prompt extraction from transcript."""
    transcript = [
        {
            "role": "user",
            "content": "Please run the tests for me"
        },
        {
            "role": "assistant",
            "content": [{"type": "text", "text": "Running tests..."}]
        }
    ]

    result = extract_prompt_excerpt(transcript)
    assert result is not None
    assert "run the tests" in result
    print("[PASS] extract_prompt_excerpt works")

def test_detect_success():
    """Test tool success detection."""
    # Success cases
    assert detect_tool_success("All tests passed") == True
    assert detect_tool_success("Operation completed successfully") == True
    assert detect_tool_success("") == True  # Empty is success

    # Failure cases
    assert detect_tool_success("Error: file not found") == False
    assert detect_tool_success("FAILED: 2 tests") == False
    assert detect_tool_success("Exception occurred") == False
    assert detect_tool_success("cannot access file") == False

    print("[PASS] detect_tool_success works")

def test_extract_error():
    """Test error message extraction."""
    error_result = "Error: Cannot find module 'test'\n    at Function.Module._load\n    at main.js:10"

    result = extract_error_message(error_result)
    assert result is not None
    assert "Cannot find module" in result

    # No error case
    success_result = "All tests passed!"
    result = extract_error_message(success_result)
    assert result is None

    print("[PASS] extract_error_message works")

def test_prepare_payload_posttooluse():
    """Test payload preparation for PostToolUse event."""
    context = {
        "session_id": "test-123",
        "tool_name": "Bash",
        "tool_input": {"command": "npm test"},
        "tool_result": "Error: tests failed",
        "transcript": [
            {
                "role": "user",
                "content": "run tests"
            },
            {
                "role": "assistant",
                "content": [
                    {"type": "thinking", "thinking": "Running test suite"},
                    {"type": "text", "text": "Running..."}
                ]
            }
        ]
    }

    payload = prepare_payload("posttooluse", context)

    assert payload["event_type"] == "posttooluse"
    assert payload["session_id"] == "test-123"
    assert payload["tool_name"] == "Bash"
    assert payload["tool_input"] == "npm test"
    assert "failed" in payload["tool_result"]
    assert payload["tool_success"] == False
    assert payload["error_message"] is not None
    assert payload["thinking_excerpt"] is not None
    assert payload["prompt_excerpt"] is not None
    assert "timestamp" in payload

    print("[PASS] prepare_payload for posttooluse works")

def test_prepare_payload_sessionstart():
    """Test payload preparation for SessionStart event."""
    context = {
        "session_id": "new-session",
        "project_dir": "/path/to/project"
    }

    payload = prepare_payload("sessionstart", context)

    assert payload["event_type"] == "sessionstart"
    assert payload["session_id"] == "new-session"
    assert payload["project_dir"] == "/path/to/project"

    print("[PASS] prepare_payload for sessionstart works")

def test_prepare_payload_stop():
    """Test payload preparation for Stop event."""
    context = {
        "session_id": "active-session",
        "transcript": [
            {
                "role": "assistant",
                "content": [
                    {"type": "thinking", "thinking": "Task completed successfully"}
                ]
            }
        ]
    }

    payload = prepare_payload("stop", context)

    assert payload["event_type"] == "stop"
    assert payload["session_id"] == "active-session"
    assert payload["thinking_excerpt"] is not None

    print("[PASS] prepare_payload for stop works")

def test_prepare_payload_sessionend():
    """Test payload preparation for SessionEnd event."""
    context = {
        "session_id": "ending-session"
    }

    payload = prepare_payload("sessionend", context)

    assert payload["event_type"] == "sessionend"
    assert payload["session_id"] == "ending-session"

    print("[PASS] prepare_payload for sessionend works")

def main():
    """Run all tests."""
    print("\nRunning capture.py tests...\n")

    try:
        test_extract_thinking()
        test_extract_prompt()
        test_detect_success()
        test_extract_error()
        test_prepare_payload_posttooluse()
        test_prepare_payload_sessionstart()
        test_prepare_payload_stop()
        test_prepare_payload_sessionend()

        print("\n[SUCCESS] All tests passed!\n")
        return 0

    except AssertionError as e:
        print(f"\n[FAIL] Test failed: {e}\n")
        return 1
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}\n")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
