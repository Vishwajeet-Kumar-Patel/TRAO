import { safeFetch } from './safeFetcher.js';
import { cleanHtml, CleanedPage } from './htmlCleaner.js';
import { rankDiscoveredLinks } from './linkRanker.js';
import { config } from '../../config/env.js';

export interface CrawlResult {
  rootUrl: string;
  pages: CleanedPage[];
  pagesUsed: string[];
  combinedContent: string;
  hasCareersPage: boolean;
  hasAboutPage: boolean;
  status: 'ok' | 'partial' | 'failed';
  error?: string;
}

export class CompanyCrawler {
  private maxPages: number;

  constructor(maxPages = config.crawler.maxPages) {
    this.maxPages = maxPages;
  }

  async crawl(companyUrl: string): Promise<CrawlResult> {
    let normalizedUrl = companyUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const visitedUrls = new Set<string>();
    const pages: CleanedPage[] = [];

    // 1. Fetch homepage
    const homepageFetch = await safeFetch(normalizedUrl);
    if (!homepageFetch.ok || !homepageFetch.body) {
      return {
        rootUrl: normalizedUrl,
        pages: [],
        pagesUsed: [],
        combinedContent: '',
        hasCareersPage: false,
        hasAboutPage: false,
        status: 'failed',
        error: homepageFetch.error || `Failed to fetch homepage: HTTP ${homepageFetch.status}`,
      };
    }

    const rootEffectiveUrl = homepageFetch.redirectedTo || normalizedUrl;
    visitedUrls.add(rootEffectiveUrl);
    visitedUrls.add(normalizedUrl);

    const cleanedHomepage = cleanHtml(homepageFetch.body, rootEffectiveUrl);
    pages.push(cleanedHomepage);

    // 2. Discover and rank candidate links
    const rankedLinks = rankDiscoveredLinks(cleanedHomepage.links, rootEffectiveUrl, visitedUrls);

    // 3. Fetch top promising pages
    const pagesToFetch = rankedLinks.slice(0, Math.max(0, this.maxPages - 1));

    let hasCareersPage = false;
    let hasAboutPage = false;

    for (const target of pagesToFetch) {
      if (pages.length >= this.maxPages) break;

      visitedUrls.add(target.url);
      const res = await safeFetch(target.url);
      if (res.ok && res.body) {
        const cleaned = cleanHtml(res.body, res.url);
        pages.push(cleaned);

        const lowerUrl = target.url.toLowerCase();
        if (lowerUrl.includes('career') || lowerUrl.includes('jobs') || lowerUrl.includes('hiring')) {
          hasCareersPage = true;
        }
        if (lowerUrl.includes('about') || lowerUrl.includes('company') || lowerUrl.includes('team')) {
          hasAboutPage = true;
        }
      }
    }

    const pagesUsed = pages.map((p) => p.url);

    // Build combined readable content block
    const combinedContent = pages
      .map((p) => `--- PAGE: ${p.url} (Title: ${p.title}) ---\n${p.cleanedText}`)
      .join('\n\n');

    return {
      rootUrl: rootEffectiveUrl,
      pages,
      pagesUsed,
      combinedContent,
      hasCareersPage,
      hasAboutPage,
      status: pages.length > 0 ? 'ok' : 'partial',
    };
  }
}
