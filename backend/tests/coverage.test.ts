import { describe, it, expect } from 'vitest';
import { checkCoverage, closeCoverageGaps } from '../src/services/coverage/coverageEngine.js';
import { Question, Requirement, RoleBreakdown } from '@prep-kit/shared';
import { InterviewResearchResult } from '../src/services/research/interviewResearch.js';

const mockRequirements: Requirement[] = [
  { id: 'r1', text: 'React & Redux', kind: 'technical', priority: 'must' },
  { id: 'r2', text: 'Node.js & Express', kind: 'technical', priority: 'must' },
  { id: 'r3', text: 'Mentorship', kind: 'behavioural', priority: 'nice' },
];

describe('Coverage Engine', () => {
  it('identifies 100% coverage when all must-have requirements are represented', () => {
    const questions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'React question',
        answer_outline: 'Outline',
        difficulty: 2,
      },
      {
        id: 'q2',
        requirement_ids: ['r2'],
        category: 'technical',
        prompt: 'Node question',
        answer_outline: 'Outline',
        difficulty: 2,
      },
    ];

    const result = checkCoverage(mockRequirements, questions);
    expect(result.isFullyCovered).toBe(true);
    expect(result.uncoveredMustRequirementIds).toEqual([]);
    expect(result.coveredRequirementIds).toContain('r1');
    expect(result.coveredRequirementIds).toContain('r2');
  });

  it('correctly reports uncovered must-have requirement IDs', () => {
    const questions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'React question',
        answer_outline: 'Outline',
        difficulty: 2,
      },
    ];

    const result = checkCoverage(mockRequirements, questions);
    expect(result.isFullyCovered).toBe(false);
    expect(result.uncoveredMustRequirementIds).toEqual(['r2']);
  });

  it('closes coverage gaps through second-pass generation and tracks pass count', async () => {
    const role: RoleBreakdown = {
      title: 'Full Stack Engineer',
      seniority: 'Senior',
      responsibilities: [],
      requirements: mockRequirements,
    };

    const initialQuestions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'React deep dive',
        answer_outline: 'Outline',
        difficulty: 2,
      },
    ];

    const research: InterviewResearchResult = {
      found: true,
      summary: 'Tech stack includes Node and React',
      stages: ['Technical Screen'],
      sources: [],
      culturalValues: [],
      techStackHighlights: ['React', 'Node'],
    };

    const { questions, coverage } = await closeCoverageGaps(role, initialQuestions, research, 3);

    expect(coverage.passes).toBeGreaterThanOrEqual(2);
    expect(coverage.uncovered_requirement_ids.length).toBe(0);

    const finalCheck = checkCoverage(role.requirements, questions);
    expect(finalCheck.isFullyCovered).toBe(true);
  });
});
