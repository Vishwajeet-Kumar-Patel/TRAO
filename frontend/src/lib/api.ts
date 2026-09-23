import {
  AuthResponse,
  InterviewKitData,
  KitGenerationProgress,
  KitGenerationStatus,
  Question,
  Flashcard,
  QuestionCategory,
  Schedule,
  PracticeSummary,
  FlashcardPracticeState,
  WeakSpotsReport,
} from '@prep-kit/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface KitRecordResponse {
  id: string;
  userId: string;
  status: KitGenerationStatus;
  input: {
    jd: string;
    companyUrl: string;
    days: number;
  };
  kit: InterviewKitData | null;
  progress: KitGenerationProgress;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('prep_kit_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('prep_kit_token', token);
      else localStorage.removeItem('prep_kit_token');
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('prep_kit_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error?.message || data.message || `API request failed with status ${res.status}`);
    }

    return data as T;
  }

  // Auth APIs
  async register(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request<{ user: { id: string; email: string; createdAt: string } }>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Kit APIs
  async createKit(jd: string, companyUrl: string, days: number): Promise<{ id: string; status: string; progress: KitGenerationProgress }> {
    return this.request<{ id: string; status: string; progress: KitGenerationProgress }>('/kits', {
      method: 'POST',
      body: JSON.stringify({ jd, companyUrl, days }),
    });
  }

  async getKits(): Promise<{ kits: KitRecordResponse[] }> {
    return this.request<{ kits: KitRecordResponse[] }>('/kits');
  }

  async getKitById(id: string): Promise<{ kit: KitRecordResponse }> {
    return this.request<{ kit: KitRecordResponse }>(`/kits/${id}`);
  }

  async updateKit(id: string, kitData: InterviewKitData): Promise<{ kit: KitRecordResponse }> {
    return this.request<{ kit: KitRecordResponse }>(`/kits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ kit: kitData }),
    });
  }

  async deleteKit(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/kits/${id}`, {
      method: 'DELETE',
    });
  }

  // Section-Level Regeneration APIs
  async regenerateCompanyBrief(kitId: string) {
    return this.request<{ company_brief: InterviewKitData['company_brief']; message: string }>(
      `/kits/${kitId}/regenerate/company`,
      { method: 'POST' }
    );
  }

  async regenerateQuestionsCategory(kitId: string, category: QuestionCategory) {
    return this.request<{ kit: InterviewKitData; preservedCount: number; newGeneratedCount: number; message: string }>(
      `/kits/${kitId}/regenerate/questions/${category}`,
      { method: 'POST' }
    );
  }

  async regenerateSchedule(kitId: string, daysAvailable?: number) {
    return this.request<{ schedule: Schedule; message: string }>(
      `/kits/${kitId}/regenerate/schedule`,
      { method: 'POST', body: JSON.stringify({ days_available: daysAvailable }) }
    );
  }

  // Granular Question APIs
  async addQuestion(kitId: string, question: Partial<Question>) {
    return this.request<{ question: Question; kit: InterviewKitData }>(`/kits/${kitId}/questions`, {
      method: 'POST',
      body: JSON.stringify(question),
    });
  }

  async updateQuestion(kitId: string, questionId: string, updates: Partial<Question>) {
    return this.request<{ question: Question; kit: InterviewKitData }>(
      `/kits/${kitId}/questions/${questionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  }

  async deleteQuestion(kitId: string, questionId: string) {
    return this.request<{ message: string; kit: InterviewKitData }>(
      `/kits/${kitId}/questions/${questionId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async reorderQuestions(kitId: string, orderedQuestionIds: string[]) {
    return this.request<{ questions: Question[] }>(`/kits/${kitId}/questions/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ orderedQuestionIds }),
    });
  }

  // Granular Flashcard APIs
  async addFlashcard(kitId: string, flashcard: Partial<Flashcard>) {
    return this.request<{ flashcard: Flashcard; kit: InterviewKitData }>(`/kits/${kitId}/flashcards`, {
      method: 'POST',
      body: JSON.stringify(flashcard),
    });
  }

  async updateFlashcard(kitId: string, flashcardId: string, updates: Partial<Flashcard>) {
    return this.request<{ flashcard: Flashcard; kit: InterviewKitData }>(
      `/kits/${kitId}/flashcards/${flashcardId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  }

  async deleteFlashcard(kitId: string, flashcardId: string) {
    return this.request<{ message: string; kit: InterviewKitData }>(
      `/kits/${kitId}/flashcards/${flashcardId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Practice & Weak Spots APIs
  async recordPractice(kitId: string, flashcardId: string, confidence: number) {
    return this.request<{ practiceState: FlashcardPracticeState }>(
      `/kits/${kitId}/practice/${flashcardId}`,
      {
        method: 'POST',
        body: JSON.stringify({ confidence }),
      }
    );
  }

  async getPracticeOverview(kitId: string) {
    return this.request<{
      summary: PracticeSummary;
      practiceStates: FlashcardPracticeState[];
      prioritizedFlashcards: Flashcard[];
    }>(`/kits/${kitId}/practice`);
  }

  async getWeakSpotsReport(kitId: string) {
    return this.request<{ report: WeakSpotsReport }>(`/kits/${kitId}/weak-spots`);
  }
}

export const api = new ApiClient();
