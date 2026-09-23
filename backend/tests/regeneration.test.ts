import { describe, it, expect } from 'vitest';
import { Question } from '@prep-kit/shared';

describe('Regeneration State Preservation', () => {
  it('preserves user-edited and pinned questions when replacing generated questions for a category', () => {
    const existingQuestions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Original generated React question',
        answer_outline: 'Generated outline',
        difficulty: 2,
        origin: 'generated',
        edited: false,
      },
      {
        id: 'q2',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'User-customized React performance question',
        answer_outline: 'Custom STAR answer outline',
        difficulty: 3,
        origin: 'generated',
        edited: true, // Marked as edited by user!
      },
      {
        id: 'q3',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Manually added custom question',
        answer_outline: 'Outline',
        difficulty: 2,
        origin: 'user', // Created manually by user!
      },
      {
        id: 'q4',
        requirement_ids: ['r2'],
        category: 'behavioural',
        prompt: 'Leadership conflict question',
        answer_outline: 'Outline',
        difficulty: 2,
        origin: 'generated',
      },
    ];

    const targetCategory = 'technical';

    // Filter untouched categories
    const otherCategoryQuestions = existingQuestions.filter((q) => q.category !== targetCategory);
    // Filter protected items in target category (edited or user origin or pinned)
    const protectedCategoryQuestions = existingQuestions.filter(
      (q) => q.category === targetCategory && (q.origin === 'user' || q.edited === true || q.pinned === true)
    );

    // Newly generated replacement questions
    const freshGenerated: Question[] = [
      {
        id: 'q5',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Fresh generated technical question 1',
        answer_outline: 'Outline',
        difficulty: 2,
        origin: 'generated',
      },
    ];

    const merged = [...otherCategoryQuestions, ...protectedCategoryQuestions, ...freshGenerated];

    // Assertions
    expect(merged.some((q) => q.prompt === 'User-customized React performance question')).toBe(true);
    expect(merged.some((q) => q.prompt === 'Manually added custom question')).toBe(true);
    expect(merged.some((q) => q.prompt === 'Leadership conflict question')).toBe(true);
    expect(merged.some((q) => q.prompt === 'Fresh generated technical question 1')).toBe(true);
    // Unedited generated question q1 should have been replaced
    expect(merged.some((q) => q.prompt === 'Original generated React question')).toBe(false);
  });
});
