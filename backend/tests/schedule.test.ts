import { describe, it, expect } from 'vitest';
import { allocateSchedule } from '../src/services/scheduling/scheduleAllocator.js';
import { Question, Requirement } from '@prep-kit/shared';

const mockRequirements: Requirement[] = [
  { id: 'r1', text: '5+ years with React & TypeScript', kind: 'technical', priority: 'must' },
  { id: 'r2', text: 'Distributed Systems Architecture', kind: 'technical', priority: 'must' },
  { id: 'r3', text: 'PostgreSQL & Database Tuning', kind: 'technical', priority: 'must' },
  { id: 'r4', text: 'Cross-team leadership & mentorship', kind: 'behavioural', priority: 'nice' },
];

const mockQuestions: Question[] = [
  {
    id: 'q1',
    requirement_ids: ['r1'],
    category: 'technical',
    prompt: 'Explain React concurrency and fiber reconciler.',
    answer_outline: 'Fiber tree, work in progress, scheduling priorities.',
    difficulty: 2,
  },
  {
    id: 'q2',
    requirement_ids: ['r2'],
    category: 'system-design',
    prompt: 'Design a distributed rate limiter.',
    answer_outline: 'Token bucket, Redis cluster, clock skew handling.',
    difficulty: 3,
  },
  {
    id: 'q3',
    requirement_ids: ['r3'],
    category: 'technical',
    prompt: 'Explain explain plans and B-tree index scans in PostgreSQL.',
    answer_outline: 'Sequential vs index scan, cost calculation, vacuuming.',
    difficulty: 2,
  },
  {
    id: 'q4',
    requirement_ids: ['r4'],
    category: 'behavioural',
    prompt: 'How do you mentor engineers through architectural decisions?',
    answer_outline: 'Design docs, active listening, delegation.',
    difficulty: 1,
  },
];

describe('Schedule Allocator Service', () => {
  it('allocates exactly 1 day schedule with all questions and realistic minutes', () => {
    const schedule = allocateSchedule(1, mockQuestions, mockRequirements);
    expect(schedule.days_available).toBe(1);
    expect(schedule.days.length).toBe(1);
    expect(schedule.days[0].day).toBe(1);
    expect(schedule.days[0].question_ids.length).toBe(4);
    expect(schedule.days[0].minutes).toBeGreaterThanOrEqual(45);
    expect(Number.isInteger(schedule.days[0].minutes)).toBe(true);
  });

  it('allocates exactly 5 days schedule representing every must-have requirement', () => {
    const schedule = allocateSchedule(5, mockQuestions, mockRequirements);
    expect(schedule.days_available).toBe(5);
    expect(schedule.days.length).toBe(5);

    // Verify sequential day numbers
    schedule.days.forEach((day, idx) => {
      expect(day.day).toBe(idx + 1);
      expect(Number.isInteger(day.minutes)).toBe(true);
      expect(day.minutes).toBeGreaterThanOrEqual(30);
      expect(day.focus.length).toBeGreaterThan(5);
    });

    // Verify every must-have requirement appears in schedule questions
    const allScheduledQIds = new Set(schedule.days.flatMap((d) => d.question_ids));
    const coveredReqsInSchedule = new Set<string>();
    mockQuestions.forEach((q) => {
      if (allScheduledQIds.has(q.id)) {
        q.requirement_ids.forEach((reqId) => coveredReqsInSchedule.add(reqId));
      }
    });

    expect(coveredReqsInSchedule.has('r1')).toBe(true);
    expect(coveredReqsInSchedule.has('r2')).toBe(true);
    expect(coveredReqsInSchedule.has('r3')).toBe(true);
  });

  it('allocates exactly 60 days schedule without negative minutes or broken references', () => {
    const schedule = allocateSchedule(60, mockQuestions, mockRequirements);
    expect(schedule.days_available).toBe(60);
    expect(schedule.days.length).toBe(60);

    const validQIds = new Set(mockQuestions.map((q) => q.id));
    schedule.days.forEach((day) => {
      expect(day.minutes).toBeGreaterThan(0);
      day.question_ids.forEach((qid) => {
        expect(validQIds.has(qid)).toBe(true);
      });
    });
  });

  it('prioritizes difficult and must-have questions earlier in the schedule', () => {
    const schedule = allocateSchedule(4, mockQuestions, mockRequirements);
    // Day 1 should receive the highest scored item (q2 is diff 3 + must-have)
    expect(schedule.days[0].question_ids.includes('q2')).toBe(true);
  });
});
