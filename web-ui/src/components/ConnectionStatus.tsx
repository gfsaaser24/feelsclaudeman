'use client';

import type { ConnectionState } from '@/types/emotions';

interface ConnectionStatusProps {
  state: ConnectionState;
  onReconnect: () => void;
}

const STATUS_CONFIG: Record<ConnectionState, { label: string; color: string }> = {
  connected: { label: 'Connected', color: 'connected' },
  connecting: { label: 'Connecting...', color: 'connecting' },
  disconnected: { label: 'Disconnected', color: 'disconnected' },
  error: { label: 'Error', color: 'error' },
};

export function ConnectionStatus({ state, onReconnect }: ConnectionStatusProps) {
  const config = STATUS_CONFIG[state];

  return (
    <div className="flex items-center gap-2">
      <span className={`status-dot ${config.color}`} />
      <span className="text-sm text-claude-gray-600">{config.label}</span>
      {(state === 'disconnected' || state === 'error') && (
        <button
          onClick={onReconnect}
          className="text-sm text-claude-orange hover:text-claude-orange-dark underline"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
