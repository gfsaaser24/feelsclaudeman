/**
 * Emotion Detection Orchestrator for FeelsClaudeMan
 *
 * Manages detection modes:
 * - pattern: Fast regex matching (<10ms)
 * - claude: Claude API introspection (1-3s)
 * - hybrid: Pattern first, escalate to Claude if low confidence
 */

import { PatternMatcher, EmotionMatch } from './pattern.js';
import { ClaudeDetector, ClaudeEmotionResult } from './claude.js';
import { TransitionDetector, DetectedViralMoment } from './transitions.js';

export type DetectionMode = 'pattern' | 'claude' | 'hybrid';

export interface DetectionResult {
  emotion: string;
  gifSearch: string;
  intensity: number;
  confidence: number;
  displayMode: string;
  vibeCheck?: string;
  caption?: string;
  isRare: boolean;
  isCreative: boolean;
  tags: string[];
  viralMoment?: DetectedViralMoment;
  detectionMode: DetectionMode;
  detectionTimeMs: number;
}

export class EmotionDetector {
  private patternMatcher: PatternMatcher;
  private claudeDetector: ClaudeDetector;
  private transitionDetector: TransitionDetector;
  private mode: DetectionMode;
  private confidenceThreshold = 0.7;

  constructor(mode?: DetectionMode) {
    this.patternMatcher = new PatternMatcher();
    this.claudeDetector = new ClaudeDetector();
    this.transitionDetector = new TransitionDetector();

    // Default to hybrid if Claude is available, otherwise pattern
    const defaultMode = this.claudeDetector.isAvailable() ? 'hybrid' : 'pattern';
    this.mode = mode || (process.env.FEELS_DETECTION_MODE as DetectionMode) || defaultMode;

    console.log('[Emotion Detector] Mode:', this.mode);
  }

  /**
   * Detect emotion from hook event data
   */
  async detect(
    toolName?: string,
    toolInput?: string,
    toolResult?: string,
    toolSuccess?: boolean,
    thinkingBlock?: string,
    thoughtId?: number
  ): Promise<DetectionResult> {
    const startTime = Date.now();

    let result: DetectionResult;

    switch (this.mode) {
      case 'pattern':
        result = this.detectPattern(toolResult, thinkingBlock, toolName, toolSuccess);
        break;

      case 'claude':
        result = await this.detectClaude(toolName, toolInput, toolResult, toolSuccess, thinkingBlock);
        break;

      case 'hybrid':
      default:
        result = await this.detectHybrid(toolName, toolInput, toolResult, toolSuccess, thinkingBlock);
        break;
    }

    result.detectionTimeMs = Date.now() - startTime;

    // Track for viral moment detection
    if (thoughtId) {
      const viralMoment = this.transitionDetector.addEmotion(result.emotion, thoughtId);
      if (viralMoment) {
        result.viralMoment = viralMoment;
        console.log('[Emotion Detector] Viral moment detected:', viralMoment.sequence.name);
      }
    }

    console.log(
      `[Emotion Detector] ${result.emotion} (${result.intensity}/10) via ${result.detectionMode} in ${result.detectionTimeMs}ms`
    );

    return result;
  }

  /**
   * Pattern-based detection (fast)
   */
  private detectPattern(
    toolResult?: string,
    thinkingBlock?: string,
    toolName?: string,
    toolSuccess?: boolean
  ): DetectionResult {
    const match = this.patternMatcher.detect(toolResult, thinkingBlock, toolName, toolSuccess);

    return {
      emotion: match.emotion,
      gifSearch: match.gifSearch,
      intensity: match.intensity,
      confidence: match.confidence,
      displayMode: match.intensity >= 9 ? 'fullscreen' : 'normal',
      isRare: match.isRare,
      isCreative: false,
      tags: match.tags,
      detectionMode: 'pattern',
      detectionTimeMs: 0
    };
  }

  /**
   * Claude API detection (creative)
   */
  private async detectClaude(
    toolName?: string,
    toolInput?: string,
    toolResult?: string,
    toolSuccess?: boolean,
    thinkingBlock?: string
  ): Promise<DetectionResult> {
    const claudeResult = await this.claudeDetector.detect(
      toolName, toolInput, toolResult, toolSuccess, thinkingBlock
    );

    if (claudeResult) {
      return {
        emotion: 'creative',
        gifSearch: claudeResult.gifSearch,
        intensity: claudeResult.intensity,
        confidence: 0.9,
        displayMode: claudeResult.displayMode,
        vibeCheck: claudeResult.vibeCheck,
        caption: claudeResult.caption,
        isRare: false,
        isCreative: true,
        tags: ['creative', 'claude-generated'],
        detectionMode: 'claude',
        detectionTimeMs: 0
      };
    }

    // Fallback to pattern if Claude fails
    return this.detectPattern(toolResult, thinkingBlock, toolName, toolSuccess);
  }

  /**
   * Hybrid detection (best of both)
   */
  private async detectHybrid(
    toolName?: string,
    toolInput?: string,
    toolResult?: string,
    toolSuccess?: boolean,
    thinkingBlock?: string
  ): Promise<DetectionResult> {
    // Try pattern first (fast)
    const patternResult = this.detectPattern(toolResult, thinkingBlock, toolName, toolSuccess);

    // If confidence is high enough, use pattern result
    if (patternResult.confidence >= this.confidenceThreshold) {
      return patternResult;
    }

    // Low confidence - try Claude if available
    if (this.claudeDetector.isAvailable()) {
      const claudeResult = await this.claudeDetector.detect(
        toolName, toolInput, toolResult, toolSuccess, thinkingBlock
      );

      if (claudeResult) {
        return {
          emotion: patternResult.emotion, // Keep pattern emotion for tracking
          gifSearch: claudeResult.gifSearch, // Use Claude's creative search
          intensity: claudeResult.intensity,
          confidence: 0.85,
          displayMode: claudeResult.displayMode,
          vibeCheck: claudeResult.vibeCheck,
          caption: claudeResult.caption,
          isRare: patternResult.isRare,
          isCreative: true,
          tags: [...patternResult.tags, 'claude-enhanced'],
          detectionMode: 'hybrid',
          detectionTimeMs: 0
        };
      }
    }

    // Return pattern result as fallback
    return patternResult;
  }

  /**
   * Set detection mode
   */
  setMode(mode: DetectionMode): void {
    this.mode = mode;
    console.log('[Emotion Detector] Mode changed to:', mode);
  }

  /**
   * Get current mode
   */
  getMode(): DetectionMode {
    return this.mode;
  }

  /**
   * Get session statistics from transition detector
   */
  getStats() {
    return this.transitionDetector.getStats();
  }

  /**
   * Clear transition history (for new session)
   */
  clearHistory(): void {
    this.transitionDetector.clear();
  }

  /**
   * Get available emotions
   */
  getAvailableEmotions(): string[] {
    return this.patternMatcher.getAvailableEmotions();
  }

  /**
   * Get rare emotions
   */
  getRareEmotions(): string[] {
    return this.patternMatcher.getRareEmotions();
  }

  /**
   * Get viral sequences
   */
  getViralSequences() {
    return this.transitionDetector.getViralSequences();
  }
}
