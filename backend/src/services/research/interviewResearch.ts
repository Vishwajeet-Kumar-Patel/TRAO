import { CrawlResult } from '../crawler/companyCrawler.js';

export interface InterviewResearchResult {
  found: boolean;
  summary: string;
  stages: string[];
  sources: string[];
  culturalValues: string[];
  techStackHighlights: string[];
}

export function extractInterviewResearch(
  companyName: string,
  crawlResult: CrawlResult
): InterviewResearchResult {
  if (!crawlResult.pages || crawlResult.pages.length === 0) {
    return {
      found: false,
      summary: 'Public interview process information unavailable for this company.',
      stages: [],
      sources: [],
      culturalValues: [],
      techStackHighlights: [],
    };
  }

  const allText = crawlResult.combinedContent.toLowerCase();
  const stages: string[] = [];
  const sources: string[] = [];
  const culturalValues: string[] = [];
  const techStackHighlights: string[] = [];

  // Stage keywords detection
  if (allText.includes('recruiter') || allText.includes('introductory call') || allText.includes('screening')) {
    stages.push('Initial Recruiter / Talent Screen (30m)');
  }
  if (allText.includes('technical screen') || allText.includes('coding challenge') || allText.includes('take-home')) {
    stages.push('Technical Screen / Coding Assessment');
  }
  if (allText.includes('system design') || allText.includes('architecture') || allText.includes('distributed')) {
    stages.push('System Architecture & Deep Dive Session');
  }
  if (allText.includes('culture') || allText.includes('values') || allText.includes('behavioural') || allText.includes('leadership')) {
    stages.push('Values, Culture & Leadership Alignment');
  }

  // Culture / Values detection
  const valueKeywords = [
    'innovation',
    'collaboration',
    'transparency',
    'ownership',
    'customer obsession',
    'speed',
    'diversity',
    'inclusion',
    'excellence',
    'continuous learning',
  ];
  for (const val of valueKeywords) {
    if (allText.includes(val)) {
      culturalValues.push(val.charAt(0).toUpperCase() + val.slice(1));
    }
  }

  // Tech stack keywords detection
  const techKeywords = [
    'typescript',
    'javascript',
    'react',
    'next.js',
    'node.js',
    'python',
    'golang',
    'java',
    'aws',
    'gcp',
    'azure',
    'docker',
    'kubernetes',
    'graphql',
    'rest',
    'mongodb',
    'postgresql',
    'redis',
    'kafka',
  ];
  for (const tech of techKeywords) {
    if (allText.includes(tech)) {
      techStackHighlights.push(tech);
    }
  }

  // Find pages referencing hiring/careers
  for (const p of crawlResult.pages) {
    const text = p.cleanedText.toLowerCase();
    if (text.includes('interview') || text.includes('hiring') || text.includes('career') || text.includes('value')) {
      sources.push(p.url);
    }
  }

  if (sources.length === 0 && crawlResult.pages.length > 0) {
    sources.push(crawlResult.pages[0].url);
  }

  const found = stages.length > 0 || culturalValues.length > 0;
  const summary = found
    ? `Discovered hiring and process signals from company publications (${stages.length > 0 ? stages.length + ' stages identified' : 'general values'}).`
    : 'Public interview process information unavailable; defaulting to industry-standard evaluation framework.';

  return {
    found,
    summary,
    stages: stages.length > 0 ? stages : ['Recruiter Screen', 'Technical Interview', 'System Design & Role Fit', 'Final Behavioral'],
    sources: [...new Set(sources)],
    culturalValues: [...new Set(culturalValues)],
    techStackHighlights: [...new Set(techStackHighlights)],
  };
}
