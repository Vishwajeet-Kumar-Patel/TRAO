import { describe, it, expect } from 'vitest';
import { validateInterviewKit, InterviewKitSchema } from '../src/schemas/kitSchema.js';
import { InterviewKitData } from '../src/types/kit.js';

const createValidKit = (): InterviewKitData => ({
  source: {
    company: 'Acme Corp',
    company_url: 'https://acme.example.com',
    role: 'Senior Full Stack Engineer',
    location: 'Remote',
    jd_chars: 1200,
    researched_at: '2026-09-01T10:00:00Z',
    pages_used: ['https://acme.example.com/about'],
  },
  company_brief: {
    summary: 'Acme is a cloud workflow automation platform.',
    what_they_do: 'Builds enterprise pipeline and data orchestration software.',
    sources: ['https://acme.example.com/about'],
  },
  role: {
    title: 'Senior Full Stack Engineer',
    seniority: 'Senior',
    responsibilities: ['Architect web apps', 'Lead team code reviews'],
    requirements: [
      {
        id: 'r1',
        text: '5+ years with React and TypeScript',
        kind: 'technical',
        priority: 'must',
      },
      {
        id: 'r2',
        text: 'Experience with Node.js and MongoDB',
        kind: 'technical',
        priority: 'must',
      },
      {
        id: 'r3',
        text: 'Mentorship and cross-functional leadership',
        kind: 'behavioural',
        priority: 'nice',
      },
    ],
  },
  questions: [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Explain how React concurrency and Server Components improve rendering performance.',
      answer_outline: 'Discuss hydration, streaming HTML, and reducing bundle size.',
      difficulty: 2,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'technical',
      prompt: 'How would you optimize high-throughput MongoDB write streams in Node.js?',
      answer_outline: 'Explain connection pooling, bulk operations, and indexing strategies.',
      difficulty: 3,
    },
    {
      id: 'q3',
      requirement_ids: ['r3'],
      category: 'behavioural',
      prompt: 'Describe a situation where you resolved a technical dispute among team members.',
      answer_outline: 'Use STAR method: explain conflict, listening approach, and consensus outcome.',
      difficulty: 2,
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'What is the primary benefit of React Server Components?',
      back: 'Zero bundle size on client for server-only dependencies and direct backend data access.',
      requirement_ids: ['r1'],
    },
  ],
  schedule: {
    days_available: 3,
    days: [
      {
        day: 1,
        focus: 'Core React & Modern Frontend Architecture',
        question_ids: ['q1'],
        minutes: 60,
      },
      {
        day: 2,
        focus: 'Backend Data Systems & MongoDB Optimizations',
        question_ids: ['q2'],
        minutes: 60,
      },
      {
        day: 3,
        focus: 'Behavioural Leadership & Teamwork',
        question_ids: ['q3'],
        minutes: 45,
      },
    ],
  },
  coverage: {
    uncovered_requirement_ids: [],
    passes: 1,
  },
});

describe('InterviewKitSchema Validator', () => {
  it('validates a correct Appendix A conforming interview kit', () => {
    const kit = createValidKit();
    const result = validateInterviewKit(kit);
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('rejects a kit with mismatching schedule days_available and days array count', () => {
    const kit = createValidKit();
    kit.schedule.days_available = 5; // but only 3 days in array
    const result = validateInterviewKit(kit);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes('Schedule must contain exactly 5 days'))).toBe(true);
  });

  it('rejects a question referencing a non-existent requirement ID', () => {
    const kit = createValidKit();
    kit.questions[0].requirement_ids = ['non-existent-r99'];
    const result = validateInterviewKit(kit);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes('non-existent requirement ID'))).toBe(true);
  });

  it('rejects a schedule referencing a non-existent question ID', () => {
    const kit = createValidKit();
    kit.schedule.days[0].question_ids = ['q999'];
    const result = validateInterviewKit(kit);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes('non-existent question ID'))).toBe(true);
  });

  it('rejects invalid difficulty values not in 1..3', () => {
    const kit = createValidKit();
    // @ts-expect-error test invalid difficulty
    kit.questions[0].difficulty = 5;
    const result = validateInterviewKit(kit);
    expect(result.success).toBe(false);
  });

  it('rejects invalid question category', () => {
    const kit = createValidKit();
    // @ts-expect-error test invalid category
    kit.questions[0].category = 'invalid-category';
    const result = validateInterviewKit(kit);
    expect(result.success).toBe(false);
  });

  it('rejects when a must-have requirement with generated questions is omitted from the schedule', () => {
    const kit = createValidKit();
    // q2 covers must-have r2. If we remove q2 from day 2, r2 is not in the schedule:
    kit.schedule.days[1].question_ids = [];
    const result = validateInterviewKit(kit);
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes("Must-have requirement 'r2'"))).toBe(true);
  });
});
