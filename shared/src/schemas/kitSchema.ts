import { z } from 'zod';

export const RequirementKindSchema = z.enum(['technical', 'behavioural', 'domain']);
export const RequirementPrioritySchema = z.enum(['must', 'nice']);

export const RequirementSchema = z.object({
  id: z.string().min(1, 'Requirement ID is required'),
  text: z.string().min(1, 'Requirement text is required'),
  kind: RequirementKindSchema,
  priority: RequirementPrioritySchema,
});

export const QuestionCategorySchema = z.enum([
  'technical',
  'behavioural',
  'system-design',
  'company-fit',
]);

export const QuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  requirement_ids: z.array(z.string()).min(1, 'Question must reference at least one requirement ID'),
  category: QuestionCategorySchema,
  prompt: z.string().min(1, 'Prompt is required'),
  answer_outline: z.string().min(1, 'Answer outline is required'),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  origin: z.enum(['generated', 'user']).optional(),
  edited: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export const FlashcardSchema = z.object({
  id: z.string().min(1, 'Flashcard ID is required'),
  front: z.string().min(1, 'Flashcard front is required'),
  back: z.string().min(1, 'Flashcard back is required'),
  requirement_ids: z.array(z.string()).default([]),
  origin: z.enum(['generated', 'user']).optional(),
  edited: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().min(1, 'Day must be a positive integer'),
  focus: z.string().min(1, 'Focus description is required'),
  question_ids: z.array(z.string()),
  minutes: z.number().int().min(1, 'Minutes must be a positive integer'),
});

export const ScheduleSchema = z.object({
  days_available: z.number().int().min(1).max(60, 'Days available must be between 1 and 60'),
  days: z.array(ScheduleDaySchema),
});

export const SourceInfoSchema = z.object({
  company: z.string().default(''),
  company_url: z.string().default(''),
  role: z.string().default(''),
  location: z.string().default(''),
  jd_chars: z.number().int().default(0),
  researched_at: z.string().default(''),
  pages_used: z.array(z.string()).default([]),
});

export const CompanyBriefSchema = z.object({
  summary: z.string().default(''),
  what_they_do: z.string().default(''),
  sources: z.array(z.string()).default([]),
  edited: z.boolean().optional(),
});

export const RoleBreakdownSchema = z.object({
  title: z.string().default(''),
  seniority: z.string().default(''),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(RequirementSchema).default([]),
});

export const CoverageInfoSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()).default([]),
  passes: z.number().int().min(1).default(1),
});

export const InterviewKitSchema = z
  .object({
    source: SourceInfoSchema,
    company_brief: CompanyBriefSchema,
    role: RoleBreakdownSchema,
    questions: z.array(QuestionSchema),
    flashcards: z.array(FlashcardSchema),
    schedule: ScheduleSchema,
    coverage: CoverageInfoSchema,
  })
  .superRefine((data, ctx) => {
    // 1. Validate days count matches days_available
    if (data.schedule.days.length !== data.schedule.days_available) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schedule', 'days'],
        message: `Schedule must contain exactly ${data.schedule.days_available} days, but has ${data.schedule.days.length}`,
      });
    }

    // 2. Validate requirement IDs exist and are unique
    const reqIds = new Set<string>();
    for (let i = 0; i < data.role.requirements.length; i++) {
      const req = data.role.requirements[i];
      if (reqIds.has(req.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['role', 'requirements', i, 'id'],
          message: `Duplicate requirement ID: ${req.id}`,
        });
      }
      reqIds.add(req.id);
    }

    // 3. Validate question IDs and question requirement references
    const questionIds = new Set<string>();
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      if (questionIds.has(q.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions', i, 'id'],
          message: `Duplicate question ID: ${q.id}`,
        });
      }
      questionIds.add(q.id);

      for (const reqId of q.requirement_ids) {
        if (!reqIds.has(reqId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['questions', i, 'requirement_ids'],
            message: `Question references non-existent requirement ID: ${reqId}`,
          });
        }
      }
    }

    // 4. Validate flashcard IDs and requirement references
    const flashcardIds = new Set<string>();
    for (let i = 0; i < data.flashcards.length; i++) {
      const f = data.flashcards[i];
      if (flashcardIds.has(f.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['flashcards', i, 'id'],
          message: `Duplicate flashcard ID: ${f.id}`,
        });
      }
      flashcardIds.add(f.id);

      for (const reqId of f.requirement_ids) {
        if (!reqIds.has(reqId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['flashcards', i, 'requirement_ids'],
            message: `Flashcard references non-existent requirement ID: ${reqId}`,
          });
        }
      }
    }

    // 5. Validate schedule references valid question IDs
    const scheduledQuestionIds = new Set<string>();
    for (let i = 0; i < data.schedule.days.length; i++) {
      const day = data.schedule.days[i];
      if (day.day !== i + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['schedule', 'days', i, 'day'],
          message: `Schedule day sequence mismatch: expected ${i + 1}, got ${day.day}`,
        });
      }
      for (const qId of day.question_ids) {
        if (!questionIds.has(qId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['schedule', 'days', i, 'question_ids'],
            message: `Schedule references non-existent question ID: ${qId}`,
          });
        }
        scheduledQuestionIds.add(qId);
      }
    }

    // 6. Validate must-have requirements in schedule (if questions exist for them)
    const scheduledReqIds = new Set<string>();
    for (const q of data.questions) {
      if (scheduledQuestionIds.has(q.id)) {
        for (const reqId of q.requirement_ids) {
          scheduledReqIds.add(reqId);
        }
      }
    }

    const mustReqs = data.role.requirements.filter((r) => r.priority === 'must');
    for (const mustReq of mustReqs) {
      const hasQuestionsForReq = data.questions.some((q) => q.requirement_ids.includes(mustReq.id));
      if (hasQuestionsForReq && !scheduledReqIds.has(mustReq.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['schedule'],
          message: `Must-have requirement '${mustReq.id}' (${mustReq.text}) is not represented in the schedule`,
        });
      }
    }
  });

export function validateInterviewKit(data: unknown): {
  success: boolean;
  errors?: string[];
} {
  const result = InterviewKitSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    };
  }
  return { success: true };
}
