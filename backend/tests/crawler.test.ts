import { describe, it, expect } from 'vitest';
import { cleanHtml } from '../src/services/crawler/htmlCleaner.js';
import { rankDiscoveredLinks } from '../src/services/crawler/linkRanker.js';
import { isUrlAllowed } from '../src/services/crawler/safeFetcher.js';

describe('Crawler & Security Utilities', () => {
  it('cleans noisy HTML, strips scripts and styles, and resolves relative links', () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Acme Corp | Engineering Careers</title>
          <meta name="description" content="We build real-time cloud data pipelines.">
          <style>body { color: red; }</style>
          <script>alert('xss');</script>
        </head>
        <body>
          <nav><a href="/home">Home</a></nav>
          <main>
            <h1>Join Our Engineering Team</h1>
            <p>We are hiring Senior Engineers to build high-scale distributed systems.</p>
            <ul>
              <li>TypeScript</li>
              <li>Kubernetes</li>
            </ul>
            <a href="/careers/engineering">Explore Engineering Roles</a>
            <a href="/about-us">About Acme</a>
            <a href="https://external.example.com/blog">External Blog</a>
          </main>
        </body>
      </html>
    `;

    const cleaned = cleanHtml(rawHtml, 'https://acme.example.com');
    expect(cleaned.title).toBe('Acme Corp | Engineering Careers');
    expect(cleaned.metaDescription).toBe('We build real-time cloud data pipelines.');
    expect(cleaned.cleanedText).toContain('Join Our Engineering Team');
    expect(cleaned.cleanedText).toContain('TypeScript');
    expect(cleaned.cleanedText).not.toContain('alert');
    expect(cleaned.cleanedText).not.toContain('color: red');

    expect(cleaned.links.some((l) => l.absoluteUrl === 'https://acme.example.com/careers/engineering')).toBe(true);
    expect(cleaned.links.some((l) => l.absoluteUrl === 'https://acme.example.com/about-us')).toBe(true);
  });

  it('ranks career and engineering links higher than generic pages', () => {
    const links = [
      { href: '/about', absoluteUrl: 'https://acme.example.com/about', anchorText: 'About Us' },
      { href: '/careers', absoluteUrl: 'https://acme.example.com/careers', anchorText: 'Careers & Hiring' },
      { href: '/engineering', absoluteUrl: 'https://acme.example.com/engineering', anchorText: 'Engineering Culture' },
      { href: '/privacy', absoluteUrl: 'https://acme.example.com/privacy', anchorText: 'Privacy Policy' },
    ];

    const ranked = rankDiscoveredLinks(links, 'https://acme.example.com', new Set());
    expect(ranked.length).toBeGreaterThanOrEqual(3);
    // Highest ranked should be careers/engineering
    expect(ranked[0].url).toMatch(/careers|engineering/);
    // Privacy policy should be excluded or lowest
    expect(ranked.some((r) => r.url.includes('/privacy'))).toBe(false);
  });

  it('allows http/https URLs and validates protocols', () => {
    expect(isUrlAllowed('https://acme.example.com').allowed).toBe(true);
    expect(isUrlAllowed('ftp://acme.example.com').allowed).toBe(false);
    expect(isUrlAllowed('javascript:void(0)').allowed).toBe(false);
  });
});
