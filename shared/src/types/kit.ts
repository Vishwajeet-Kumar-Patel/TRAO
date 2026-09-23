export type RequirementKind = 'technical' | 'behavioural' | 'domain';
export type RequirementPriority = 'must' | 'nice';

export interface Requirement {
  id: string; // e.g. "r1", "r2"
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export type QuestionCategory = 'technical' | 'behavioural' | 'system-design' | 'company-fit';

export interface Question {
  id: string; // e.g. "q1", "q2"
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  // Internal state tracking
  origin?: 'generated' | 'user';
  edited?: boolean;
  pinned?: boolean;
}

export interface Flashcard {
  id: string; // e.g. "f1", "f2"
  front: string;
  back: string;
  requirement_ids: string[];
  // Internal state tracking
  origin?: 'generated' | 'user';
  edited?: boolean;
  pinned?: boolean;
}

export interface ScheduleDay {
  day: number; // 1-indexed
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface SourceInfo {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string; // ISO 8601 string
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
  // Internal state tracking
  edited?: boolean;
}

export interface RoleBreakdown {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

export interface CoverageInfo {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface InterviewKitData {
  source: SourceInfo;
  company_brief: CompanyBrief;
  role: RoleBreakdown;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: CoverageInfo;
}

export type KitGenerationStatus = 'queued' | 'running' | 'completed' | 'failed';

export type PipelineStage =
  | 'validating'
  | 'extracting'
  | 'researching'
  | 'generating_brief'
  | 'generating_questions'
  | 'generating_flashcards'
  | 'checking_coverage'
  | 'closing_gaps'
  | 'scheduling'
  | 'validating_kit'
  | 'completed'
  | 'failed';

export interface KitGenerationProgress {
  stage: PipelineStage;
  message: string;
  percentage: number;
  currentPass?: number;
  details?: Record<string, unknown>;
}
