export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

export interface PracticeAttempt {
  id?: string;
  userId: string;
  kitId: string;
  flashcardId: string;
  confidence: ConfidenceLevel;
  timestamp: string;
}

export interface FlashcardPracticeState {
  flashcardId: string;
  confidence: ConfidenceLevel;
  attempts: number;
  lastReviewedAt: string;
  covered: boolean;
}

export interface PracticeSummary {
  kitId: string;
  totalCards: number;
  coveredCards: number;
  averageConfidence: number;
  weakCardCount: number; // confidence <= 2
  strongCardCount: number; // confidence >= 4
}

export interface WeakSpotItem {
  requirementId: string;
  requirementText: string;
  kind: string;
  priority: string;
  averageConfidence: number;
  associatedQuestionCount: number;
  associatedFlashcardCount: number;
  sampleQuestions: string[];
  recommendation: string;
}

export interface WeakSpotsReport {
  kitId: string;
  generatedAt: string;
  overallScore: number;
  weakSpots: WeakSpotItem[];
  suggestedFocusDays: number[];
}
