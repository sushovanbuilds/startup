/**
 * PageSpeed Insights API client with caching.
 * Uses safe-fetch for all outbound requests (via safe-fetch internally when needed).
 * Caches responses in memory with TTL to avoid quota exhaustion.
 */

import { safeFetch } from '../../net/safe-fetch';

export interface PSIConfig {
  apiKey?: string;
  cacheTTLMs?: number; // Time to live for cached responses
  requestTimeoutMs?: number;
}

export interface PSIResponse {
  lighthouseResult: {
    audits: {
      'largest-contentful-paint'?: { numericValue?: number; displayValue?: string; score?: number | null };
      'cumulative-layout-shift'?: { numericValue?: number; displayValue?: string; score?: number | null };
      'interactive'?: { numericValue?: number; displayValue?: string; score?: number | null };
      'max-potential-fid'?: { numericValue?: number; displayValue?: string; score?: number | null };
    };
    categories: {
      performance?: { score?: number | null };
    };
    requestedUrl: string;
    finalUrl: string;
  };
  loadingExperience?: {
    metrics?: {
      LARGEST_CONTENTFUL_PAINT_MS?: { percentile?: number; category?: string };
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile?: number; category?: string };
      INTERACTION_TO_NEXT_PAINT?: { percentile?: number; category?: string };
      FIRST_INPUT_DELAY_MS?: { percentile?: number; category?: string };
    };
    overall_category?: string;
  };
  originLoadingExperience?: {
    metrics?: {
      LARGEST_CONTENTFUL_PAINT_MS?: { percentile?: number; category?: string };
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile?: number; category?: string };
      INTERACTION_TO_NEXT_PAINT?: { percentile?: number; category?: string };
      FIRST_INPUT_DELAY_MS?: { percentile?: number; category?: string };
    };
    overall_category?: string;
  };
  version?: {
    major?: number;
    minor?: number;
  };
  analysisUTCTimestamp?: string;
}

export interface PSIExtractedMetrics {
  lcpMs: number | null; // Largest Contentful Paint in milliseconds
  cls: number | null; // Cumulative Layout Shift score
  inpMs: number | null; // Interaction to Next Paint in milliseconds
  score: number | null; // Performance score (0-1)
  strategy: 'mobile' | 'desktop';
  url: string;
  checkedAt: string;
  rawResponse?: PSIResponse;
}

interface CacheEntry {
  data: PSIExtractedMetrics;
  expiresAt: number;
}

export class PSIClient {
  private config: Required<PSIConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly BASE_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

  constructor(config: PSIConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.PSI_API_KEY ?? '',
      cacheTTLMs: config.cacheTTLMs ?? 24 * 60 * 60 * 1000, // 24 hours default
      requestTimeoutMs: config.requestTimeoutMs ?? 30000, // 30 seconds
    };
  }

  /**
   * Build the PSI API URL with parameters.
   */
  private buildUrl(url: string, strategy: 'mobile' | 'desktop'): string {
    const params = new URLSearchParams({
      url,
      strategy,
      category: 'performance',
    });
    if (this.config.apiKey) {
      params.set('key', this.config.apiKey);
    }
    return `${this.BASE_URL}?${params.toString()}`;
  }

  /**
   * Generate cache key for a URL + strategy combination.
   */
  private getCacheKey(url: string, strategy: 'mobile' | 'desktop'): string {
    return `${strategy}:${url}`;
  }

  /**
   * Check if cache entry is valid.
   */
  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() < entry.expiresAt;
  }

  /**
   * Extract metrics from PSI API response.
   * Uses field data (real user metrics) when available, falls back to lab data.
   */
  private extractMetrics(response: PSIResponse, strategy: 'mobile' | 'desktop'): PSIExtractedMetrics {
    const audits = response.lighthouseResult?.audits ?? {};
    const categories = response.lighthouseResult?.categories ?? {};

    // Prefer field data (real user metrics) over lab data
    const field = response.loadingExperience?.metrics;
    const originField = response.originLoadingExperience?.metrics;

    // LCP - prefer field data, then origin field data, then lab data
    let lcpMs: number | null = null;
    if (field?.LARGEST_CONTENTFUL_PAINT_MS?.percentile) {
      lcpMs = field.LARGEST_CONTENTFUL_PAINT_MS.percentile;
    } else if (originField?.LARGEST_CONTENTFUL_PAINT_MS?.percentile) {
      lcpMs = originField.LARGEST_CONTENTFUL_PAINT_MS.percentile;
    } else if (audits['largest-contentful-paint']?.numericValue) {
      lcpMs = audits['largest-contentful-paint'].numericValue;
    }

    // CLS - prefer field data, then origin field data, then lab data
    let cls: number | null = null;
    if (field?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile !== undefined) {
      cls = field.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile;
    } else if (originField?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile !== undefined) {
      cls = originField.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile;
    } else if (audits['cumulative-layout-shift']?.numericValue !== undefined) {
      cls = audits['cumulative-layout-shift'].numericValue;
    }

    // INP - prefer field data (INP), then FID as fallback, then lab data
    let inpMs: number | null = null;
    if (field?.INTERACTION_TO_NEXT_PAINT?.percentile) {
      inpMs = field.INTERACTION_TO_NEXT_PAINT.percentile;
    } else if (originField?.INTERACTION_TO_NEXT_PAINT?.percentile) {
      inpMs = originField.INTERACTION_TO_NEXT_PAINT.percentile;
    } else if (field?.FIRST_INPUT_DELAY_MS?.percentile) {
      inpMs = field.FIRST_INPUT_DELAY_MS.percentile; // FID as proxy for INP
    } else if (originField?.FIRST_INPUT_DELAY_MS?.percentile) {
      inpMs = originField.FIRST_INPUT_DELAY_MS.percentile;
    } else if (audits['interactive']?.numericValue) {
      inpMs = audits['interactive'].numericValue;
    }

    // Performance score (0-1)
    const score = categories.performance?.score ?? null;

    return {
      lcpMs,
      cls,
      inpMs,
      score,
      strategy,
      url: response.lighthouseResult?.finalUrl ?? response.lighthouseResult?.requestedUrl ?? '',
      checkedAt: new Date().toISOString(),
      rawResponse: response,
    };
  }

  /**
   * Fetch PSI data for a URL with given strategy.
   * Uses cache when available and not expired.
   */
  async fetch(url: string, strategy: 'mobile' | 'desktop'): Promise<PSIExtractedMetrics> {
    const cacheKey = this.getCacheKey(url, strategy);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    const apiUrl = this.buildUrl(url, strategy);

    try {
      const result = await safeFetch(apiUrl, {
        requestTimeoutMs: this.config.requestTimeoutMs,
        maxResponseSizeBytes: 5 * 1024 * 1024, // 5MB for PSI responses
        maxRedirects: 3,
      });

      if (result.statusCode !== 200) {
        const error = this.parseError(result.body, result.statusCode);
        throw error;
      }

      const response = JSON.parse(result.body) as PSIResponse;
      const metrics = this.extractMetrics(response, strategy);

      // Cache the result
      this.cache.set(cacheKey, {
        data: metrics,
        expiresAt: Date.now() + this.config.cacheTTLMs,
      });

      return metrics;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  }

  /**
   * Parse error from PSI API response.
   */
  private parseError(body: string, statusCode: number): Error {
    try {
      const error = JSON.parse(body);
      const message = error.error?.message ?? 'Unknown PSI API error';
      const code = error.error?.code ?? statusCode;

      // Quota exceeded (429 or 403 with quota message)
      if (code === 429 || (code === 403 && message.includes('quota'))) {
        return new PSIQuotaError(message);
      }

      // Daily limit exceeded
      if (message.includes('daily limit') || message.includes('Daily Limit')) {
        return new PSIQuotaError(message);
      }

      // Invalid API key
      if (code === 400 && message.includes('API key')) {
        return new PSIApiKeyError(message);
      }

      // Invalid URL
      if (code === 400 && message.includes('Invalid')) {
        return new PSIInvalidUrlError(message);
      }

      // Generic error with status code
      return new PSIApiError(`PSI API error (${code}): ${message}`, code);
    } catch {
      return new PSIApiError(`PSI API error (${statusCode}): Failed to parse error response`, statusCode);
    }
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Custom error classes for different PSI API error types
export class PSIApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'PSIApiError';
  }
}

export class PSIQuotaError extends PSIApiError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'PSIQuotaError';
  }
}

export class PSIApiKeyError extends PSIApiError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'PSIApiKeyError';
  }
}

export class PSIInvalidUrlError extends PSIApiError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'PSIInvalidUrlError';
  }
}

// Singleton instance for convenience
let defaultClient: PSIClient | null = null;

export function getPSIClient(config?: PSIConfig): PSIClient {
  if (!defaultClient) {
    defaultClient = new PSIClient(config);
  }
  return defaultClient;
}

export function resetPSIClient(): void {
  defaultClient = null;
}