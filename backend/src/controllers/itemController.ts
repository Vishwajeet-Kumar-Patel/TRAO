import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { datastore } from '../models/datastore.js';
import { Question, Flashcard, QuestionSchema, FlashcardSchema } from '@prep-kit/shared';
import { checkCoverage } from '../services/coverage/coverageEngine.js';
import { allocateSchedule } from '../services/scheduling/scheduleAllocator.js';

// Question Handlers
export async function addQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const record = await datastore.findKitById(req.params.id);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const rawQuestion = req.body;
  const nextIdNum =
    Math.max(...record.kit.questions.map((q) => parseInt(q.id.replace(/\D/g, ''), 10) || 0), 0) + 1;
  const newQuestion: Question = {
    id: `q${nextIdNum}`,
    requirement_ids: rawQuestion.requirement_ids || [record.kit.role.requirements[0]?.id || 'r1'],
    category: rawQuestion.category || 'technical',
    prompt: rawQuestion.prompt || 'New Question Prompt',
    answer_outline: rawQuestion.answer_outline || 'Answer outline here...',
    difficulty: [1, 2, 3].includes(rawQuestion.difficulty) ? rawQuestion.difficulty : 2,
    origin: 'user',
    edited: true,
  };

  const validation = QuestionSchema.safeParse(newQuestion);
  if (!validation.success) {
    res.status(400).json({ error: { code: 'INVALID_QUESTION', message: validation.error.message } });
    return;
  }

  record.kit.questions.push(newQuestion);

  // Update coverage and schedule
  const cov = checkCoverage(record.kit.role.requirements, record.kit.questions);
  record.kit.coverage.uncovered_requirement_ids = cov.uncoveredMustRequirementIds;
  record.kit.schedule = allocateSchedule(
    record.kit.schedule.days_available,
    record.kit.questions,
    record.kit.role.requirements
  );

  await datastore.updateKit(record.id, { kit: record.kit });
  res.status(201).json({ question: newQuestion, kit: record.kit });
}

export async function updateQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const record = await datastore.findKitById(req.params.id);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const questionId = req.params.questionId;
  const qIndex = record.kit.questions.findIndex((q) => q.id === questionId);

  if (qIndex === -1) {
    res.status(404).json({ error: { code: 'QUESTION_NOT_FOUND', message: 'Question not found in this kit' } });
    return;
  }

  const existing = record.kit.questions[qIndex];
  const updated: Question = {
    ...existing,
    ...req.body,
    id: existing.id, // ID must remain stable
    edited: true, // Mark as edited so regeneration preserves it
  };

  record.kit.questions[qIndex] = updated;

  // Recalculate coverage
  const cov = checkCoverage(record.kit.role.requirements, record.kit.questions);
  record.kit.coverage.uncovered_requirement_ids = cov.uncoveredMustRequirementIds;

  await datastore.updateKit(record.id, { kit: record.kit });
  res.status(200).json({ question: updated, kit: record.kit });
}

export async function deleteQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const record = await datastore.findKitById(req.params.id);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const questionId = req.params.questionId;
  record.kit.questions = record.kit.questions.filter((q) => q.id !== questionId);

  // Recalculate coverage and clean up schedule
  const cov = checkCoverage(record.kit.role.requirements, record.kit.questions);
  record.kit.coverage.uncovered_requirement_ids = cov.uncoveredMustRequirementIds;
  record.kit.schedule = allocateSchedule(
    record.kit.schedule.days_available,
    record.kit.questions,
    record.kit.role.requirements
  );

  await datastore.updateKit(record.id, { kit: record.kit });
  res.status(200).json({ message: 'Question deleted', kit: record.kit });
}

export async function reorderQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const record = await datastore.findKitById(req.params.id);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const { orderedQuestionIds } = req.body;
  if (!Array.isArray(orderedQuestionIds)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'orderedQuestionIds array required' } });
    return;
  }

  const qMap = new Map(record.kit.questions.map((q) => [q.id, q]));
  const reordered: Question[] = [];

  for (const qId of orderedQuestionIds) {
    const q = qMap.get(qId);
    if (q) {
      reordered.push(q);
      qMap.delete(qId);
    }
  }

  // Append any remaining questions
  for (const remaining of qMap.values()) {
    reordered.push(remaining);
  }

  record.kit.questions = reordered;
  await datastore.updateKit(record.id, { kit: record.kit });
  res.status(200).json({ questions: record.kit.questions });
}

// Flashcard Handlers
export async function addFlashcard(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const record = await datastore.findKitById(req.params.id);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const rawCard = req.body;
  const nextIdNum =
    Math.max(...record.kit.flashcards.map((f) => parseInt(f.id.replace(/\D/g, ''), 10) || 0), 0) + 1;
  const newCard: Flashcard = {
    id: `f${nextIdNum}`,
    front: rawCard.front || 'Front prompt',
    back: rawCard.back || 'Back answer explanation',
    requirement_ids: rawCard.requirement_ids || [record.kit.role.requirements[0]?.id || 'r1'],
    origin: 'user',
    edited: true,
  };

  const validation = FlashcardSchema.safeParse(newCard);
  if (!validation.success) {
    res.status(400).json({ error: { code: 'INVALID_FLASHCARD', message: validation.error.message } });
    return;
  }

  record.kit.flashcards.push(newCard);
  await datastore.updateKit(record.id, { kit: record.kit });
  res.status(201).json({ flashcard: newCard, kit: record.kit });
}

export async function updateFlashcard(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const record = await datastore.findKitById(req.params.id);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const flashcardId = req.params.flashcardId;
  const fIndex = record.kit.flashcards.findIndex((f) => f.id === flashcardId);

  if (fIndex === -1) {
    res.status(404).json({ error: { code: 'FLASHCARD_NOT_FOUND', message: 'Flashcard not found' } });
    return;
  }

  const existing = record.kit.flashcards[fIndex];
  const updated: Flashcard = {
    ...existing,
    ...req.body,
    id: existing.id,
    edited: true,
  };

  record.kit.flashcards[fIndex] = updated;
  await datastore.updateKit(record.id, { kit: record.kit });
  res.status(200).json({ flashcard: updated, kit: record.kit });
}

export async function deleteFlashcard(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const record = await datastore.findKitById(req.params.id);
  if (!record || !record.kit) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kit not found' } });
    return;
  }

  if (record.userId !== req.user.userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  const flashcardId = req.params.flashcardId;
  record.kit.flashcards = record.kit.flashcards.filter((f) => f.id !== flashcardId);

  await datastore.updateKit(record.id, { kit: record.kit });
  res.status(200).json({ message: 'Flashcard deleted', kit: record.kit });
}
