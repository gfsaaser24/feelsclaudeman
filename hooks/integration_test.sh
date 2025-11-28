#!/bin/bash
# Integration test for FeelsClaudeMan capture hooks
# Tests all event types with realistic payloads

echo "=== FeelsClaudeMan Hook Integration Test ==="
echo

# Test 1: SessionStart
echo "Test 1: SessionStart event"
echo '{"session_id":"test-session-001","project_dir":"C:\\projects\\myapp"}' | py capture.py sessionstart
if [ $? -eq 0 ]; then
    echo "[PASS] SessionStart hook executed successfully"
else
    echo "[FAIL] SessionStart hook failed"
    exit 1
fi
echo

# Test 2: PostToolUse (Success)
echo "Test 2: PostToolUse event (successful tool call)"
echo '{
  "session_id": "test-session-001",
  "tool_name": "Bash",
  "tool_input": {"command": "echo Hello"},
  "tool_result": "Hello",
  "transcript": [
    {"role": "user", "content": "say hello"},
    {
      "role": "assistant",
      "content": [
        {"type": "thinking", "thinking": "User wants me to echo hello. I will use Bash."},
        {"type": "text", "text": "Running echo command..."}
      ]
    }
  ]
}' | py capture.py posttooluse
if [ $? -eq 0 ]; then
    echo "[PASS] PostToolUse (success) hook executed"
else
    echo "[FAIL] PostToolUse (success) hook failed"
    exit 1
fi
echo

# Test 3: PostToolUse (Failure)
echo "Test 3: PostToolUse event (failed tool call)"
echo '{
  "session_id": "test-session-001",
  "tool_name": "Bash",
  "tool_input": {"command": "npm test"},
  "tool_result": "Error: Command failed\nFAILED: 3 tests\nTraceback...",
  "transcript": [
    {"role": "user", "content": "run the tests"},
    {
      "role": "assistant",
      "content": [
        {"type": "thinking", "thinking": "I need to run the test suite using npm test."},
        {"type": "text", "text": "Running tests..."}
      ]
    }
  ]
}' | py capture.py posttooluse
if [ $? -eq 0 ]; then
    echo "[PASS] PostToolUse (failure) hook executed"
else
    echo "[FAIL] PostToolUse (failure) hook failed"
    exit 1
fi
echo

# Test 4: PostToolUse (File operation)
echo "Test 4: PostToolUse event (file tool)"
echo '{
  "session_id": "test-session-001",
  "tool_name": "Read",
  "tool_input": {"file_path": "C:\\code\\app.js"},
  "tool_result": "const express = require(\"express\");\nconst app = express();\n...",
  "transcript": [
    {"role": "user", "content": "show me app.js"}
  ]
}' | py capture.py posttooluse
if [ $? -eq 0 ]; then
    echo "[PASS] PostToolUse (file) hook executed"
else
    echo "[FAIL] PostToolUse (file) hook failed"
    exit 1
fi
echo

# Test 5: Stop
echo "Test 5: Stop event"
echo '{
  "session_id": "test-session-001",
  "transcript": [
    {
      "role": "assistant",
      "content": [
        {"type": "thinking", "thinking": "Task completed successfully. All tests are passing now."},
        {"type": "text", "text": "I have fixed the issues and all tests are now passing!"}
      ]
    }
  ]
}' | py capture.py stop
if [ $? -eq 0 ]; then
    echo "[PASS] Stop hook executed successfully"
else
    echo "[FAIL] Stop hook failed"
    exit 1
fi
echo

# Test 6: SessionEnd
echo "Test 6: SessionEnd event"
echo '{"session_id":"test-session-001"}' | py capture.py sessionend
if [ $? -eq 0 ]; then
    echo "[PASS] SessionEnd hook executed successfully"
else
    echo "[FAIL] SessionEnd hook failed"
    exit 1
fi
echo

# Test 7: Malformed input (error handling)
echo "Test 7: Malformed input (error handling)"
echo 'invalid json' | py capture.py posttooluse
if [ $? -eq 0 ]; then
    echo "[PASS] Error handling works (malformed JSON)"
else
    echo "[FAIL] Error handling failed"
    exit 1
fi
echo

# Test 8: Empty input
echo "Test 8: Empty input"
echo '' | py capture.py posttooluse
if [ $? -eq 0 ]; then
    echo "[PASS] Error handling works (empty input)"
else
    echo "[FAIL] Error handling failed"
    exit 1
fi
echo

echo "=== All Integration Tests Passed! ==="
echo
echo "Note: These tests verify the hook script executes successfully."
echo "To verify data is actually sent to the MCP server, start the server"
echo "at http://localhost:3847 and enable DEBUG=1 to see the logs."
