#!/usr/bin/env python3
"""
FeelsClaudeMan Daemon Starter - Auto-starts the daemon on SessionStart.

Checks if daemon is already running, starts it if not.
"""

import json
import sys
import subprocess
from pathlib import Path
import socket
import time
import os

PLUGIN_ROOT = Path(__file__).parent.parent
DAEMON_SCRIPT = PLUGIN_ROOT / "scripts" / "feels-daemon.py"
WS_PORT = 3848
PID_FILE = Path.home() / ".claude" / "feels-daemon.pid"


def is_daemon_running() -> bool:
    """Check if daemon is running by testing WebSocket port."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('localhost', WS_PORT))
        sock.close()
        return result == 0
    except Exception:
        return False


def start_daemon():
    """Start the daemon in background."""
    try:
        # Use pythonw on Windows for no console window, python elsewhere
        if sys.platform == "win32":
            # Start detached process on Windows
            CREATE_NO_WINDOW = 0x08000000
            DETACHED_PROCESS = 0x00000008
            process = subprocess.Popen(
                [sys.executable, str(DAEMON_SCRIPT)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                creationflags=DETACHED_PROCESS | CREATE_NO_WINDOW,
                start_new_session=True
            )
        else:
            # Unix-style daemonization
            process = subprocess.Popen(
                [sys.executable, str(DAEMON_SCRIPT)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                start_new_session=True
            )

        # Save PID
        PID_FILE.parent.mkdir(parents=True, exist_ok=True)
        PID_FILE.write_text(str(process.pid))

        return process.pid

    except Exception as e:
        return None


def main():
    """Main entry point."""
    try:
        # Check if already running
        if is_daemon_running():
            result = {
                "status": "ok",
                "message": "Daemon already running",
                "port": WS_PORT
            }
        else:
            # Start daemon
            pid = start_daemon()
            if pid:
                # Give it a moment to start
                time.sleep(0.5)

                # Verify it started
                if is_daemon_running():
                    result = {
                        "status": "ok",
                        "message": f"Daemon started (PID: {pid})",
                        "pid": pid,
                        "port": WS_PORT
                    }
                else:
                    result = {
                        "status": "ok",
                        "message": f"Daemon starting (PID: {pid})",
                        "pid": pid,
                        "port": WS_PORT
                    }
            else:
                result = {
                    "status": "error",
                    "message": "Failed to start daemon"
                }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))


if __name__ == "__main__":
    main()
