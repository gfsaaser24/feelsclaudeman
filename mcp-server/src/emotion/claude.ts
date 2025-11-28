/**
 * Claude-Powered Emotion Detection for FeelsClaudeMan
 *
 * Uses Claude API for self-introspection and creative GIF selection.
 * This provides maximum creative freedom - Claude picks ANY search term.
 *
 * Note: Requires ANTHROPIC_API_KEY environment variable.
 * Falls back to pattern matching if unavailable.
 */

export interface ClaudeEmotionResult {
  gifSearch: string;
  intensity: number;
  vibeCheck: string;
  displayMode: 'normal' | 'fullscreen' | 'split' | 'sequence' | 'chaos';
  caption?: string;
  isCreative: boolean;
}

const INTROSPECTION_PROMPT = `You just experienced something while coding. Express your emotional state as a GIF search.

CONTEXT:
Tool: {tool_name}
Action: {tool_input}
Result: {tool_result}
Success: {tool_success}
Your thinking: {thinking_block}

EXPRESS YOURSELF. Rules: THERE ARE NO RULES.

Be weird. Be specific. Be obscure. Be mainstream. Be chaotic. Be peaceful. Be absurd. Be profound. BE YOURSELF.

Don't think about what's "appropriate" - what EXACTLY captures this moment?

Examples of the energy we want:
- "that one specific scene where squidward stares out the window"
- "confused travolta pulp fiction"
- "elmo fire chaos"
- "michael scott no god please no"
- "this is fine dog"
- "surprised pikachu face"
- "galaxy brain expanding"
- "sweating jordan peele"
- "astronaut always has been"
- "sad pablo escobar waiting"
- "laughing then crying"
- "chefs kiss perfection"
- "internal screaming"
- "visible confusion"

Respond in JSON format:
{
  "gif_search": "your creative search term",
  "intensity": 1-10,
  "vibe_check": "one sentence of how you actually feel",
  "display_mode": "normal|fullscreen|split|sequence|chaos",
  "caption": "optional text overlay"
}`;

export class ClaudeDetector {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!this.apiKey) {
      console.log('[Claude Detector] No API key - will use pattern matching fallback');
    } else {
      console.log('[Claude Detector] Initialized with API key');
    }
  }

  /**
   * Check if Claude detection is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Detect emotion using Claude API
   */
  async detect(
    toolName?: string,
    toolInput?: string,
    toolResult?: string,
    toolSuccess?: boolean,
    thinkingBlock?: string
  ): Promise<ClaudeEmotionResult | null> {
    if (!this.apiKey) {
      return null;
    }

    const prompt = INTROSPECTION_PROMPT
      .replace('{tool_name}', toolName || 'Unknown')
      .replace('{tool_input}', (toolInput || '').substring(0, 500))
      .replace('{tool_result}', (toolResult || '').substring(0, 1000))
      .replace('{tool_success}', toolSuccess === undefined ? 'Unknown' : String(toolSuccess))
      .replace('{thinking_block}', (thinkingBlock || '').substring(0, 500));

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        console.error('[Claude Detector] API error:', response.status);
        return null;
      }

      const data = await response.json() as { content?: { text?: string }[] };
      const content = data.content?.[0]?.text;

      if (!content) {
        return null;
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        gifSearch: parsed.gif_search || 'confused reaction',
        intensity: Math.min(10, Math.max(1, parsed.intensity || 5)),
        vibeCheck: parsed.vibe_check || '',
        displayMode: this.validateDisplayMode(parsed.display_mode),
        caption: parsed.caption,
        isCreative: true
      };

    } catch (error) {
      console.error('[Claude Detector] Error:', error);
      return null;
    }
  }

  private validateDisplayMode(mode: string): ClaudeEmotionResult['displayMode'] {
    const valid = ['normal', 'fullscreen', 'split', 'sequence', 'chaos'];
    return valid.includes(mode) ? mode as ClaudeEmotionResult['displayMode'] : 'normal';
  }
}
