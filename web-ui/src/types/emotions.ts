/**
 * TypeScript types for FeelsClaudeMan Web UI
 */

export interface Thought {
  id: number;
  session_id: string;
  timestamp: string;
  tool_name?: string;
  tool_input?: string;
  tool_result?: string;
  tool_success?: boolean;
  thinking_block?: string;
  reasoning?: string;
  internal_monologue?: string;
  meta_observation?: string;
  meta_commentary?: string;  // Haiku 4.5's witty commentary on Claude's thinking
  context_usage?: number;
  emotion?: string;
  gif_search?: string;
  gif_url?: string;
  gif_title?: string;
  gif_id?: string;
  intensity: number;
  display_mode: 'normal' | 'fullscreen' | 'split' | 'sequence' | 'chaos';
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
  started_at: string;
  ended_at?: string;
  project_dir?: string;
  total_thoughts: number;
  dominant_vibe?: string;
  highlight_thought_id?: number;
  summary?: string;
}

export interface ViralMoment {
  id: number;
  session_id: string;
  timestamp: string;
  sequence_name: string;
  thought_ids: string;
  virality_score: number;
  shared: boolean;
  share_url?: string;
}

export interface Achievement {
  id: number;
  achievement_id: string;
  unlocked_at: string;
  unlocked_by_thought_id?: number;
}

export interface SessionStats {
  totalThoughts: number;
  emotionCounts: Record<string, number>;
  avgIntensity: number;
  viralMoments: number;
  volatility: number;
  dominantEmotion: string;
}

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

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
