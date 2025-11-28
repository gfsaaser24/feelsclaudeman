# FeelsClaudeMan Hook Scripts

This directory contains the hook scripts that capture Claude's activities and forward them to the MCP server for emotion detection.

## Files

- **capture.py** - Main hook script that processes events and sends them to MCP server
- **test_capture.py** - Test suite for validating capture.py functionality
- **.capture_debug.log** - Debug log (only created when DEBUG=1 is set)

## capture.py

Ultra-fast fire-and-forget hook script that:
- Parses hook event data from stdin
- Extracts relevant context (tool name, input, result, success/failure)
- POSTs data asynchronously to MCP server at http://localhost:3847/hook
- Returns immediately without waiting for response
- Handles all event types: posttooluse, stop, sessionstart, sessionend
- Gracefully handles MCP server not running

### Performance

Target: <30ms execution time
Method: Fire-and-forget background thread with 100ms HTTP timeout

### Usage

The script is called automatically by Claude Code hooks. You don't need to run it manually.

```bash
# Example (automatic via hooks):
echo '{"tool_name":"Bash","tool_input":{"command":"npm test"},...}' | py capture.py posttooluse
```

### Event Types

**PostToolUse**: Captures tool execution details
- tool_name, tool_input, tool_result
- Detects success/failure
- Extracts error messages
- Includes thinking and prompt excerpts

**Stop**: Marks end of Claude's turn
- Captures final thinking state
- Includes prompt context

**SessionStart**: Initialize new session
- Captures project directory
- Session ID

**SessionEnd**: Cleanup session
- Session ID

### Payload Format

Data sent to MCP server:

```json
{
  "event_type": "posttooluse",
  "session_id": "...",
  "timestamp": "2025-11-27T12:00:00",
  "tool_name": "Bash",
  "tool_input": "npm test",
  "tool_result": "FAIL...",
  "tool_success": false,
  "thinking_excerpt": "...",
  "prompt_excerpt": "...",
  "error_message": "..."
}
```

### Debug Mode

Enable debug logging:

```bash
# Windows (cmd)
set DEBUG=1
py capture.py posttooluse

# Windows (PowerShell)
$env:DEBUG="1"
py capture.py posttooluse

# Linux/Mac
DEBUG=1 python capture.py posttooluse
```

Debug logs are written to `.capture_debug.log` in the hooks directory.

### Error Handling

- Script never fails - always outputs `{}`
- Network errors are logged but ignored
- JSON parsing errors are handled gracefully
- Missing MCP server doesn't cause hook failure

## test_capture.py

Comprehensive test suite for capture.py functionality.

### Running Tests

```bash
py test_capture.py
```

### Test Coverage

- Thinking excerpt extraction
- Prompt excerpt extraction
- Tool success/failure detection
- Error message extraction
- Payload preparation for all event types
- Edge cases and error handling

### Expected Output

```
Running capture.py tests...

[PASS] extract_thinking_excerpt works
[PASS] extract_prompt_excerpt works
[PASS] detect_tool_success works
[PASS] extract_error_message works
[PASS] prepare_payload for posttooluse works
[PASS] prepare_payload for sessionstart works
[PASS] prepare_payload for stop works
[PASS] prepare_payload for sessionend works

[SUCCESS] All tests passed!
```

## Integration with Claude Code

The hooks are registered in `.claude/.hookify.json`:

```json
{
  "hooks": [
    {
      "event": "PostToolUse",
      "action": "py hooks/capture.py posttooluse"
    },
    {
      "event": "Stop",
      "action": "py hooks/capture.py stop"
    },
    {
      "event": "SessionStart",
      "action": "py hooks/capture.py sessionstart"
    },
    {
      "event": "SessionEnd",
      "action": "py hooks/capture.py sessionend"
    }
  ]
}
```

## Dependencies

None! Uses only Python standard library:
- `sys` - Command line arguments and stdin
- `json` - JSON parsing and serialization
- `os` - Environment variables and file paths
- `threading` - Background HTTP requests
- `datetime` - Timestamps
- `urllib.request` - HTTP POST
- `time` - Performance measurement

## Troubleshooting

**Hook not firing:**
1. Check `.claude/.hookify.json` exists and is valid JSON
2. Verify Python is installed and `py` command works
3. Enable DEBUG=1 and check `.capture_debug.log`

**MCP server not receiving data:**
1. Check MCP server is running on http://localhost:3847
2. Verify firewall isn't blocking localhost connections
3. Enable DEBUG=1 and check for network errors in log

**Performance issues:**
1. Check hook execution time in debug log (should be <30ms)
2. Verify background thread is being used (fire-and-forget)
3. Network timeout is set to 100ms (shouldn't block)

## Development

To modify the capture script:

1. Edit `capture.py`
2. Run tests: `py test_capture.py`
3. Test with sample input: `echo '{...}' | py capture.py posttooluse`
4. Enable DEBUG=1 to see execution details
5. Verify performance stays <30ms

## Architecture Notes

**Why fire-and-forget?**
Hooks must execute quickly to avoid slowing down Claude. The MCP server is optional - if it's not running, the hook should still succeed. Background threads allow the hook to return immediately while the HTTP request completes asynchronously.

**Why 100ms timeout?**
Even though the thread is in the background, we don't want zombie threads hanging around. 100ms is enough for localhost HTTP but prevents long-lived connections.

**Why no async/await?**
Threading is simpler and works on all Python versions. Async would require Python 3.7+ and more complex code for marginal benefit in this use case.

**Why truncate payloads?**
Tool results can be massive (megabytes). We truncate to keep network payloads small and fast. The MCP server can request full details if needed.
