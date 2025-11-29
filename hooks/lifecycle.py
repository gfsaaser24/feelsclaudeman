#!/usr/bin/env python3
"""
FeelsClaudeMan Lifecycle Manager
Handles starting and stopping all processes for the plugin.

Architecture:
- Daemon (Python): Core emotion processing, WebSocket broadcast, database
- Web UI (Next.js): Browser dashboard
- MCP Server: Status checks only (auto-started by Claude Code)
"""

import subprocess
import sys
import os
import time
import socket
import json
from pathlib import Path

# Ports used by FeelsClaudeMan
PORTS = {
    'daemon': 3848,     # Daemon WebSocket (core emotion processing)
    'daemon_http': 3849, # Daemon HTTP API (purge, stats)
    'webui': 3000,      # Next.js web UI
    'mcp': 38470,       # MCP server (status checks only)
}

# Paths
PLUGIN_ROOT = Path(os.environ.get('CLAUDE_PLUGIN_ROOT', Path(__file__).parent.parent))
# Prefer local version with API keys if it exists, otherwise use shipped version
DAEMON_SCRIPT_LOCAL = PLUGIN_ROOT / "scripts" / "feels-daemon.local.py"
DAEMON_SCRIPT_DEFAULT = PLUGIN_ROOT / "scripts" / "feels-daemon.py"
DAEMON_SCRIPT = DAEMON_SCRIPT_LOCAL if DAEMON_SCRIPT_LOCAL.exists() else DAEMON_SCRIPT_DEFAULT
WEBUI_DIR = PLUGIN_ROOT / "web-ui"
PID_FILE = Path.home() / ".claude" / "feels-daemon.pid"


def is_windows():
    return sys.platform == 'win32'


def get_pid_on_port(port):
    """Get the PID of process listening on a port."""
    try:
        if is_windows():
            result = subprocess.run(
                ['netstat', '-ano'],
                capture_output=True, text=True, timeout=10
            )
            for line in result.stdout.split('\n'):
                if f':{port}' in line and 'LISTENING' in line:
                    parts = line.split()
                    if parts:
                        return int(parts[-1])
        else:
            result = subprocess.run(
                ['lsof', '-t', f'-i:{port}'],
                capture_output=True, text=True, timeout=10
            )
            if result.stdout.strip():
                return int(result.stdout.strip().split('\n')[0])
    except Exception as e:
        print(f"Error getting PID on port {port}: {e}", file=sys.stderr)
    return None


def kill_process(pid):
    """Kill a process by PID."""
    if not pid:
        return False
    try:
        if is_windows():
            subprocess.run(['taskkill', '/F', '/PID', str(pid)],
                         capture_output=True, timeout=10)
        else:
            subprocess.run(['kill', '-9', str(pid)],
                         capture_output=True, timeout=10)
        return True
    except Exception as e:
        print(f"Error killing PID {pid}: {e}", file=sys.stderr)
        return False


def is_port_in_use(port):
    """Check if a port is in use."""
    return get_pid_on_port(port) is not None


def start_daemon():
    """Start the daemon in the background."""
    if is_port_in_use(PORTS['daemon']):
        return True, f"Daemon already running on port {PORTS['daemon']}"

    if not DAEMON_SCRIPT.exists():
        return False, f"Daemon script not found: {DAEMON_SCRIPT}"

    try:
        env = os.environ.copy()
        env['FEELS_WS_PORT'] = str(PORTS['daemon'])

        if is_windows():
            CREATE_NO_WINDOW = 0x08000000
            DETACHED_PROCESS = 0x00000008
            process = subprocess.Popen(
                [sys.executable, str(DAEMON_SCRIPT)],
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                creationflags=DETACHED_PROCESS | CREATE_NO_WINDOW,
                start_new_session=True
            )
        else:
            process = subprocess.Popen(
                [sys.executable, str(DAEMON_SCRIPT)],
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                start_new_session=True
            )

        # Save PID
        PID_FILE.parent.mkdir(parents=True, exist_ok=True)
        PID_FILE.write_text(str(process.pid))

        # Wait for it to start
        for _ in range(10):
            time.sleep(0.5)
            if is_port_in_use(PORTS['daemon']):
                return True, f"Daemon started on port {PORTS['daemon']} (PID: {process.pid})"

        return True, f"Daemon starting (PID: {process.pid})"

    except Exception as e:
        return False, f"Error starting daemon: {e}"


def start_web_ui():
    """Start the web UI in the background."""
    if is_port_in_use(PORTS['webui']):
        return True, f"Web UI already running on port {PORTS['webui']}"

    if not WEBUI_DIR.exists():
        return False, f"Web UI directory not found: {WEBUI_DIR}"

    try:
        if is_windows():
            subprocess.Popen(
                ['cmd', '/c', 'npm', 'run', 'dev'],
                cwd=str(WEBUI_DIR),
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        else:
            subprocess.Popen(
                ['npm', 'run', 'dev'],
                cwd=str(WEBUI_DIR),
                start_new_session=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )

        # Wait for it to start
        for _ in range(10):
            time.sleep(1)
            if is_port_in_use(PORTS['webui']):
                return True, f"Web UI started on port {PORTS['webui']}"

        return False, "Web UI failed to start within timeout"

    except Exception as e:
        return False, f"Error starting Web UI: {e}"


def kill_all_processes():
    """Kill all FeelsClaudeMan processes (except MCP which is managed by Claude Code)."""
    killed = []
    pids_killed = set()

    # Only kill daemon and webui, NOT mcp (managed by Claude Code)
    for name in ['daemon', 'webui']:
        port = PORTS[name]
        pid = get_pid_on_port(port)
        if pid and pid not in pids_killed:
            if kill_process(pid):
                killed.append(f"{name} (port {port}, PID {pid})")
                pids_killed.add(pid)

    # Clean up PID file
    if PID_FILE.exists():
        PID_FILE.unlink()

    return killed


def get_status():
    """Get status of all processes."""
    status = {}
    for name, port in PORTS.items():
        pid = get_pid_on_port(port)
        status[name] = {
            "port": port,
            "running": pid is not None,
            "pid": pid
        }
    return status


def restart_daemon():
    """Stop and restart the daemon (useful when code changes)."""
    # Kill existing daemon
    pid = get_pid_on_port(PORTS['daemon'])
    if pid:
        kill_process(pid)
        time.sleep(1)  # Wait for port to be released

    # Start fresh
    return start_daemon()


def main():
    if len(sys.argv) < 2:
        print("Usage: lifecycle.py [start|stop|restart|status]")
        sys.exit(1)

    action = sys.argv[1].lower()

    if action == 'stop':
        killed = kill_all_processes()
        if killed:
            result = {"status": "stopped", "killed": killed}
        else:
            result = {"status": "nothing_to_stop", "message": "No processes were running"}
        print(json.dumps(result))

    elif action == 'start':
        # Start daemon first (core processing)
        daemon_ok, daemon_msg = start_daemon()

        # Then start web UI
        webui_ok, webui_msg = start_web_ui()

        result = {
            "status": "started" if (daemon_ok and webui_ok) else "partial",
            "daemon": daemon_msg,
            "webui": webui_msg,
            "mcp": "Managed by Claude Code (status checks only)"
        }
        print(json.dumps(result))

    elif action == 'restart':
        # Restart daemon with fresh code (keeps web UI running)
        daemon_ok, daemon_msg = restart_daemon()

        # Ensure web UI is running
        webui_ok, webui_msg = start_web_ui()

        result = {
            "status": "restarted" if daemon_ok else "failed",
            "daemon": daemon_msg,
            "webui": webui_msg,
            "mcp": "Managed by Claude Code (status checks only)"
        }
        print(json.dumps(result))

    elif action == 'status':
        status = get_status()
        print(json.dumps({"status": status}))

    else:
        print(f"Unknown action: {action}")
        sys.exit(1)


if __name__ == '__main__':
    main()
