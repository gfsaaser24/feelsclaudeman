'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import type {
  Thought,
  Session,
  ViralMoment,
  Achievement,
  SessionStats,
  WebSocketMessage,
  ConnectionState,
} from '@/types/emotions';

const WS_URL = 'ws://localhost:3848';
const RECONNECT_DELAY = 3000;
const MAX_THOUGHTS_HISTORY = 50;

// Preload GIF image to ensure it's ready when we display it
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (!url) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Continue even if load fails
    img.src = url;
    // Timeout after 2 seconds to not block too long
    setTimeout(resolve, 2000);
  });
}

export interface WebSocketState {
  connectionState: ConnectionState;
  currentThought: Thought | null;
  thoughts: Thought[];
  currentSession: Session | null;
  viralMoments: ViralMoment[];
  achievements: Achievement[];
  stats: SessionStats | null;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(): WebSocketState {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [currentThought, setCurrentThought] = useState<Thought | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [viralMoments, setViralMoments] = useState<ViralMoment[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingThoughtRef = useRef<Thought | null>(null);

  // Process thought with preloaded GIF - atomic update
  const processThought = useCallback(async (thought: Thought) => {
    // Preload the GIF first
    if (thought.gif_url) {
      await preloadImage(thought.gif_url);
    }

    // Use flushSync to ensure both updates happen in the same render
    flushSync(() => {
      setCurrentThought(thought);
      setThoughts((prev) => {
        // Add new thought at the beginning, sorted by timestamp (newest first)
        const updated = [thought, ...prev.filter(t => t.id !== thought.id)];
        // Sort by timestamp descending to ensure newest is always first
        updated.sort((a, b) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        return updated.slice(0, MAX_THOUGHTS_HISTORY);
      });
    });
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'thought': {
          const thought = message.data as Thought;
          // Process thought with GIF preloading for synchronized update
          processThought(thought);
          break;
        }

        case 'viral_moment': {
          const moment = message.data as ViralMoment;
          setViralMoments((prev) => [moment, ...prev]);
          break;
        }

        case 'session_start': {
          const session = message.data as Session;
          setCurrentSession(session);
          setThoughts([]);
          setViralMoments([]);
          break;
        }

        case 'session_end': {
          const session = message.data as Session;
          setCurrentSession(session);
          break;
        }

        case 'achievement': {
          const achievement = message.data as Achievement;
          setAchievements((prev) => [achievement, ...prev]);
          break;
        }

        case 'stats': {
          const newStats = message.data as SessionStats;
          setStats(newStats);
          break;
        }

        case 'connection': {
          console.log('[WebSocket] Connection confirmed');
          break;
        }
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }, [processThought]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnectionState('connected');
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setConnectionState('disconnected');
        wsRef.current = null;

        // Auto-reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY);
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionState('error');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      setConnectionState('error');
    }
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('disconnected');
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionState,
    currentThought,
    thoughts,
    currentSession,
    viralMoments,
    achievements,
    stats,
    connect,
    disconnect,
  };
}
