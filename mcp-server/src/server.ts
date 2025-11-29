/**
 * MCP Server for FeelsClaudeMan (Status/Query Only)
 *
 * Architecture: Daemon handles all emotion processing, this server only provides:
 * - MCP tools for Claude to query emotions from the shared database
 * - HTTP health endpoint for status checks
 *
 * NOTE: WebSocket and emotion processing are handled by the Python daemon.
 * This server reads from the same SQLite database as the daemon.
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

// Generate internal monologue based on emotion when not provided by Claude mode
function generateInternalMonologue(emotion: string, toolName?: string, toolSuccess?: boolean): string {
  const monologues: Record<string, string[]> = {
    nailed_it: [
      "That went exactly as planned",
      "Clean execution, no surprises",
      "Everything clicked into place",
    ],
    big_brain: [
      "Found a clever approach here",
      "This solution is elegant",
      "Optimized and ready to go",
    ],
    chefs_kiss: [
      "This is exactly what we needed",
      "Perfectly structured",
      "Can't improve on this",
    ],
    this_is_fine: [
      "Working around some quirks here",
      "Not ideal, but it works",
      "We'll refactor this later...",
    ],
    dumpster_fire: [
      "Well, that escalated quickly",
      "Multiple issues to address",
      "Let's take this one step at a time",
    ],
    confused_math: [
      "Need to understand this better",
      "Something's not adding up",
      "Let me think through this",
    ],
    thinking: [
      "Processing the requirements",
      "Analyzing the approach",
      "Working through the logic",
    ],
    frustrated: [
      "This is proving challenging",
      "Need a different approach",
      "Not getting the expected results",
    ],
    curious: [
      "Interesting... let me explore this",
      "What happens if we try this?",
      "Digging deeper into the details",
    ],
    determined: [
      "We're going to solve this",
      "Pushing through systematically",
      "Almost there, keep going",
    ],
  };

  const emotionTexts = monologues[emotion] || [
    `Executing ${toolName || 'operation'}`,
    "Working on it...",
    "Processing...",
  ];

  return emotionTexts[Math.floor(Math.random() * emotionTexts.length)];
}

// Generate witty meta-commentary based on the emotion/context
function generateMetaCommentary(emotion: string, toolName?: string, intensity: number = 5): string {
  const commentaries: Record<string, string[]> = {
    frustrated: [
      "Classic Claude move: blame the tools, not the vibes",
      "When your carefully crafted logic meets reality...",
      "Error messages are just debugging's love language",
    ],
    excited: [
      "That dopamine hit when code compiles first try",
      "Claude's having a main character moment right now",
      "This is the AI equivalent of caffeinated joy",
    ],
    confused: [
      "Somewhere, a rubber duck is sighing",
      "When the documentation says 'it just works'... but it doesn't",
      "Plot twist: even AI has moments of 'wait what'",
    ],
    success: [
      "Nailed it. Time for a virtual fist pump",
      "This is Claude's 'I told you it would work' face",
      "Stack overflow copypasta? Never heard of it",
    ],
    thinking: [
      "The gears are turning, coffee is brewing",
      "Loading wisdom... please hold",
      "Deep in the thought mines",
    ],
    creative: [
      "When inspiration strikes at 3am (for an AI that doesn't sleep)",
      "This is what peak performance looks like",
      "Picasso wishes he could iterate this fast",
    ],
    curious: [
      "Down the rabbit hole we go",
      "Claude's inner detective has entered the chat",
      "Let me just check one more thing...",
    ],
    determined: [
      "Claude has entered beast mode",
      "Nothing can stop this productivity train",
      "Obstacles? More like stepping stones",
    ],
    relieved: [
      "Crisis averted. Resume normal breathing",
      "That was closer than Claude wants to admit",
      "The universe has restored balance",
    ],
    proud: [
      "Time to add this to the portfolio",
      "Someone screenshot this moment",
      "Claude's LinkedIn just updated itself",
    ],
  };

  const emotionComments = commentaries[emotion] || [
    "Just vibing in the codebase",
    "Another day, another tool call",
    "The AI experience™",
  ];

  return emotionComments[Math.floor(Math.random() * emotionComments.length)];
}
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
          role: 'status-only',
          session: this.currentSessionId,
          note: 'WebSocket and emotion processing handled by daemon on port 3848'
        }));
        return;
      }

      // Hook endpoint - DEPRECATED: Daemon handles hooks via feed file
      if (req.method === 'POST' && url.pathname === '/hook') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'Hook processing moved to daemon',
          note: 'Hooks now write to ~/.claude/feels-feed.jsonl for daemon to process'
        }));
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
    context_usage?: number;
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
        const internalMonologue = detection.vibeCheck || generateInternalMonologue(detection.emotion, data.tool_name, data.tool_success);
        const thought: Thought = {
          session_id: this.currentSessionId,
          tool_name: data.tool_name,
          tool_input: data.tool_input,
          tool_result: data.tool_result,
          tool_success: data.tool_success,
          thinking_block: data.thinking_excerpt,
          internal_monologue: internalMonologue,
          emotion: detection.emotion,
          meta_commentary: generateMetaCommentary(detection.emotion, data.tool_name, detection.intensity),
          context_usage: data.context_usage,
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
    console.log('[FeelsClaudeMan] Starting MCP server (status/query only)...');
    console.log('[FeelsClaudeMan] NOTE: Daemon handles WebSocket and emotion processing');

    // NOTE: WebSocket server NOT started - daemon handles real-time updates
    // this.wsServer.start();

    // Start HTTP server (health checks only)
    this.startHttpServer();

    // Start MCP server
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);

    console.log('[FeelsClaudeMan] MCP server started successfully');
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
