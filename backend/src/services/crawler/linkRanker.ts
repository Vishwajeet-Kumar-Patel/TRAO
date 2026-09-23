import { DiscoveredLink } from './htmlCleaner.js';

export interface RankedLink {
  url: string;
  score: number;
  reason: string;
  anchorText: string;
}

const HIGH_PRIORITY_KEYWORDS = [
  'interview',
  'hiring',
  'careers',
  'career',
  'jobs',
  'engineering',
  'culture',
  'values',
  'handbook',
  'tech-stack',
];

const MEDIUM_PRIORITY_KEYWORDS = [
  'about',
  'about-us',
  'company',
  'working',
  'people',
  'talent',
  'team',
  'mission',
  'technology',
  'blog/engineering',
];

const DISALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.svg',
  '.css',
  '.js',
  '.zip',
  '.tar',
  '.gz',
  '.pdf',
  '.docx',
  '.mp4',
  '.webp',
];

export function rankDiscoveredLinks(
  links: DiscoveredLink[],
  rootBaseUrl: string,
  alreadyVisitedUrls: Set<string>
): RankedLink[] {
  let rootOrigin = '';
  try {
    const parsedRoot = new URL(rootBaseUrl);
    rootOrigin = parsedRoot.origin;
  } catch {
    return [];
  }

  const seenUrls = new Set<string>();
  const ranked: RankedLink[] = [];

  for (const item of links) {
    try {
      const parsed = new URL(item.absoluteUrl);

      // Must share the same origin or subdomain
      if (!parsed.origin.endsWith(new URL(rootBaseUrl).hostname)) {
        continue;
      }

      // Drop hash and normalize trailing slash
      parsed.hash = '';
      let normalized = parsed.toString();
      if (normalized.endsWith('/') && normalized.length > rootOrigin.length + 1) {
        normalized = normalized.slice(0, -1);
      }

      if (alreadyVisitedUrls.has(normalized) || seenUrls.has(normalized)) {
        continue;
      }

      // Check extensions
      const pathname = parsed.pathname.toLowerCase();
      if (DISALLOWED_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
        continue;
      }

      // Skip login, signin, checkout, privacy, terms
      if (
        pathname.includes('login') ||
        pathname.includes('signin') ||
        pathname.includes('cart') ||
        pathname.includes('checkout') ||
        pathname.includes('privacy') ||
        pathname.includes('terms')
      ) {
        continue;
      }

      const matchText = `${pathname} ${item.anchorText}`.toLowerCase();
      let score = 0;
      const reasons: string[] = [];

      for (const kw of HIGH_PRIORITY_KEYWORDS) {
        if (matchText.includes(kw)) {
          score += 10;
          reasons.push(`high:${kw}`);
        }
      }

      for (const kw of MEDIUM_PRIORITY_KEYWORDS) {
        if (matchText.includes(kw)) {
          score += 5;
          reasons.push(`medium:${kw}`);
        }
      }

      if (score > 0) {
        seenUrls.add(normalized);
        ranked.push({
          url: normalized,
          score,
          reason: reasons.join(', '),
          anchorText: item.anchorText,
        });
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  // Sort descending by score
  return ranked.sort((a, b) => b.score - a.score);
}
