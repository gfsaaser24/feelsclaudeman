/**
 * Giphy API Client for FeelsClaudeMan
 *
 * Features:
 * - Search GIFs with fallback strategies
 * - LRU cache (500 entries)
 * - Graceful degradation without API key
 * - Unfiltered content (no rating restrictions)
 */

export interface GiphyGif {
  id: string;
  url: string;
  title: string;
  images: {
    original: { url: string };
    fixed_height: { url: string };
    fixed_width: { url: string };
    downsized: { url: string };
  };
}

export interface GiphySearchResult {
  gif_id: string;
  gif_url: string;
  gif_title: string;
  search_term: string;
  fallback_used?: boolean;
}

// Simple LRU cache
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }
}

export class GiphyClient {
  private apiKey: string | undefined;
  private cache: LRUCache<string, GiphySearchResult>;
  private baseUrl = 'https://api.giphy.com/v1/gifs';

  // Fallback GIFs when no API key or search fails
  private fallbackGifs: Record<string, GiphySearchResult> = {
    default: {
      gif_id: 'placeholder',
      gif_url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', // Cat typing
      gif_title: 'Coding Cat',
      search_term: 'default'
    },
    success: {
      gif_id: 'success',
      gif_url: 'https://media.giphy.com/media/a0h7sAqON67nO/giphy.gif', // Success kid
      gif_title: 'Success!',
      search_term: 'success'
    },
    error: {
      gif_id: 'error',
      gif_url: 'https://media.giphy.com/media/H1wV85UGUQnTa/giphy.gif', // This is fine
      gif_title: 'This is fine',
      search_term: 'error'
    },
    thinking: {
      gif_id: 'thinking',
      gif_url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif', // Thinking
      gif_title: 'Thinking...',
      search_term: 'thinking'
    }
  };

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GIPHY_API_KEY;
    this.cache = new LRUCache<string, GiphySearchResult>(500);

    if (!this.apiKey) {
      console.log('[Giphy] No API key provided - using fallback GIFs');
    } else {
      console.log('[Giphy] Initialized with API key');
    }
  }

  /**
   * Search for a GIF with fallback strategies
   */
  async search(query: string, limit: number = 1): Promise<GiphySearchResult> {
    const cacheKey = `${query}:${limit}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`[Giphy] Cache hit: ${query}`);
      return cached;
    }

    // If no API key, use fallback
    if (!this.apiKey) {
      return this.getFallback(query);
    }

    try {
      const result = await this.fetchFromApi(query, limit);
      if (result) {
        this.cache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error(`[Giphy] API error for "${query}":`, error);
    }

    // Try fallback searches
    const fallbackSearches = this.generateFallbackSearches(query);
    for (const fallbackQuery of fallbackSearches) {
      try {
        const result = await this.fetchFromApi(fallbackQuery, limit);
        if (result) {
          result.fallback_used = true;
          this.cache.set(cacheKey, result);
          return result;
        }
      } catch {
        continue;
      }
    }

    // Ultimate fallback
    return this.getFallback(query);
  }

  private async fetchFromApi(query: string, limit: number): Promise<GiphySearchResult | null> {
    const params = new URLSearchParams({
      api_key: this.apiKey!,
      q: query,
      limit: limit.toString(),
      rating: 'r', // Unfiltered
      lang: 'en'
    });

    const url = `${this.baseUrl}/search?${params}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Giphy API returned ${response.status}`);
    }

    const data = await response.json() as { data?: GiphyGif[] };

    if (!data.data || data.data.length === 0) {
      return null;
    }

    const gif = data.data[0];

    console.log(`[Giphy] Found: "${gif.title}" for "${query}"`);

    return {
      gif_id: gif.id,
      gif_url: gif.images.downsized?.url || gif.images.original?.url,
      gif_title: gif.title,
      search_term: query
    };
  }

  private generateFallbackSearches(query: string): string[] {
    const fallbacks: string[] = [];

    // Remove specific qualifiers
    const simplified = query
      .replace(/meme|gif|reaction/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (simplified !== query) {
      fallbacks.push(simplified);
    }

    // Extract key words
    const words = query.toLowerCase().split(/\s+/);
    const keywords = words.filter(w =>
      w.length > 3 &&
      !['meme', 'gif', 'reaction', 'the', 'and', 'for'].includes(w)
    );

    if (keywords.length > 0) {
      fallbacks.push(keywords.join(' '));
      fallbacks.push(keywords[0]); // Just first keyword
    }

    // Map to common categories
    const categoryMap: Record<string, string> = {
      'frustrated': 'frustrated',
      'angry': 'angry',
      'happy': 'happy celebration',
      'sad': 'sad',
      'confused': 'confused',
      'success': 'success celebration',
      'fail': 'fail',
      'error': 'error oops',
      'thinking': 'thinking',
      'eureka': 'eureka idea',
      'facepalm': 'facepalm',
      'this is fine': 'this is fine fire',
      'nailed': 'nailed it',
      'brain': 'big brain',
    };

    for (const [key, value] of Object.entries(categoryMap)) {
      if (query.toLowerCase().includes(key)) {
        fallbacks.push(value);
        break;
      }
    }

    return [...new Set(fallbacks)]; // Dedupe
  }

  private getFallback(query: string): GiphySearchResult {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('success') || lowerQuery.includes('nailed') || lowerQuery.includes('win')) {
      return { ...this.fallbackGifs.success, search_term: query, fallback_used: true };
    }
    if (lowerQuery.includes('error') || lowerQuery.includes('fail') || lowerQuery.includes('fire')) {
      return { ...this.fallbackGifs.error, search_term: query, fallback_used: true };
    }
    if (lowerQuery.includes('think') || lowerQuery.includes('confus')) {
      return { ...this.fallbackGifs.thinking, search_term: query, fallback_used: true };
    }

    return { ...this.fallbackGifs.default, search_term: query, fallback_used: true };
  }

  /**
   * Get a trending GIF
   */
  async getTrending(): Promise<GiphySearchResult> {
    if (!this.apiKey) {
      return this.fallbackGifs.default;
    }

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        limit: '1',
        rating: 'r'
      });

      const response = await fetch(`${this.baseUrl}/trending?${params}`);
      const data = await response.json() as { data?: GiphyGif[] };

      if (data.data && data.data.length > 0) {
        const gif = data.data[0];
        return {
          gif_id: gif.id,
          gif_url: gif.images.downsized?.url || gif.images.original?.url,
          gif_title: gif.title,
          search_term: 'trending'
        };
      }
    } catch (error) {
      console.error('[Giphy] Trending fetch error:', error);
    }

    return this.fallbackGifs.default;
  }
}
