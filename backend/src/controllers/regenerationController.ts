import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { datastore } from '../models/datastore.js';
import { QuestionCategory, Question } from '@prep-kit/shared';
import { generateCompanyBrief, generateQuestionsForCategory } from '../services/generation/kitGenerators.js';
import { CompanyCrawler } from '../services/crawler/companyCrawler.js';
import { extractInterviewResearch } from '../services/research/interviewResearch.js';
import { checkCoverage } from '../services/coverage/coverageEngine.js';
import { allocateSchedule } from '../services/scheduling/scheduleAllocator.js';

export async function regenerateCompanyBriefHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const record = await datastore.findKitById(req.params.id);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found or not completed' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  try {
    const crawler = new CompanyCrawler();
    const crawlResult = await crawler.crawl(record.kit.source.company_url);
    const newBrief = await generateCompanyBrief(record.kit.source.company_url, crawlResult);

    record.kit.company_brief = {
      ...newBrief,
      edited: false,
    };

    await datastore.updateKit(record.id, { kit: record.kit });
    res.status(200).json({ company_brief: record.kit.company_brief, message: 'Company brief regenerated' });
  } catch (err: unknown) {
    res.status(500).json({
      error: { code: 'REGENERATION_FAILED', message: err instanceof Error ? err.message : String(err) },
    });
  }
}

export async function regenerateQuestionsCategoryHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const category = req.params.category as QuestionCategory;
  const validCategories: QuestionCategory[] = ['technical', 'behavioural', 'system-design', 'company-fit'];
  if (!validCategories.includes(category)) {
    res.status(400).json({ error: { code: 'INVALID_CATEGORY', message: `Invalid category: ${category}` } });
    return;
  }

  const record = await datastore.findKitById(req.params.id);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found or not completed' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  try {
    const existingQuestions = record.kit.questions;

    // Separate questions into:
    // 1. Other categories (untouched)
    // 2. Protected in this category (user-created, edited, or pinned)
    // 3. Replaceable generated questions in this category
    const otherCategoryQuestions = existingQuestions.filter((q) => q.category !== category);
    const protectedCategoryQuestions = existingQuestions.filter(
      (q) => q.category === category && (q.origin === 'user' || q.edited === true || q.pinned === true)
    );

    // Target requirements for this category
    const role = record.kit.role;
    let targetReqs = role.requirements;
    if (category === 'technical' || category === 'system-design') {
      const filtered = role.requirements.filter((r) => r.kind === 'technical');
      if (filtered.length > 0) targetReqs = filtered;
    } else if (category === 'behavioural') {
      const filtered = role.requirements.filter((r) => r.kind === 'behavioural');
      if (filtered.length > 0) targetReqs = filtered;
    } else if (category === 'company-fit') {
      const filtered = role.requirements.filter((r) => r.kind === 'domain');
      if (filtered.length > 0) targetReqs = filtered;
    }

    // Generate fresh questions for this category
    const crawler = new CompanyCrawler();
    const crawlResult = await crawler.crawl(record.kit.source.company_url);
    const research = extractInterviewResearch(role.title, crawlResult);

    const maxExistingId = Math.max(
      ...existingQuestions.map((q) => parseInt(q.id.replace(/\D/g, ''), 10) || 0),
      0
    );

    const newGeneratedQuestions = await generateQuestionsForCategory(
      category,
      role,
      research,
      targetReqs,
      maxExistingId + 1
    );

    // Merge: other categories + preserved protected questions + fresh generated questions
    const mergedQuestions: Question[] = [
      ...otherCategoryQuestions,
      ...protectedCategoryQuestions,
      ...newGeneratedQuestions,
    ];

    record.kit.questions = mergedQuestions;

    // Recalculate deterministic coverage
    const coverageResult = checkCoverage(role.requirements, mergedQuestions);
    record.kit.coverage.uncovered_requirement_ids = coverageResult.uncoveredMustRequirementIds;

    // Re-allocate schedule to ensure valid question IDs
    record.kit.schedule = allocateSchedule(
      record.kit.schedule.days_available,
      mergedQuestions,
      role.requirements
    );

    await datastore.updateKit(record.id, { kit: record.kit });

    res.status(200).json({
      kit: record.kit,
      preservedCount: protectedCategoryQuestions.length,
      newGeneratedCount: newGeneratedQuestions.length,
      message: `Category '${category}' regenerated while preserving ${protectedCategoryQuestions.length} edited/pinned question(s).`,
    });
  } catch (err: unknown) {
    res.status(500).json({
      error: { code: 'REGENERATION_FAILED', message: err instanceof Error ? err.message : String(err) },
    });
  }
}

export async function regenerateScheduleHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const record = await datastore.findKitById(req.params.id);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found or not completed' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const daysAvailable = req.body.days_available || record.kit.schedule.days_available;
  const safeDays = Math.max(1, Math.min(60, Math.floor(daysAvailable)));

  record.kit.schedule = allocateSchedule(
    safeDays,
    record.kit.questions,
    record.kit.role.requirements
  );

  await datastore.updateKit(record.id, { kit: record.kit });
  res.status(200).json({ schedule: record.kit.schedule, message: 'Schedule recomputed' });
}
