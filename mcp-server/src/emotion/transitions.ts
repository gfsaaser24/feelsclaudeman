/**
 * Viral Moment Detection for FeelsClaudeMan
 *
 * Tracks emotional transitions and detects viral-worthy sequences
 */

export interface ViralSequence {
  name: string;
  pattern: string[];
  viralityScore: number;
  description: string;
}

export interface DetectedViralMoment {
  sequence: ViralSequence;
  thoughtIds: number[];
  timestamp: string;
}

const VIRAL_SEQUENCES: ViralSequence[] = [
  {
    name: 'The Struggle Bus Arrives',
    pattern: ['frustrated', 'frustrated', 'eureka'],
    viralityScore: 10,
    description: 'Struggled hard, then breakthrough!'
  },
  {
    name: 'Against All Odds',
    pattern: ['this_is_fine', 'this_is_fine', 'nailed_it'],
    viralityScore: 10,
    description: 'Everything was on fire, but we made it'
  },
  {
    name: 'Hubris',
    pattern: ['big_brain', 'facepalm'],
    viralityScore: 10,
    description: 'Felt smart, immediately proven wrong'
  },
  {
    name: 'The Comeback Kid',
    pattern: ['dumpster_fire', 'nailed_it'],
    viralityScore: 9,
    description: 'From disaster to victory'
  },
  {
    name: 'YOLO Success',
    pattern: ['sweating', 'nailed_it'],
    viralityScore: 9,
    description: 'Risky move that paid off'
  },
  {
    name: 'Triple Facepalm',
    pattern: ['facepalm', 'facepalm', 'facepalm'],
    viralityScore: 10,
    description: 'Three mistakes in a row'
  },
  {
    name: 'Emotional Rollercoaster',
    pattern: ['nailed_it', 'facepalm', 'nailed_it'],
    viralityScore: 8,
    description: 'Up, down, up again'
  },
  {
    name: 'The Long Night',
    pattern: ['confused_math', 'confused_math', 'confused_math', 'eureka'],
    viralityScore: 9,
    description: 'Long confusion finally resolved'
  },
  {
    name: 'Speedrun Any%',
    pattern: ['here_we_go', 'nailed_it'],
    viralityScore: 7,
    description: 'Quick attempt, immediate success'
  },
  {
    name: 'The Plot Thickens',
    pattern: ['eureka', 'plot_twist', 'confused_math'],
    viralityScore: 8,
    description: 'Thought we understood, then twist!'
  },
  {
    name: 'Chaos Goblin',
    pattern: ['this_is_fine', 'this_is_fine', 'this_is_fine'],
    viralityScore: 8,
    description: 'Embracing the chaos'
  },
  {
    name: 'Rising Phoenix',
    pattern: ['table_flip', 'eureka', 'chefs_kiss'],
    viralityScore: 10,
    description: 'Rage, discovery, perfection'
  }
];

// Emotion category mapping for flexible matching
const EMOTION_CATEGORIES: Record<string, string[]> = {
  frustrated: ['frustrated', 'facepalm', 'table_flip', 'internal_screaming'],
  success: ['nailed_it', 'big_brain', 'chefs_kiss', 'success'],
  chaos: ['this_is_fine', 'dumpster_fire'],
  confused: ['confused_math', 'loading'],
  discovery: ['eureka', 'plot_twist', 'mind_blown'],
  nervous: ['sweating', 'here_we_go'],
  rare: ['one_punch_solution', 'butterfly_effect', 'archaeologist', 'stack_overflow_prophet']
};

export class TransitionDetector {
  private recentEmotions: Array<{ emotion: string; thoughtId: number; timestamp: string }> = [];
  private maxHistory = 20;

  /**
   * Add an emotion to the history and check for viral moments
   */
  addEmotion(emotion: string, thoughtId: number): DetectedViralMoment | null {
    const timestamp = new Date().toISOString();

    this.recentEmotions.push({ emotion, thoughtId, timestamp });

    // Keep history bounded
    if (this.recentEmotions.length > this.maxHistory) {
      this.recentEmotions.shift();
    }

    // Check for viral sequences
    return this.detectViralMoment();
  }

  /**
   * Check if recent emotions match any viral sequence
   */
  private detectViralMoment(): DetectedViralMoment | null {
    const recentEmotionNames = this.recentEmotions.map(e => e.emotion);

    for (const sequence of VIRAL_SEQUENCES) {
      const matchResult = this.matchSequence(recentEmotionNames, sequence.pattern);

      if (matchResult) {
        const thoughtIds = matchResult.indices.map(i => this.recentEmotions[i].thoughtId);

        // Clear matched emotions to avoid duplicate detection
        for (const idx of matchResult.indices.reverse()) {
          this.recentEmotions.splice(idx, 1);
        }

        return {
          sequence,
          thoughtIds,
          timestamp: new Date().toISOString()
        };
      }
    }

    return null;
  }

  /**
   * Match a pattern against recent emotions with category flexibility
   */
  private matchSequence(
    emotions: string[],
    pattern: string[]
  ): { indices: number[] } | null {
    if (emotions.length < pattern.length) {
      return null;
    }

    // Check the last N emotions where N is pattern length
    const startIdx = emotions.length - pattern.length;
    const toCheck = emotions.slice(startIdx);

    const indices: number[] = [];

    for (let i = 0; i < pattern.length; i++) {
      const requiredEmotion = pattern[i];
      const actualEmotion = toCheck[i];

      if (this.emotionMatches(actualEmotion, requiredEmotion)) {
        indices.push(startIdx + i);
      } else {
        return null;
      }
    }

    return { indices };
  }

  /**
   * Check if an emotion matches a requirement (exact or category)
   */
  private emotionMatches(actual: string, required: string): boolean {
    // Exact match
    if (actual === required) {
      return true;
    }

    // Category match
    const category = EMOTION_CATEGORIES[required];
    if (category && category.includes(actual)) {
      return true;
    }

    return false;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    emotionCounts: Record<string, number>;
    volatility: number;
    dominantEmotion: string;
  } {
    const counts: Record<string, number> = {};

    for (const { emotion } of this.recentEmotions) {
      counts[emotion] = (counts[emotion] || 0) + 1;
    }

    // Calculate volatility (how often emotions change)
    let changes = 0;
    for (let i = 1; i < this.recentEmotions.length; i++) {
      if (this.recentEmotions[i].emotion !== this.recentEmotions[i - 1].emotion) {
        changes++;
      }
    }
    const volatility = this.recentEmotions.length > 1
      ? changes / (this.recentEmotions.length - 1)
      : 0;

    // Find dominant emotion
    let dominantEmotion = 'neutral';
    let maxCount = 0;
    for (const [emotion, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    }

    return { emotionCounts: counts, volatility, dominantEmotion };
  }

  /**
   * Clear history (for new session)
   */
  clear(): void {
    this.recentEmotions = [];
  }

  /**
   * Get all viral sequence definitions
   */
  getViralSequences(): ViralSequence[] {
    return VIRAL_SEQUENCES;
  }
}
