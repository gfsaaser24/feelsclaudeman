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

const WS_URL = 'ws://localhost:3848';  // Daemon WebSocket (core emotion processing)
const HTTP_API_URL = 'http://localhost:3849';  // Daemon HTTP API (purge, stats, etc.)
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
  purgeData: () => Promise<{ success: boolean; message: string }>;
  isPurging: boolean;
}

export function useWebSocket(): WebSocketState {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [currentThought, setCurrentThought] = useState<Thought | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [viralMoments, setViralMoments] = useState<ViralMoment[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Use ref to store latest state setters to avoid dependency issues
  const stateRef = useRef({
    setCurrentThought,
    setThoughts,
    setCurrentSession,
    setViralMoments,
    setAchievements,
    setStats,
    setConnectionState,
  });

  // Process thought with preloaded GIF - atomic update
  const processThought = useCallback(async (thought: Thought) => {
    // Preload the GIF first
    if (thought.gif_url) {
      await preloadImage(thought.gif_url);
    }

    if (!mountedRef.current) return;

    // Use flushSync to ensure both updates happen in the same render
    flushSync(() => {
      stateRef.current.setCurrentThought(thought);
      stateRef.current.setThoughts((prev) => {
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

  // Auto-connect on mount - stable effect with no dependencies
  useEffect(() => {
    mountedRef.current = true;

    const handleMessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;

      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'thought': {
            const thought = message.data as Thought;
            processThought(thought);
            break;
          }

          case 'viral_moment': {
            const moment = message.data as ViralMoment;
            stateRef.current.setViralMoments((prev) => [moment, ...prev]);
            break;
          }

          case 'session_start': {
            const session = message.data as Session;
            stateRef.current.setCurrentSession(session);
            stateRef.current.setThoughts([]);
            stateRef.current.setViralMoments([]);
            break;
          }

          case 'session_end': {
            const session = message.data as Session;
            stateRef.current.setCurrentSession(session);
            break;
          }

          case 'achievement': {
            const achievement = message.data as Achievement;
            stateRef.current.setAchievements((prev) => [achievement, ...prev]);
            break;
          }

          case 'stats': {
            const newStats = message.data as SessionStats;
            stateRef.current.setStats(newStats);
            break;
          }

          case 'connection': {
            console.log('[WebSocket] Connection confirmed');
            break;
          }

          case 'purge': {
            // Server has purged all data - clear local state
            console.log('[WebSocket] Data purged by server');
            stateRef.current.setCurrentThought(null);
            stateRef.current.setThoughts([]);
            stateRef.current.setViralMoments([]);
            stateRef.current.setAchievements([]);
            stateRef.current.setStats(null);
            stateRef.current.setCurrentSession(null);
            break;
          }
        }
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    const connectWs = () => {
      if (!mountedRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      stateRef.current.setConnectionState('connecting');

      try {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          if (!mountedRef.current) {
            ws.close();
            return;
          }
          console.log('[WebSocket] Connected');
          stateRef.current.setConnectionState('connected');
        };

        ws.onmessage = handleMessage;

        ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          if (mountedRef.current) {
            stateRef.current.setConnectionState('disconnected');
            wsRef.current = null;

            // Auto-reconnect only if still mounted
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connectWs();
              }
            }, RECONNECT_DELAY);
          }
        };

        ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          if (mountedRef.current) {
            stateRef.current.setConnectionState('error');
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('[WebSocket] Failed to connect:', error);
        if (mountedRef.current) {
          stateRef.current.setConnectionState('error');
        }
      }
    };

    // Initial connection
    connectWs();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [processThought]); // processThought is stable due to empty deps

  const connect = useCallback(() => {
    // This is now just for manual reconnection
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    // The effect handles connection
  }, []);

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

  const purgeData = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setIsPurging(true);
    try {
      const response = await fetch(`${HTTP_API_URL}/api/purge`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Clear local state immediately (server will also broadcast purge event)
        setCurrentThought(null);
        setThoughts([]);
        setViralMoments([]);
        setAchievements([]);
        setStats(null);
        setCurrentSession(null);
      }

      return { success: data.success, message: data.message };
    } catch (error) {
      console.error('[Purge] Failed:', error);
      return { success: false, message: 'Failed to connect to server' };
    } finally {
      setIsPurging(false);
    }
  }, []);

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
    purgeData,
    isPurging,
  };
}
