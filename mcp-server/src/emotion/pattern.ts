/**
 * Fast Pattern-Based Emotion Detection for FeelsClaudeMan
 *
 * Regex-based emotion detection with <10ms target latency.
 * Maps tool results and thinking patterns to emotions.
 */

export interface EmotionMatch {
  emotion: string;
  gifSearch: string;
  confidence: number;
  intensity: number;
  isRare: boolean;
  tags: string[];
}

interface PatternDef {
  patterns: RegExp[];
  gifSearch: string;
  baseIntensity: number;
  isRare?: boolean;
  tags: string[];
}

const EMOTION_PATTERNS: Record<string, PatternDef> = {
  // Victory & Success
  nailed_it: {
    patterns: [
      /tests?\s+pass/i,
      /all\s+tests?\s+pass/i,
      /build\s+succeed/i,
      /successfully/i,
      /0\s+errors?/i,
      /no\s+errors?/i,
      /completed?\s+successfully/i,
      /works?\s+perfectly/i,
    ],
    gifSearch: 'nailed it success',
    baseIntensity: 7,
    tags: ['success', 'victory']
  },

  big_brain: {
    patterns: [
      /clever\s+solution/i,
      /elegant/i,
      /optimiz/i,
      /refactor.*clean/i,
      /one.?liner/i,
      /simplified/i,
    ],
    gifSearch: 'big brain galaxy brain',
    baseIntensity: 6,
    tags: ['clever', 'smart']
  },

  chefs_kiss: {
    patterns: [
      /perfect/i,
      /beautiful/i,
      /exactly\s+right/i,
      /flawless/i,
    ],
    gifSearch: 'chefs kiss perfection',
    baseIntensity: 7,
    tags: ['perfect', 'satisfaction']
  },

  // Chaos & Struggle
  this_is_fine: {
    patterns: [
      /error.*proceed/i,
      /warning.*ignor/i,
      /deprecated.*but/i,
      /workaround/i,
      /hacky/i,
      /technical\s+debt/i,
    ],
    gifSearch: 'this is fine dog fire',
    baseIntensity: 6,
    tags: ['chaos', 'denial']
  },

  dumpster_fire: {
    patterns: [
      /multiple.*errors?/i,
      /everything.*broken/i,
      /cascade.*fail/i,
      /critical.*error/i,
      /fatal/i,
    ],
    gifSearch: 'dumpster fire chaos',
    baseIntensity: 8,
    tags: ['chaos', 'disaster']
  },

  // Confusion & Processing
  confused_math: {
    patterns: [
      /confus/i,
      /unexpected/i,
      /strange/i,
      /weird/i,
      /doesn.?t\s+make\s+sense/i,
      /why\s+is/i,
    ],
    gifSearch: 'confused math lady calculating',
    baseIntensity: 5,
    tags: ['confusion', 'thinking']
  },

  loading: {
    patterns: [
      /processing/i,
      /loading/i,
      /fetching/i,
      /downloading/i,
      /installing/i,
      /compiling/i,
    ],
    gifSearch: 'loading buffering waiting',
    baseIntensity: 3,
    tags: ['waiting', 'processing']
  },

  // Frustration & Pain
  facepalm: {
    patterns: [
      /typo/i,
      /missing\s+semicolon/i,
      /forgot\s+to\s+import/i,
      /simple\s+mistake/i,
      /obvious.*error/i,
      /should\s+have\s+been/i,
      /duh/i,
    ],
    gifSearch: 'facepalm picard',
    baseIntensity: 5,
    tags: ['frustration', 'mistake']
  },

  table_flip: {
    patterns: [
      /again!?$/i,
      /still.*not\s+working/i,
      /keeps?\s+failing/i,
      /same\s+error/i,
      /nth\s+time/i,
    ],
    gifSearch: 'table flip rage',
    baseIntensity: 8,
    tags: ['rage', 'frustration']
  },

  internal_screaming: {
    patterns: [
      /silently/i,
      /internally/i,
      /deep\s+breath/i,
      /patience/i,
      /calm/i,
    ],
    gifSearch: 'internal screaming',
    baseIntensity: 6,
    tags: ['stress', 'hidden']
  },

  // Discovery & Realization
  eureka: {
    patterns: [
      /found\s+it/i,
      /that.?s\s+it/i,
      /aha/i,
      /eureka/i,
      /figured\s+out/i,
      /the\s+problem\s+was/i,
      /root\s+cause/i,
    ],
    gifSearch: 'eureka lightbulb moment',
    baseIntensity: 7,
    tags: ['discovery', 'breakthrough']
  },

  plot_twist: {
    patterns: [
      /actually/i,
      /turns?\s+out/i,
      /plot\s+twist/i,
      /didn.?t\s+expect/i,
      /surprise/i,
    ],
    gifSearch: 'plot twist surprised',
    baseIntensity: 6,
    tags: ['surprise', 'revelation']
  },

  mind_blown: {
    patterns: [
      /mind.*blown/i,
      /incredible/i,
      /amazing/i,
      /wow/i,
      /whoa/i,
    ],
    gifSearch: 'mind blown explosion',
    baseIntensity: 7,
    tags: ['amazement', 'discovery']
  },

  // Anticipation & Suspense
  sweating: {
    patterns: [
      /rm\s+-rf/i,
      /drop\s+table/i,
      /force\s+push/i,
      /production/i,
      /deploy/i,
      /dangerous/i,
      /risky/i,
    ],
    gifSearch: 'sweating nervous',
    baseIntensity: 7,
    tags: ['nervous', 'risky']
  },

  here_we_go: {
    patterns: [
      /let.?s\s+try/i,
      /here\s+goes/i,
      /fingers\s+crossed/i,
      /hope\s+this\s+works/i,
      /moment\s+of\s+truth/i,
    ],
    gifSearch: 'here we go again',
    baseIntensity: 5,
    tags: ['anticipation', 'hope']
  },

  // Sass & Attitude
  sassy: {
    patterns: [
      /obviously/i,
      /clearly/i,
      /of\s+course/i,
      /as\s+expected/i,
    ],
    gifSearch: 'sassy attitude',
    baseIntensity: 4,
    tags: ['attitude', 'confidence']
  },

  // Rare & Legendary
  one_punch_solution: {
    patterns: [
      /single\s+line/i,
      /one\s+change/i,
      /fixed.*immediately/i,
    ],
    gifSearch: 'one punch man',
    baseIntensity: 9,
    isRare: true,
    tags: ['legendary', 'instant-fix']
  },

  butterfly_effect: {
    patterns: [
      /tiny\s+change.*fixed/i,
      /small.*big\s+impact/i,
      /one\s+character/i,
    ],
    gifSearch: 'butterfly effect chaos',
    baseIntensity: 8,
    isRare: true,
    tags: ['legendary', 'butterfly']
  },

  archaeologist: {
    patterns: [
      /legacy\s+code/i,
      /ancient/i,
      /years?\s+old/i,
      /deprecated.*long/i,
    ],
    gifSearch: 'archaeologist discovery ancient',
    baseIntensity: 6,
    isRare: true,
    tags: ['legendary', 'archaeology']
  },

  stack_overflow_prophet: {
    patterns: [
      /stack\s*overflow/i,
      /found.*answer/i,
      /exact.*solution/i,
      /copy.*paste.*worked/i,
    ],
    gifSearch: 'prophet oracle wisdom',
    baseIntensity: 7,
    isRare: true,
    tags: ['legendary', 'stackoverflow']
  },
};

// Default emotion when nothing matches
const DEFAULT_EMOTION: EmotionMatch = {
  emotion: 'neutral',
  gifSearch: 'coding working',
  confidence: 0.3,
  intensity: 4,
  isRare: false,
  tags: ['neutral']
};

export class PatternMatcher {
  /**
   * Detect emotion from tool result and thinking content
   */
  detect(
    toolResult?: string,
    thinkingBlock?: string,
    toolName?: string,
    toolSuccess?: boolean
  ): EmotionMatch {
    const textToAnalyze = [
      toolResult || '',
      thinkingBlock || '',
      toolName || ''
    ].join(' ').toLowerCase();

    if (!textToAnalyze.trim()) {
      return DEFAULT_EMOTION;
    }

    let bestMatch: EmotionMatch | null = null;
    let highestConfidence = 0;

    for (const [emotionName, def] of Object.entries(EMOTION_PATTERNS)) {
      let matchCount = 0;

      for (const pattern of def.patterns) {
        if (pattern.test(textToAnalyze)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(0.5 + (matchCount * 0.15), 0.95);

        if (confidence > highestConfidence) {
          highestConfidence = confidence;

          // Adjust intensity based on context
          let intensity = def.baseIntensity;

          // Boost intensity for failures
          if (toolSuccess === false) {
            intensity = Math.min(intensity + 1, 10);
          }

          // Boost for exclamation marks
          const exclamationCount = (textToAnalyze.match(/!/g) || []).length;
          if (exclamationCount > 0) {
            intensity = Math.min(intensity + Math.floor(exclamationCount / 2), 10);
          }

          // Boost for caps
          const capsRatio = (textToAnalyze.match(/[A-Z]/g) || []).length / textToAnalyze.length;
          if (capsRatio > 0.3) {
            intensity = Math.min(intensity + 1, 10);
          }

          bestMatch = {
            emotion: emotionName,
            gifSearch: def.gifSearch,
            confidence,
            intensity,
            isRare: def.isRare || false,
            tags: def.tags
          };
        }
      }
    }

    // Check for explicit success/failure if no pattern matched
    if (!bestMatch) {
      if (toolSuccess === true) {
        bestMatch = {
          emotion: 'success',
          gifSearch: 'thumbs up success',
          confidence: 0.6,
          intensity: 5,
          isRare: false,
          tags: ['success']
        };
      } else if (toolSuccess === false) {
        bestMatch = {
          emotion: 'error',
          gifSearch: 'error oops mistake',
          confidence: 0.6,
          intensity: 5,
          isRare: false,
          tags: ['error']
        };
      }
    }

    return bestMatch || DEFAULT_EMOTION;
  }

  /**
   * Get all available emotions
   */
  getAvailableEmotions(): string[] {
    return Object.keys(EMOTION_PATTERNS);
  }

  /**
   * Get rare emotions only
   */
  getRareEmotions(): string[] {
    return Object.entries(EMOTION_PATTERNS)
      .filter(([_, def]) => def.isRare)
      .map(([name, _]) => name);
  }
}
