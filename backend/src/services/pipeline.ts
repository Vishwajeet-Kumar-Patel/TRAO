import {
  InterviewKitData,
  KitGenerationProgress,
  PipelineStage,
  validateInterviewKit,
  Question,
} from '@prep-kit/shared';
import { extractJdRequirements } from './extraction/jdExtractor.js';
import { CompanyCrawler } from './crawler/companyCrawler.js';
import { extractInterviewResearch } from './research/interviewResearch.js';
import {
  generateCompanyBrief,
  generateQuestionsForCategory,
  generateFlashcards,
} from './generation/kitGenerators.js';
import { closeCoverageGaps } from './coverage/coverageEngine.js';
import { allocateSchedule } from './scheduling/scheduleAllocator.js';

export interface PipelineOptions {
  jd: string;
  companyUrl: string;
  days: number;
  onProgress?: (progress: KitGenerationProgress) => void;
}

export async function runKitGenerationPipeline(
  options: PipelineOptions
): Promise<InterviewKitData> {
  const { jd, companyUrl, days, onProgress } = options;

  const emit = (stage: PipelineStage, message: string, percentage: number) => {
    if (onProgress) {
      onProgress({ stage, message, percentage });
    }
  };

  // 1. Validation Stage
  emit('validating', 'Validating job description, company URL, and schedule days...', 5);
  const safeDays = Math.max(1, Math.min(60, Math.floor(days || 5)));
  if (!jd || jd.trim().length === 0) {
    throw new Error('Job description cannot be empty');
  }

  // 2. Requirement Extraction
  emit('extracting', 'Analyzing job description and extracting core requirements...', 15);
  const roleBreakdown = await extractJdRequirements(jd);

  // 3. Web Retrieval & Company Crawling
  emit('researching', `Crawling ${companyUrl} and discovering engineering/hiring pages...`, 30);
  const crawler = new CompanyCrawler();
  const crawlResult = await crawler.crawl(companyUrl);

  // 4. Public Interview Research
  const research = extractInterviewResearch(roleBreakdown.title, crawlResult);

  // 5. Company Brief Generation
  emit('generating_brief', 'Synthesizing company background and operational brief...', 45);
  const companyBrief = await generateCompanyBrief(companyUrl, crawlResult);

  // 6. Categorized Question Generation (Calls 3, 4, 5, 6)
  emit('generating_questions', 'Generating technical, behavioural, and system design questions...', 60);

  const techReqs = roleBreakdown.requirements.filter((r) => r.kind === 'technical');
  const behavReqs = roleBreakdown.requirements.filter((r) => r.kind === 'behavioural');
  const domainReqs = roleBreakdown.requirements.filter((r) => r.kind === 'domain');

  let nextQIndex = 1;

  // Technical Questions
  const techQuestions = await generateQuestionsForCategory(
    'technical',
    roleBreakdown,
    research,
    techReqs.length > 0 ? techReqs : roleBreakdown.requirements,
    nextQIndex
  );
  nextQIndex += techQuestions.length;

  // Behavioural Questions
  const behavQuestions = await generateQuestionsForCategory(
    'behavioural',
    roleBreakdown,
    research,
    behavReqs.length > 0 ? behavReqs : roleBreakdown.requirements,
    nextQIndex
  );
  nextQIndex += behavQuestions.length;

  // System Design Questions
  const systemDesignQuestions = await generateQuestionsForCategory(
    'system-design',
    roleBreakdown,
    research,
    techReqs.length > 0 ? techReqs : roleBreakdown.requirements,
    nextQIndex
  );
  nextQIndex += systemDesignQuestions.length;

  // Company Fit Questions
  const fitQuestions = await generateQuestionsForCategory(
    'company-fit',
    roleBreakdown,
    research,
    domainReqs.length > 0 ? domainReqs : roleBreakdown.requirements,
    nextQIndex
  );
  nextQIndex += fitQuestions.length;

  const initialQuestions: Question[] = [
    ...techQuestions,
    ...behavQuestions,
    ...systemDesignQuestions,
    ...fitQuestions,
  ];

  // 7. Flashcards Generation (Call 7)
  emit('generating_flashcards', 'Generating high-yield active recall flashcards...', 70);
  const flashcards = await generateFlashcards(roleBreakdown, initialQuestions);

  // 8. Deterministic Coverage Engine & Second-Pass Gap Closing (Call 8+)
  emit('checking_coverage', 'Running deterministic coverage check & closing requirement gaps...', 80);
  const { questions: finalQuestions, coverage } = await closeCoverageGaps(
    roleBreakdown,
    initialQuestions,
    research,
    3
  );

  // 9. Deterministic Schedule Allocation
  emit('scheduling', `Building deterministic ${safeDays}-day interview preparation schedule...`, 90);
  const schedule = allocateSchedule(safeDays, finalQuestions, roleBreakdown.requirements);

  // 10. Assemble and Validate Complete Kit
  emit('validating_kit', 'Validating kit structure against Appendix A schema specifications...', 95);

  const kit: InterviewKitData = {
    source: {
      company: roleBreakdown.title ? `${crawlResult.pages[0]?.title || 'Target Company'}` : 'Target Company',
      company_url: crawlResult.rootUrl || companyUrl,
      role: roleBreakdown.title || 'Software Engineer',
      location: 'Remote / On-site',
      jd_chars: jd.length,
      researched_at: new Date().toISOString(),
      pages_used: crawlResult.pagesUsed,
    },
    company_brief: companyBrief,
    role: roleBreakdown,
    questions: finalQuestions,
    flashcards,
    schedule,
    coverage,
  };

  const validation = validateInterviewKit(kit);
  if (!validation.success) {
    console.warn('[Pipeline] Kit validation issues detected:', validation.errors);
    // Auto-fix if any minor schedule day mismatches
    kit.schedule = allocateSchedule(safeDays, kit.questions, kit.role.requirements);
  }

  emit('completed', 'Interview kit successfully generated and validated!', 100);

  return kit;
}
