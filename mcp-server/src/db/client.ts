/**
 * SQLite Database Client for FeelsClaudeMan
 *
 * Stores the complete thought archive including:
 * - Tool usage and results
 * - Claude's thinking blocks
 * - Detected emotions and GIFs
 * - Sessions and viral moments
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface Thought {
  id?: number;
  session_id: string;
  timestamp?: string;
  tool_name?: string;
  tool_input?: string;
  tool_result?: string;
  tool_success?: boolean;
  thinking_block?: string;
  reasoning?: string;
  internal_monologue?: string;
  gif_search?: string;
  gif_url?: string;
  gif_title?: string;
  gif_id?: string;
  intensity?: number;
  display_mode?: string;
  caption?: string;
  prompt_excerpt?: string;
  conversation_context?: string;
  error_message?: string;
  tags?: string;
  is_viral_moment?: boolean;
  is_rare_emotion?: boolean;
}

export interface Session {
  id: string;
  started_at?: string;
  ended_at?: string;
  project_dir?: string;
  total_thoughts?: number;
  dominant_vibe?: string;
  highlight_thought_id?: number;
  summary?: string;
}

export interface ViralMoment {
  id?: number;
  session_id: string;
  timestamp?: string;
  sequence_name: string;
  thought_ids: string;
  virality_score: number;
  shared?: boolean;
  share_url?: string;
}

export interface Achievement {
  id?: number;
  achievement_id: string;
  unlocked_at?: string;
  unlocked_by_thought_id?: number;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS thoughts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    tool_name TEXT,
    tool_input TEXT,
    tool_result TEXT,
    tool_success BOOLEAN,
    thinking_block TEXT,
    reasoning TEXT,
    internal_monologue TEXT,
    gif_search TEXT,
    gif_url TEXT,
    gif_title TEXT,
    gif_id TEXT,
    intensity INTEGER DEFAULT 5,
    display_mode TEXT DEFAULT 'normal',
    caption TEXT,
    prompt_excerpt TEXT,
    conversation_context TEXT,
    error_message TEXT,
    tags TEXT,
    is_viral_moment BOOLEAN DEFAULT FALSE,
    is_rare_emotion BOOLEAN DEFAULT FALSE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    project_dir TEXT,
    total_thoughts INTEGER DEFAULT 0,
    dominant_vibe TEXT,
    highlight_thought_id INTEGER,
    summary TEXT
  );

  CREATE TABLE IF NOT EXISTS viral_moments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    sequence_name TEXT,
    thought_ids TEXT,
    virality_score INTEGER,
    shared BOOLEAN DEFAULT FALSE,
    share_url TEXT
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    achievement_id TEXT UNIQUE,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    unlocked_by_thought_id INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_thoughts_session ON thoughts(session_id);
  CREATE INDEX IF NOT EXISTS idx_thoughts_timestamp ON thoughts(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_thoughts_tool ON thoughts(tool_name);
  CREATE INDEX IF NOT EXISTS idx_thoughts_intensity ON thoughts(intensity);
  CREATE INDEX IF NOT EXISTS idx_thoughts_viral ON thoughts(is_viral_moment);
`;

export class DatabaseClient {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const finalPath = dbPath || process.env.DB_PATH || './data/feelsclaudeman.db';

    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(finalPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
    console.log('[Database] Initialized at ' + finalPath);
  }

  private initSchema(): void {
    this.db.exec(SCHEMA_SQL);
  }

  createSession(id: string, projectDir?: string): Session {
    const stmt = this.db.prepare(
      'INSERT INTO sessions (id, project_dir) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET started_at = CURRENT_TIMESTAMP'
    );
    stmt.run(id, projectDir || null);
    return this.getSession(id)!;
  }

  getSession(id: string): Session | undefined {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    return stmt.get(id) as Session | undefined;
  }

  endSession(id: string): void {
    const stmt = this.db.prepare('UPDATE sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
  }

  insertThought(thought: Thought): number {
    const stmt = this.db.prepare(`
      INSERT INTO thoughts (
        session_id, tool_name, tool_input, tool_result, tool_success,
        thinking_block, reasoning, internal_monologue,
        gif_search, gif_url, gif_title, gif_id, intensity, display_mode, caption,
        prompt_excerpt, conversation_context, error_message,
        tags, is_viral_moment, is_rare_emotion
      ) VALUES (
        @session_id, @tool_name, @tool_input, @tool_result, @tool_success,
        @thinking_block, @reasoning, @internal_monologue,
        @gif_search, @gif_url, @gif_title, @gif_id, @intensity, @display_mode, @caption,
        @prompt_excerpt, @conversation_context, @error_message,
        @tags, @is_viral_moment, @is_rare_emotion
      )
    `);

    const toolResultTruncated = thought.tool_result ? thought.tool_result.substring(0, 2000) : null;

    const result = stmt.run({
      session_id: thought.session_id,
      tool_name: thought.tool_name || null,
      tool_input: thought.tool_input || null,
      tool_result: toolResultTruncated,
      tool_success: thought.tool_success === undefined ? null : (thought.tool_success ? 1 : 0),
      thinking_block: thought.thinking_block || null,
      reasoning: thought.reasoning || null,
      internal_monologue: thought.internal_monologue || null,
      gif_search: thought.gif_search || null,
      gif_url: thought.gif_url || null,
      gif_title: thought.gif_title || null,
      gif_id: thought.gif_id || null,
      intensity: thought.intensity ?? 5,
      display_mode: thought.display_mode || 'normal',
      caption: thought.caption || null,
      prompt_excerpt: thought.prompt_excerpt || null,
      conversation_context: thought.conversation_context || null,
      error_message: thought.error_message || null,
      tags: thought.tags || null,
      is_viral_moment: thought.is_viral_moment ? 1 : 0,
      is_rare_emotion: thought.is_rare_emotion ? 1 : 0
    });

    this.db.prepare('UPDATE sessions SET total_thoughts = total_thoughts + 1 WHERE id = ?').run(thought.session_id);

    return result.lastInsertRowid as number;
  }

  getThought(id: number): Thought | undefined {
    const stmt = this.db.prepare('SELECT * FROM thoughts WHERE id = ?');
    return stmt.get(id) as Thought | undefined;
  }

  getRecentThoughts(sessionId: string, limit: number = 50): Thought[] {
    const stmt = this.db.prepare('SELECT * FROM thoughts WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?');
    return stmt.all(sessionId, limit) as Thought[];
  }

  getLatestThought(sessionId: string): Thought | undefined {
    const stmt = this.db.prepare('SELECT * FROM thoughts WHERE session_id = ? ORDER BY timestamp DESC LIMIT 1');
    return stmt.get(sessionId) as Thought | undefined;
  }

  insertViralMoment(moment: ViralMoment): number {
    const stmt = this.db.prepare(
      'INSERT INTO viral_moments (session_id, sequence_name, thought_ids, virality_score) VALUES (@session_id, @sequence_name, @thought_ids, @virality_score)'
    );
    const result = stmt.run(moment);
    return result.lastInsertRowid as number;
  }

  getViralMoments(sessionId: string): ViralMoment[] {
    const stmt = this.db.prepare('SELECT * FROM viral_moments WHERE session_id = ? ORDER BY timestamp DESC');
    return stmt.all(sessionId) as ViralMoment[];
  }

  unlockAchievement(achievementId: string, thoughtId?: number): boolean {
    const existing = this.db.prepare('SELECT * FROM achievements WHERE achievement_id = ?').get(achievementId);
    if (existing) return false;

    const stmt = this.db.prepare('INSERT INTO achievements (achievement_id, unlocked_by_thought_id) VALUES (?, ?)');
    stmt.run(achievementId, thoughtId || null);
    return true;
  }

  getAchievements(): Achievement[] {
    const stmt = this.db.prepare('SELECT * FROM achievements ORDER BY unlocked_at DESC');
    return stmt.all() as Achievement[];
  }

  getSessionStats(sessionId: string): {
    totalThoughts: number;
    emotionCounts: Record<string, number>;
    avgIntensity: number;
    viralMoments: number;
  } {
    const thoughts = this.getRecentThoughts(sessionId, 1000);
    const viralMoments = this.getViralMoments(sessionId);

    const emotionCounts: Record<string, number> = {};
    let totalIntensity = 0;

    for (const thought of thoughts) {
      if (thought.gif_search) {
        emotionCounts[thought.gif_search] = (emotionCounts[thought.gif_search] || 0) + 1;
      }
      totalIntensity += thought.intensity || 5;
    }

    return {
      totalThoughts: thoughts.length,
      emotionCounts,
      avgIntensity: thoughts.length > 0 ? totalIntensity / thoughts.length : 5,
      viralMoments: viralMoments.length
    };
  }

  close(): void {
    this.db.close();
  }
}
