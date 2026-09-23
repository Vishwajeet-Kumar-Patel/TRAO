import { InterviewKitData } from './kit.js';

export interface BatchCaseInput {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

export interface BatchError {
  code: string;
  message: string;
  details?: unknown;
}

export interface BatchCaseOutputSuccess {
  id: string;
  status: 'ok';
  kit: InterviewKitData;
  error: null;
}

export interface BatchCaseOutputFailed {
  id: string;
  status: 'failed';
  kit: null;
  error: BatchError;
}

export type BatchCaseOutput = BatchCaseOutputSuccess | BatchCaseOutputFailed;

export interface BatchOutputDocument {
  version: '1.0';
  generated_at: string; // ISO 8601 string
  kits: BatchCaseOutput[];
}
