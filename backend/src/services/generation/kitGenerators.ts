import {
  CompanyBrief,
  Question,
  Flashcard,
  QuestionCategory,
  Requirement,
  RoleBreakdown,
  CompanyBriefSchema,
} from '@prep-kit/shared';
import { llmClient } from '../llm/llmClient.js';
import { CrawlResult } from '../crawler/companyCrawler.js';
import { InterviewResearchResult } from '../research/interviewResearch.js';

export async function generateCompanyBrief(
  companyUrl: string,
  crawlResult: CrawlResult
): Promise<CompanyBrief> {
  const sources = crawlResult.pagesUsed.length > 0 ? crawlResult.pagesUsed : [companyUrl];

  if (llmClient.isConfigured && crawlResult.combinedContent.length > 50) {
    const systemPrompt = `You are an expert company research analyst.
Summarize the company's business model, what they do, products/services, and mission based ONLY on the provided crawled page content.

Return JSON in this exact structure:
{
  "summary": string, // 2-3 concise sentences summarizing the company background
  "what_they_do": string, // Detailed explanation of core products, technology, target audience, and business value
  "sources": string[] // List of source URLs used
}`;

    const prompt = `CRAWLED COMPANY CONTENT FOR ${companyUrl}:\n${crawlResult.combinedContent.slice(0, 10000)}\n\nGenerate Company Brief JSON:`;

    const result = await llmClient.generateStructuredJson<CompanyBrief>(
      { systemPrompt, prompt, temperature: 0.2 },
      (parsed) => {
        const check = CompanyBriefSchema.safeParse(parsed);
        if (!check.success) return { success: false, error: check.error.message };
        return { success: true, data: check.data as CompanyBrief };
      }
    );

    if (result && result.summary && result.what_they_do) {
      return {
        summary: result.summary,
        what_they_do: result.what_they_do,
        sources: result.sources && result.sources.length > 0 ? result.sources : sources,
      };
    }
  }

  // Fallback heuristic brief
  const primaryPage = crawlResult.pages[0];
  const summary = primaryPage?.metaDescription
    ? primaryPage.metaDescription
    : primaryPage?.title
    ? `Information about ${primaryPage.title} and their technology operations.`
    : `Leading technology company operating at ${companyUrl}.`;

  const what_they_do = primaryPage?.cleanedText
    ? primaryPage.cleanedText.slice(0, 400).replace(/\n+/g, ' ') + '...'
    : 'Provides enterprise solutions and digital platforms.';

  return {
    summary,
    what_they_do,
    sources,
  };
}

export async function generateQuestionsForCategory(
  category: QuestionCategory,
  role: RoleBreakdown,
  research: InterviewResearchResult,
  targetRequirements: Requirement[],
  startIndex: number
): Promise<Question[]> {
  if (targetRequirements.length === 0) {
    // If no specific requirements target this category, use general role requirements
    targetRequirements = role.requirements;
  }

  if (llmClient.isConfigured) {
    const systemPrompt = `You are a Principal Hiring Manager and Staff Interviewer for ${role.title} (${role.seniority}).
Generate realistic, high-depth interview questions strictly for the category: "${category}".

CRITICAL CONSTRAINTS:
1. Every question MUST reference at least one valid requirement ID from the provided list.
2. Question category MUST be strictly "${category}".
3. Difficulty MUST be an integer 1, 2, or 3 (1=Foundational, 2=Intermediate/Applied, 3=Deep/Architectural).
4. Provide a rich, structured answer outline covering key discussion points, trade-offs, and STAR structure where applicable.
5. Return JSON in this exact structure:
{
  "questions": [
    {
      "requirement_ids": ["r1"],
      "category": "${category}",
      "prompt": string,
      "answer_outline": string,
      "difficulty": 1 | 2 | 3
    }
  ]
}`;

    const prompt = `ROLE: ${role.title} (${role.seniority})
INTERVIEW STAGES & SIGNALS: ${research.stages.join(' -> ')}
TARGET REQUIREMENTS:
${JSON.stringify(targetRequirements, null, 2)}

Generate 2 to 4 high quality "${category}" interview questions:`;

    const result = await llmClient.generateStructuredJson<{ questions: Question[] }>({
      systemPrompt,
      prompt,
      temperature: 0.3,
    });

    if (result && Array.isArray(result.questions) && result.questions.length > 0) {
      const validReqIds = new Set(role.requirements.map((r) => r.id));
      const filtered: Question[] = [];

      let qIdx = startIndex;
      for (const rawQ of result.questions) {
        // Ensure category matches
        const cat: QuestionCategory = category;
        // Ensure difficulty in 1..3
        const diff: 1 | 2 | 3 = [1, 2, 3].includes(rawQ.difficulty) ? (rawQ.difficulty as 1 | 2 | 3) : 2;
        // Validate requirement IDs
        const reqIds = (rawQ.requirement_ids || []).filter((id) => validReqIds.has(id));
        if (reqIds.length === 0 && targetRequirements[0]) {
          reqIds.push(targetRequirements[0].id);
        }

        if (reqIds.length > 0 && rawQ.prompt && rawQ.answer_outline) {
          filtered.push({
            id: `q${qIdx++}`,
            requirement_ids: reqIds,
            category: cat,
            prompt: rawQ.prompt,
            answer_outline: rawQ.answer_outline,
            difficulty: diff,
            origin: 'generated',
          });
        }
      }

      if (filtered.length > 0) {
        return filtered;
      }
    }
  }

  // Fallback Question Generator for this category
  return fallbackGenerateQuestionsForCategory(category, role, targetRequirements, startIndex);
}

export function fallbackGenerateQuestionsForCategory(
  category: QuestionCategory,
  role: RoleBreakdown,
  targetRequirements: Requirement[],
  startIndex: number
): Question[] {
  const questions: Question[] = [];
  let qIdx = startIndex;

  for (let i = 0; i < Math.min(targetRequirements.length, 3); i++) {
    const req = targetRequirements[i];
    let prompt = '';
    let outline = '';
    let difficulty: 1 | 2 | 3 = req.priority === 'must' ? 2 : 1;

    switch (category) {
      case 'technical':
        prompt = `How would you demonstrate depth and handle edge cases when applying "${req.text}" in a scalable production codebase?`;
        outline = `1. Core mechanics and lifecycle of ${req.text}.\n2. Performance bottlenecks and optimization patterns.\n3. Common architectural pitfalls and debugging strategies.`;
        difficulty = 2;
        break;

      case 'behavioural':
        prompt = `Describe a time when you had to manage constraints or conflicting priorities related to "${req.text}". What approach did you take?`;
        outline = `Situation: Context and stakeholder expectations.\nTask: Objective related to ${req.text}.\nAction: Leadership, communication, and mitigation steps taken.\nResult: Quantifiable outcome and lessons learned.`;
        difficulty = 2;
        break;

      case 'system-design':
        prompt = `Design a resilient, fault-tolerant service architecture incorporating "${req.text}" supporting high concurrency and low latency.`;
        outline = `1. Functional & Non-functional requirements (QPS, SLA, storage).\n2. High-level architecture & API contracts.\n3. Data modeling, caching, sharding, and failover mechanics.`;
        difficulty = 3;
        break;

      case 'company-fit':
        prompt = `How does your previous experience with "${req.text}" align with our engineering culture of high ownership and continuous delivery?`;
        outline = `1. Personal work ethic and alignment with engineering excellence.\n2. Collaboration across cross-functional teams.\n3. Continuous learning and mentorship philosophy.`;
        difficulty = 1;
        break;
    }

    questions.push({
      id: `q${qIdx++}`,
      requirement_ids: [req.id],
      category,
      prompt,
      answer_outline: outline,
      difficulty,
      origin: 'generated',
    });
  }

  return questions;
}

export async function generateFlashcards(
  role: RoleBreakdown,
  questions: Question[]
): Promise<Flashcard[]> {
  if (llmClient.isConfigured) {
    const systemPrompt = `You are a Flashcard Creation specialist for technical interview prep.
Create high-yield, active recall flashcards covering the core requirements and concepts.

CRITICAL RULES:
1. Front: A crisp question or conceptual prompt.
2. Back: Clear, concise explanation or bulleted answer.
3. requirement_ids: Must map to one or more existing requirement IDs.
4. Return JSON in format:
{
  "flashcards": [
    {
      "front": string,
      "back": string,
      "requirement_ids": ["r1"]
    }
  ]
}`;

    const prompt = `ROLE REQUIREMENTS:\n${JSON.stringify(role.requirements, null, 2)}\n\nGenerate 4 to 8 flashcards:`;

    const result = await llmClient.generateStructuredJson<{ flashcards: Flashcard[] }>({
      systemPrompt,
      prompt,
      temperature: 0.3,
    });

    if (result && Array.isArray(result.flashcards) && result.flashcards.length > 0) {
      const validReqIds = new Set(role.requirements.map((r) => r.id));
      const filtered: Flashcard[] = [];

      let fIdx = 1;
      for (const card of result.flashcards) {
        const reqIds = (card.requirement_ids || []).filter((id) => validReqIds.has(id));
        if (reqIds.length === 0 && role.requirements[0]) {
          reqIds.push(role.requirements[0].id);
        }

        if (card.front && card.back) {
          filtered.push({
            id: `f${fIdx++}`,
            front: card.front,
            back: card.back,
            requirement_ids: reqIds,
            origin: 'generated',
          });
        }
      }

      if (filtered.length > 0) {
        return filtered;
      }
    }
  }

  // Fallback Flashcard generation
  const flashcards: Flashcard[] = [];
  let fIdx = 1;

  for (const req of role.requirements) {
    flashcards.push({
      id: `f${fIdx++}`,
      front: `Core Principles: ${req.text}`,
      back: `Key architectural patterns, trade-offs, and best practices associated with ${req.text}.`,
      requirement_ids: [req.id],
      origin: 'generated',
    });
  }

  return flashcards;
}
