/**
 * Main MCP Server for FeelsClaudeMan
 *
 * Provides:
 * - HTTP listener for hook events (port 3847)
 * - MCP tools for Claude to query emotions
 * - WebSocket server for real-time UI updates (port 3848)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import http from 'http';
import { URL } from 'url';

import { DatabaseClient, Thought } from './db/client.js';
import { GiphyClient } from './giphy/client.js';
import { EmotionDetector, DetectionMode } from './emotion/detector.js';
import { FeelsWebSocketServer } from './websocket/server.js';

export class FeelsClaudeManServer {
  private mcpServer: Server;
  private httpServer: http.Server | null = null;
  private db: DatabaseClient;
  private giphy: GiphyClient;
  private emotionDetector: EmotionDetector;
  private wsServer: FeelsWebSocketServer;
  private httpPort: number;
  private currentSessionId: string | null = null;

  constructor() {
    this.httpPort = parseInt(process.env.FEELS_PORT || '3847', 10);

    // Initialize components
    this.db = new DatabaseClient();
    this.giphy = new GiphyClient();
    this.emotionDetector = new EmotionDetector();
    this.wsServer = new FeelsWebSocketServer();

    // Initialize MCP server
    this.mcpServer = new Server(
      { name: 'feelsclaudeman', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.setupMCPTools();
  }

  /**
   * Setup MCP tools
   */
  private setupMCPTools(): void {
    // List tools
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_current_emotion',
          description: 'Get the most recent detected emotion and GIF',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'get_emotion_history',
          description: 'Get recent emotion timeline',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Max results (default 10)' }
            }
          }
        },
        {
          name: 'set_detection_mode',
          description: 'Change emotion detection mode',
          inputSchema: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                enum: ['pattern', 'claude', 'hybrid'],
                description: 'Detection mode'
              }
            },
            required: ['mode']
          }
        },
        {
          name: 'get_session_stats',
          description: 'Get statistics for current session',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'get_viral_moments',
          description: 'Get detected viral moments',
          inputSchema: { type: 'object', properties: {} }
        }
      ]
    }));

    // Handle tool calls
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'get_current_emotion': {
          if (!this.currentSessionId) {
            return { content: [{ type: 'text', text: 'No active session' }] };
          }
          const thought = this.db.getLatestThought(this.currentSessionId);
          return {
            content: [{
              type: 'text',
              text: thought ? JSON.stringify(thought, null, 2) : 'No emotions detected yet'
            }]
          };
        }

        case 'get_emotion_history': {
          if (!this.currentSessionId) {
            return { content: [{ type: 'text', text: 'No active session' }] };
          }
          const limit = (args as { limit?: number })?.limit || 10;
          const thoughts = this.db.getRecentThoughts(this.currentSessionId, limit);
          return {
            content: [{ type: 'text', text: JSON.stringify(thoughts, null, 2) }]
          };
        }

        case 'set_detection_mode': {
          const mode = (args as { mode: DetectionMode }).mode;
          this.emotionDetector.setMode(mode);
          return {
            content: [{ type: 'text', text: `Detection mode set to: ${mode}` }]
          };
        }

        case 'get_session_stats': {
          if (!this.currentSessionId) {
            return { content: [{ type: 'text', text: 'No active session' }] };
          }
          const dbStats = this.db.getSessionStats(this.currentSessionId);
          const detectorStats = this.emotionDetector.getStats();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ ...dbStats, ...detectorStats }, null, 2)
            }]
          };
        }

        case 'get_viral_moments': {
          if (!this.currentSessionId) {
            return { content: [{ type: 'text', text: 'No active session' }] };
          }
          const moments = this.db.getViralMoments(this.currentSessionId);
          return {
            content: [{ type: 'text', text: JSON.stringify(moments, null, 2) }]
          };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
      }
    });
  }

  /**
   * Start HTTP server for hook events
   */
  private startHttpServer(): void {
    this.httpServer = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://localhost:${this.httpPort}`);

      // Health check
      if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          session: this.currentSessionId,
          mode: this.emotionDetector.getMode(),
          wsClients: this.wsServer.getClientCount()
        }));
        return;
      }

      // Hook endpoint
      if (req.method === 'POST' && url.pathname === '/hook') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            // Handle empty body
            if (!body || body.trim() === '') {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Empty request body' }));
              return;
            }

            let data;
            try {
              data = JSON.parse(body);
            } catch (parseError) {
              console.error('[HTTP] JSON parse error:', (parseError as Error).message);
              console.error('[HTTP] Body preview:', body.substring(0, 200));
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
              return;
            }

            await this.handleHookEvent(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            console.error('[HTTP] Hook error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal error' }));
          }
        });
        return;
      }

      // API: Get thoughts
      if (req.method === 'GET' && url.pathname.startsWith('/api/session/')) {
        const parts = url.pathname.split('/');
        const sessionId = parts[3];
        const endpoint = parts[4];

        if (endpoint === 'thoughts') {
          const limit = parseInt(url.searchParams.get('limit') || '50', 10);
          const thoughts = this.db.getRecentThoughts(sessionId, limit);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(thoughts));
          return;
        }

        if (endpoint === 'viral') {
          const moments = this.db.getViralMoments(sessionId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(moments));
          return;
        }
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    this.httpServer.listen(this.httpPort, () => {
      console.log(`[HTTP] Server listening on port ${this.httpPort}`);
    });
  }

  /**
   * Handle incoming hook events
   */
  private async handleHookEvent(data: {
    event_type: string;
    session_id?: string;
    tool_name?: string;
    tool_input?: string;
    tool_result?: string;
    tool_success?: boolean;
    thinking_excerpt?: string;
    prompt_excerpt?: string;
    error_message?: string;
    project_dir?: string;
  }): Promise<void> {
    console.log(`[HTTP] Hook event: ${data.event_type}`);

    switch (data.event_type) {
      case 'sessionstart': {
        const sessionId = data.session_id || `session_${Date.now()}`;
        this.currentSessionId = sessionId;
        const session = this.db.createSession(sessionId, data.project_dir);
        this.emotionDetector.clearHistory();
        this.wsServer.broadcastSessionStart(session);

        // Check first blood achievement
        this.checkAchievement('first_blood', 'First emotion detected');
        break;
      }

      case 'sessionend': {
        if (this.currentSessionId) {
          this.db.endSession(this.currentSessionId);
          const session = this.db.getSession(this.currentSessionId);
          if (session) {
            this.wsServer.broadcastSessionEnd(session);
          }
          this.currentSessionId = null;
        }
        break;
      }

      case 'posttooluse':
      case 'stop': {
        if (!this.currentSessionId) {
          this.currentSessionId = data.session_id || `session_${Date.now()}`;
          this.db.createSession(this.currentSessionId);
        }

        // Detect emotion
        const detection = await this.emotionDetector.detect(
          data.tool_name,
          data.tool_input,
          data.tool_result,
          data.tool_success,
          data.thinking_excerpt
        );

        // Search for GIF
        const gif = await this.giphy.search(detection.gifSearch);

        // Create thought record
        const thought: Thought = {
          session_id: this.currentSessionId,
          tool_name: data.tool_name,
          tool_input: data.tool_input,
          tool_result: data.tool_result,
          tool_success: data.tool_success,
          thinking_block: data.thinking_excerpt,
          internal_monologue: detection.vibeCheck,
          gif_search: detection.gifSearch,
          gif_url: gif.gif_url,
          gif_title: gif.gif_title,
          gif_id: gif.gif_id,
          intensity: detection.intensity,
          display_mode: detection.displayMode,
          caption: detection.caption,
          prompt_excerpt: data.prompt_excerpt,
          error_message: data.error_message,
          tags: JSON.stringify(detection.tags),
          is_viral_moment: !!detection.viralMoment,
          is_rare_emotion: detection.isRare
        };

        const thoughtId = this.db.insertThought(thought);
        thought.id = thoughtId;

        // Broadcast to UI
        this.wsServer.broadcastThought(thought);

        // Handle viral moment
        if (detection.viralMoment) {
          const viralMoment = {
            session_id: this.currentSessionId,
            sequence_name: detection.viralMoment.sequence.name,
            thought_ids: JSON.stringify(detection.viralMoment.thoughtIds),
            virality_score: detection.viralMoment.sequence.viralityScore
          };
          this.db.insertViralMoment(viralMoment);
          this.wsServer.broadcastViralMoment(
            viralMoment,
            detection.viralMoment.sequence.name,
            detection.viralMoment.sequence.viralityScore
          );
        }

        // Check rare emotion achievement
        if (detection.isRare) {
          this.checkAchievement('rare_emotion', `Rare emotion: ${detection.emotion}`);
        }

        // Broadcast updated stats
        const stats = this.db.getSessionStats(this.currentSessionId);
        const detectorStats = this.emotionDetector.getStats();
        this.wsServer.broadcastStats({ ...stats, ...detectorStats });

        break;
      }
    }
  }

  /**
   * Check and unlock achievement
   */
  private checkAchievement(achievementId: string, _description: string): void {
    const unlocked = this.db.unlockAchievement(achievementId);
    if (unlocked) {
      const achievements = this.db.getAchievements();
      const achievement = achievements.find(a => a.achievement_id === achievementId);
      if (achievement) {
        this.wsServer.broadcastAchievement(achievement);
        console.log(`[Achievement] Unlocked: ${achievementId}`);
      }
    }
  }

  /**
   * Start all servers
   */
  async start(): Promise<void> {
    console.log('[FeelsClaudeMan] Starting server...');

    // Start WebSocket server
    this.wsServer.start();

    // Start HTTP server
    this.startHttpServer();

    // Start MCP server
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);

    console.log('[FeelsClaudeMan] Server started successfully');
  }

  /**
   * Stop all servers
   */
  stop(): void {
    this.wsServer.stop();
    if (this.httpServer) {
      this.httpServer.close();
    }
    this.db.close();
    console.log('[FeelsClaudeMan] Server stopped');
  }
}
