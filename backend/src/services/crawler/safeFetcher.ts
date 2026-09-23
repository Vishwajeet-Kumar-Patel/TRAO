import { config } from '../../config/env.js';

export interface FetchResult {
  url: string;
  status: number;
  ok: boolean;
  contentType: string;
  body: string;
  redirectedTo?: string;
  error?: string;
}

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export function isUrlAllowed(rawUrl: string): { allowed: boolean; reason?: string; parsedUrl?: URL } {
  try {
    const url = new URL(rawUrl);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { allowed: false, reason: `Disallowed protocol: ${url.protocol}` };
    }

    const hostname = url.hostname.toLowerCase();

    // Check localhost / loopback
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.localhost');

    if (isLocalhost) {
      if (config.allowLocalhostSsrf) {
        return { allowed: true, parsedUrl: url };
      }
      return { allowed: false, reason: 'Loopback and localhost addresses are blocked in production' };
    }

    // Check private IPv4 / IPv6 ranges
    if (config.isProduction) {
      for (const pattern of PRIVATE_IP_PATTERNS) {
        if (pattern.test(hostname)) {
          return { allowed: false, reason: 'Private/internal IP addresses are blocked' };
        }
      }
    }

    return { allowed: true, parsedUrl: url };
  } catch (err: unknown) {
    return { allowed: false, reason: `Invalid URL format: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function safeFetch(
  targetUrl: string,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    maxBytes?: number;
    retriesLeft?: number;
  } = {}
): Promise<FetchResult> {
  const timeoutMs = options.timeoutMs ?? config.crawler.timeoutMs;
  const maxRetries = options.maxRetries ?? config.crawler.maxRetries;
  const maxBytes = options.maxBytes ?? config.crawler.maxResponseBytes;

  const urlCheck = isUrlAllowed(targetUrl);
  if (!urlCheck.allowed || !urlCheck.parsedUrl) {
    return {
      url: targetUrl,
      status: 400,
      ok: false,
      contentType: '',
      body: '',
      error: urlCheck.reason || 'URL not permitted',
    };
  }

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AIPrepKitBot/1.0 (+https://example.com/bot)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      clearTimeout(timer);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/json')) {
        return {
          url: targetUrl,
          status: response.status,
          ok: false,
          contentType,
          body: '',
          error: `Unsupported content type: ${contentType}`,
        };
      }

      // Read limited bytes to prevent huge memory usage
      const text = await response.text();
      const truncatedBody = text.length > maxBytes ? text.slice(0, maxBytes) : text;

      return {
        url: targetUrl,
        status: response.status,
        ok: response.ok,
        contentType,
        body: truncatedBody,
        redirectedTo: response.url !== targetUrl ? response.url : undefined,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      lastError = new Error(isAbort ? `Request timed out after ${timeoutMs}ms` : (err instanceof Error ? err.message : String(err)));

      if (attempt <= maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        await new Promise((res) => setTimeout(res, backoffMs));
      }
    }
  }

  return {
    url: targetUrl,
    status: 504,
    ok: false,
    contentType: '',
    body: '',
    error: lastError?.message || 'Failed after maximum retries',
  };
}
