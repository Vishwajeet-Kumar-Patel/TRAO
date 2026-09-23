import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { datastore } from '../models/datastore.js';
import {
  ConfidenceLevel,
  PracticeSummary,
  WeakSpotItem,
  WeakSpotsReport,
} from '@prep-kit/shared';

export async function recordPracticeAttempt(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const { kitId, flashcardId } = req.params;
  const { confidence } = req.body;

  const validLevels: ConfidenceLevel[] = [1, 2, 3, 4, 5];
  if (!validLevels.includes(confidence)) {
    res.status(400).json({ error: { code: 'INVALID_CONFIDENCE', message: 'Confidence must be integer 1 to 5' } });
    return;
  }

  const record = await datastore.findKitById(kitId);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const saved = await datastore.savePracticeAttempt(
    req.user.userId,
    kitId,
    flashcardId,
    confidence as ConfidenceLevel
  );

  res.status(200).json({ practiceState: saved });
}

export async function getPracticeOverview(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const kitId = req.params.kitId;
  const record = await datastore.findKitById(kitId);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const practiceStates = await datastore.getPracticeStatesForKit(req.user.userId, kitId);
  const flashcards = record.kit.flashcards;

  const stateMap = new Map(practiceStates.map((s) => [s.flashcardId, s]));

  // Prioritization sorting algorithm:
  // 1. Lowest confidence first (confidence 1 -> 2 -> 3)
  // 2. Unreviewed cards next
  // 3. Least recently reviewed cards
  const prioritizedFlashcards = [...flashcards].sort((a, b) => {
    const stateA = stateMap.get(a.id);
    const stateB = stateMap.get(b.id);

    const confA = stateA ? stateA.confidence : 0;
    const confB = stateB ? stateB.confidence : 0;

    if (confA !== confB) {
      return confA - confB; // Lower confidence first
    }

    const timeA = stateA ? new Date(stateA.lastReviewedAt).getTime() : 0;
    const timeB = stateB ? new Date(stateB.lastReviewedAt).getTime() : 0;
    return timeA - timeB; // Older review first
  });

  const coveredCount = practiceStates.filter((s) => s.covered).length;
  const totalConfidence = practiceStates.reduce((acc, s) => acc + s.confidence, 0);
  const averageConfidence = practiceStates.length > 0 ? totalConfidence / practiceStates.length : 0;

  const summary: PracticeSummary = {
    kitId,
    totalCards: flashcards.length,
    coveredCards: coveredCount,
    averageConfidence: Number(averageConfidence.toFixed(2)),
    weakCardCount: practiceStates.filter((s) => s.confidence <= 2).length,
    strongCardCount: practiceStates.filter((s) => s.confidence >= 4).length,
  };

  res.status(200).json({
    summary,
    practiceStates,
    prioritizedFlashcards,
  });
}

export async function getWeakSpotsReportHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const kitId = req.params.kitId;
  const record = await datastore.findKitById(kitId);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const practiceStates = await datastore.getPracticeStatesForKit(req.user.userId, kitId);
  const stateMap = new Map(practiceStates.map((s) => [s.flashcardId, s]));

  const requirements = record.kit.role.requirements;
  const questions = record.kit.questions;
  const flashcards = record.kit.flashcards;

  const weakSpots: WeakSpotItem[] = [];

  for (const reqItem of requirements) {
    // Associated flashcards
    const linkedCards = flashcards.filter((f) => f.requirement_ids.includes(reqItem.id));
    const linkedQs = questions.filter((q) => q.requirement_ids.includes(reqItem.id));

    let totalConf = 0;
    let reviewedCardCount = 0;

    for (const card of linkedCards) {
      const state = stateMap.get(card.id);
      if (state) {
        totalConf += state.confidence;
        reviewedCardCount++;
      }
    }

    const avgConf = reviewedCardCount > 0 ? totalConf / reviewedCardCount : 2.5;

    let recommendation = 'Review foundational concepts and complete scheduled practice questions.';
    if (avgConf <= 2) {
      recommendation = `CRITICAL WEAK SPOT: Score is low (${avgConf.toFixed(1)}/5). Prioritize active recall flashcards and practice answer outlines.`;
    } else if (reqItem.priority === 'must' && linkedQs.length === 0) {
      recommendation = 'Coverage gap detected: generate and practice targeted questions for this must-have requirement.';
    }

    weakSpots.push({
      requirementId: reqItem.id,
      requirementText: reqItem.text,
      kind: reqItem.kind,
      priority: reqItem.priority,
      averageConfidence: Number(avgConf.toFixed(1)),
      associatedQuestionCount: linkedQs.length,
      associatedFlashcardCount: linkedCards.length,
      sampleQuestions: linkedQs.slice(0, 2).map((q) => q.prompt),
      recommendation,
    });
  }

  // Sort by average confidence ascending (lowest first), then must-have priority
  weakSpots.sort((a, b) => {
    if (a.averageConfidence !== b.averageConfidence) {
      return a.averageConfidence - b.averageConfidence;
    }
    return a.priority === 'must' ? -1 : 1;
  });

  const overallScore =
    weakSpots.length > 0
      ? Math.round(
          (weakSpots.reduce((acc, item) => acc + item.averageConfidence, 0) / (weakSpots.length * 5)) * 100
        )
      : 50;

  const report: WeakSpotsReport = {
    kitId,
    generatedAt: new Date().toISOString(),
    overallScore,
    weakSpots: weakSpots.slice(0, 6),
    suggestedFocusDays: [1, 2],
  };

  res.status(200).json({ report });
}
