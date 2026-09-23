import { RoleBreakdown, Requirement } from '@prep-kit/shared';
import { llmClient } from '../llm/llmClient.js';
import { RoleBreakdownSchema } from '@prep-kit/shared';

export async function extractJdRequirements(jdText: string): Promise<RoleBreakdown> {
  const trimmed = jdText.trim();
  if (!trimmed) {
    return {
      title: 'General Candidate',
      seniority: 'Mid-Level',
      responsibilities: [],
      requirements: [
        {
          id: 'r1',
          text: 'Demonstrate general software engineering competence',
          kind: 'technical',
          priority: 'must',
        },
      ],
    };
  }

  // 1. Try LLM Call
  if (llmClient.isConfigured) {
    const systemPrompt = `You are a precision Job Description Requirement Extraction engine.
Extract the exact role title, seniority level, responsibilities, and requirements from the given Job Description.

CRITICAL RULES:
1. DO NOT invent or extrapolate requirements that are not mentioned in the text.
2. Every requirement must have:
   - id: "r1", "r2", "r3", etc. (sequential starting from r1)
   - text: concise statement of the requirement directly from the JD
   - kind: strictly one of "technical", "behavioural", "domain"
   - priority: "must" (for required/mandatory items) or "nice" (for bonus/preferred/plus items)
3. If the JD is short or minimal, output only what is present. Thin descriptions MUST produce thin requirements.
4. Output must match this exact JSON structure:
{
  "title": string,
  "seniority": string,
  "responsibilities": string[],
  "requirements": [
    {
      "id": "r1",
      "text": string,
      "kind": "technical" | "behavioural" | "domain",
      "priority": "must" | "nice"
    }
  ]
}`;

    const prompt = `JOB DESCRIPTION:\n${trimmed}\n\nExtract and return the JSON object:`;

    const result = await llmClient.generateStructuredJson<RoleBreakdown>(
      { systemPrompt, prompt, temperature: 0.1 },
      (parsed) => {
        const check = RoleBreakdownSchema.safeParse(parsed);
        if (!check.success) {
          return { success: false, error: check.error.message };
        }
        return { success: true, data: check.data as RoleBreakdown };
      }
    );

    if (result && result.requirements && result.requirements.length > 0) {
      // Ensure stable sequential IDs
      result.requirements = result.requirements.map((r, idx) => ({
        ...r,
        id: `r${idx + 1}`,
      }));
      return result;
    }
  }

  // 2. Deterministic NLP / Heuristic Fallback
  return fallbackJdExtraction(trimmed);
}

export function fallbackJdExtraction(jdText: string): RoleBreakdown {
  const lines = jdText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let title = 'Software Engineer';
  let seniority = 'Mid-Level';

  // Infer title from first 3 lines or keywords
  for (const line of lines.slice(0, 5)) {
    const lower = line.toLowerCase();
    if (lower.includes('engineer') || lower.includes('developer') || lower.includes('architect') || lower.includes('manager') || lower.includes('lead')) {
      title = line.replace(/^[#*\-•\s]+/, '').trim();
      break;
    }
  }

  const lowerJd = jdText.toLowerCase();
  if (lowerJd.includes('principal') || lowerJd.includes('staff')) seniority = 'Staff / Principal';
  else if (lowerJd.includes('senior') || lowerJd.includes('sr.')) seniority = 'Senior';
  else if (lowerJd.includes('lead')) seniority = 'Lead';
  else if (lowerJd.includes('junior') || lowerJd.includes('jr.') || lowerJd.includes('entry') || lowerJd.includes('intern')) seniority = 'Junior';

  const responsibilities: string[] = [];
  const requirements: Requirement[] = [];
  let reqCount = 1;

  let currentSection: 'resp' | 'req' | 'none' = 'none';

  for (const line of lines) {
    const cleanLine = line.replace(/^[#*\-•\d.]+\s*/, '').trim();
    const lower = cleanLine.toLowerCase();

    if (lower.includes('responsibilit') || lower.includes('what you will do') || lower.includes('role overview')) {
      currentSection = 'resp';
      continue;
    }
    if (lower.includes('requirement') || lower.includes('qualifications') || lower.includes('what you bring') || lower.includes('skills')) {
      currentSection = 'req';
      continue;
    }

    const isBullet = /^[*•\-]|\d+\./.test(line);

    if (currentSection === 'resp' && isBullet && cleanLine.length > 10) {
      responsibilities.push(cleanLine);
    } else if ((currentSection === 'req' || isBullet) && cleanLine.length > 10) {
      // Determine priority
      const isNice =
        lower.includes('bonus') ||
        lower.includes('nice to have') ||
        lower.includes('preferred') ||
        lower.includes('plus') ||
        lower.includes('optional');
      const priority = isNice ? 'nice' : 'must';

      // Determine kind
      let kind: 'technical' | 'behavioural' | 'domain' = 'technical';
      if (
        lower.includes('communication') ||
        lower.includes('leadership') ||
        lower.includes('collaborat') ||
        lower.includes('mentor') ||
        lower.includes('team') ||
        lower.includes('attitude')
      ) {
        kind = 'behavioural';
      } else if (
        lower.includes('fintech') ||
        lower.includes('healthcare') ||
        lower.includes('e-commerce') ||
        lower.includes('saas') ||
        lower.includes('compliance') ||
        lower.includes('regulat') ||
        lower.includes('domain')
      ) {
        kind = 'domain';
      }

      // Avoid duplicates
      if (!requirements.some((r) => r.text.toLowerCase() === cleanLine.toLowerCase())) {
        requirements.push({
          id: `r${reqCount++}`,
          text: cleanLine,
          kind,
          priority,
        });
      }
    }
  }

  // If no bulleted requirements found, split sentences
  if (requirements.length === 0) {
    const sentences = jdText
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

    for (const sent of sentences.slice(0, 6)) {
      const lower = sent.toLowerCase();
      const isNice = lower.includes('bonus') || lower.includes('preferred') || lower.includes('plus');
      const kind = lower.includes('lead') || lower.includes('team') || lower.includes('mentor') ? 'behavioural' : 'technical';

      requirements.push({
        id: `r${reqCount++}`,
        text: sent,
        kind,
        priority: isNice ? 'nice' : 'must',
      });
    }
  }

  // Ensure at least one must-have requirement
  if (requirements.length === 0) {
    requirements.push({
      id: 'r1',
      text: 'Demonstrate fundamental software engineering capabilities matching the job description',
      kind: 'technical',
      priority: 'must',
    });
  } else if (!requirements.some((r) => r.priority === 'must')) {
    requirements[0].priority = 'must';
  }

  return {
    title,
    seniority,
    responsibilities: responsibilities.slice(0, 8),
    requirements: requirements.slice(0, 15),
  };
}
