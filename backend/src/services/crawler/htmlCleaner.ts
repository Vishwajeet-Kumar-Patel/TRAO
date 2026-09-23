import * as cheerio from 'cheerio';

export interface CleanedPage {
  url: string;
  title: string;
  metaDescription: string;
  cleanedText: string;
  links: DiscoveredLink[];
  charCount: number;
}

export interface DiscoveredLink {
  href: string;
  absoluteUrl: string;
  anchorText: string;
}

export function cleanHtml(html: string, baseUrl: string): CleanedPage {
  if (!html || typeof html !== 'string') {
    return {
      url: baseUrl,
      title: '',
      metaDescription: '',
      cleanedText: '',
      links: [],
      charCount: 0,
    };
  }

  const $ = cheerio.load(html);

  // Extract meta info before stripping tags
  const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || '';
  const metaDescription =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    '';

  // Discover all valid links and resolve relative paths
  const links: DiscoveredLink[] = [];
  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href')?.trim();
    const anchorText = $(el).text().replace(/\s+/g, ' ').trim();

    if (rawHref && !rawHref.startsWith('javascript:') && !rawHref.startsWith('mailto:') && !rawHref.startsWith('tel:') && !rawHref.startsWith('#')) {
      try {
        const resolved = new URL(rawHref, baseUrl).toString();
        links.push({
          href: rawHref,
          absoluteUrl: resolved,
          anchorText,
        });
      } catch {
        // Ignore unparseable relative URLs
      }
    }
  });

  // Strip noise and non-content elements
  $(
    'script, style, noscript, iframe, svg, canvas, nav, footer, header, form, input, button, select, [role="navigation"], [role="banner"], [role="dialog"], .cookie-banner, .advertisement, .modal'
  ).remove();

  // Format headers and lists nicely
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      $(el).text(`\n\n### ${text}\n`);
    }
  });

  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      $(el).text(`\n${text}\n`);
    }
  });

  $('li').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      $(el).text(`\n* ${text}`);
    }
  });

  // Extract body text
  let rawText = $('body').text() || $.root().text();

  // Clean excessive whitespace and consecutive blank lines
  rawText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Cap cleaned text length (e.g. 15,000 chars per page)
  const maxChars = 15000;
  const cleanedText = rawText.length > maxChars ? rawText.slice(0, maxChars) + '...[truncated]' : rawText;

  return {
    url: baseUrl,
    title,
    metaDescription,
    cleanedText,
    links,
    charCount: cleanedText.length,
  };
}
