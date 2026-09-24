import {
  Requirement,
  Question,
  CoverageInfo,
  RoleBreakdown,
  QuestionCategory,
} from '@prep-kit/shared';
import { generateQuestionsForCategory } from '../generation/kitGenerators.js';
import { InterviewResearchResult } from '../research/interviewResearch.js';

export interface CoverageCheckResult {
  coveredRequirementIds: string[];
  uncoveredMustRequirementIds: string[];
  allUncoveredRequirementIds: string[];
  isFullyCovered: boolean;
  coverageRatio: number;
}

/**
 * Deterministic coverage check implemented strictly in TypeScript.
 */
export function checkCoverage(
  requirements: Requirement[],
  questions: Question[]
): CoverageCheckResult {
  const coveredSet = new Set<string>();

  for (const q of questions) {
    if (Array.isArray(q.requirement_ids)) {
      for (const reqId of q.requirement_ids) {
        coveredSet.add(reqId);
      }
    }
  }

  const coveredRequirementIds = Array.from(coveredSet);

  const mustRequirements = requirements.filter((r) => r.priority === 'must');
  const uncoveredMustRequirementIds = mustRequirements
    .filter((r) => !coveredSet.has(r.id))
    .map((r) => r.id);

  const allUncoveredRequirementIds = requirements
    .filter((r) => !coveredSet.has(r.id))
    .map((r) => r.id);

  const totalMust = mustRequirements.length;
  const coveredMust = totalMust - uncoveredMustRequirementIds.length;
  const coverageRatio = totalMust > 0 ? coveredMust / totalMust : 1.0;

  return {
    coveredRequirementIds,
    uncoveredMustRequirementIds,
    allUncoveredRequirementIds,
    isFullyCovered: uncoveredMustRequirementIds.length === 0,
    coverageRatio,
  };
}

/**
 * Multi-pass gap closer that runs deterministic coverage check,
 * generates missing targeted questions for uncovered must-have requirements,
 * and updates passes count.
 */
export async function closeCoverageGaps(
  role: RoleBreakdown,
  initialQuestions: Question[],
  research: InterviewResearchResult,
  maxPasses = 3
): Promise<{ questions: Question[]; coverage: CoverageInfo }> {
  let currentQuestions = [...initialQuestions];
  let currentPass = 1;

  let checkResult = checkCoverage(role.requirements, currentQuestions);

  while (!checkResult.isFullyCovered && currentPass < maxPasses) {
    currentPass++;

    // Find the specific missing must-have requirements
    const missingMustReqs = role.requirements.filter((r) =>
      checkResult.uncoveredMustRequirementIds.includes(r.id)
    );

    if (missingMustReqs.length === 0) break;

    // Group missing requirements by kind to generate targeted questions
    const techReqs = missingMustReqs.filter((r) => r.kind === 'technical');
    const behavReqs = missingMustReqs.filter((r) => r.kind === 'behavioural');
    const domainReqs = missingMustReqs.filter((r) => r.kind === 'domain');

    let nextQIndex = currentQuestions.length + 1;
    const newQuestions: Question[] = [];

    if (techReqs.length > 0) {
      const generated = await generateQuestionsForCategory(
        'technical',
        role,
        research,
        techReqs,
        nextQIndex
      );
      newQuestions.push(...generated);
      nextQIndex += generated.length;
    }

    if (behavReqs.length > 0) {
      const generated = await generateQuestionsForCategory(
        'behavioural',
        role,
        research,
        behavReqs,
        nextQIndex
      );
      newQuestions.push(...generated);
      nextQIndex += generated.length;
    }

    if (domainReqs.length > 0) {
      const generated = await generateQuestionsForCategory(
        'company-fit',
        role,
        research,
        domainReqs,
        nextQIndex
      );
      newQuestions.push(...generated);
      nextQIndex += generated.length;
    }

    // If no questions were generated for some reason, create deterministic fallbacks
    for (const req of missingMustReqs) {
      const isAlreadyCovered = newQuestions.some((q) => q.requirement_ids.includes(req.id));
      if (!isAlreadyCovered) {
        let cat: QuestionCategory = 'technical';
        if (req.kind === 'behavioural') cat = 'behavioural';
        if (req.kind === 'domain') cat = 'company-fit';

        newQuestions.push({
          id: `q${nextQIndex++}`,
          requirement_ids: [req.id],
          category: cat,
          prompt: `Targeted Assessment: How do you satisfy and apply "${req.text}" in high-stakes projects?`,
          answer_outline: `1. Core principles of ${req.text}.\n2. Real-world implementation examples.\n3. Common failure modes and trade-off considerations.`,
          difficulty: 2,
          origin: 'generated',
        });
      }
    }

    currentQuestions = [...currentQuestions, ...newQuestions];
    checkResult = checkCoverage(role.requirements, currentQuestions);
  }

  return {
    questions: currentQuestions,
    coverage: {
      uncovered_requirement_ids: checkResult.uncoveredMustRequirementIds,
      passes: currentPass,
    },
  };
}
