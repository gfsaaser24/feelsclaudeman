/**
 * WebSocket Server for FeelsClaudeMan
 *
 * Broadcasts real-time emotion updates to connected browser UIs.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Thought, ViralMoment, Session, Achievement } from '../db/client.js';

export type WebSocketEventType =
  | 'thought'
  | 'viral_moment'
  | 'session_start'
  | 'session_end'
  | 'achievement'
  | 'stats'
  | 'connection';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data: unknown;
  timestamp: string;
}

export class FeelsWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private port: number;

  constructor(port?: number) {
    this.port = port || parseInt(process.env.FEELS_UI_PORT || '3848', 10);
  }

  /**
   * Start the WebSocket server
   */
  start(): void {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`[WebSocket] Client connected (total: ${this.clients.size})`);

      // Send welcome message
      this.sendTo(ws, {
        type: 'connection',
        data: { status: 'connected', clientCount: this.clients.size },
        timestamp: new Date().toISOString()
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WebSocket] Client disconnected (total: ${this.clients.size})`);
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Client error:', error);
        this.clients.delete(ws);
      });
    });

    this.wss.on('error', (error) => {
      console.error('[WebSocket] Server error:', error);
    });

    console.log(`[WebSocket] Server started on port ${this.port}`);
  }

  /**
   * Broadcast a new thought to all clients
   */
  broadcastThought(thought: Thought): void {
    this.broadcast({
      type: 'thought',
      data: thought,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast a viral moment
   */
  broadcastViralMoment(moment: ViralMoment, sequenceName: string, viralityScore: number): void {
    this.broadcast({
      type: 'viral_moment',
      data: { ...moment, sequenceName, viralityScore },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast session start
   */
  broadcastSessionStart(session: Session): void {
    this.broadcast({
      type: 'session_start',
      data: session,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast session end
   */
  broadcastSessionEnd(session: Session): void {
    this.broadcast({
      type: 'session_end',
      data: session,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast achievement unlock
   */
  broadcastAchievement(achievement: Achievement): void {
    this.broadcast({
      type: 'achievement',
      data: achievement,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast session stats
   */
  broadcastStats(stats: {
    totalThoughts: number;
    emotionCounts: Record<string, number>;
    avgIntensity: number;
    viralMoments: number;
    volatility: number;
    dominantEmotion: string;
  }): void {
    this.broadcast({
      type: 'stats',
      data: stats,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }

    if (this.clients.size > 0) {
      console.log(`[WebSocket] Broadcast ${message.type} to ${this.clients.size} clients`);
    }
  }

  /**
   * Send message to a specific client
   */
  private sendTo(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (this.wss) {
      for (const client of this.clients) {
        client.close();
      }
      this.clients.clear();
      this.wss.close();
      this.wss = null;
      console.log('[WebSocket] Server stopped');
    }
  }
}
