import {
  InterviewKitData,
  KitGenerationProgress,
  KitGenerationStatus,
  ConfidenceLevel,
} from '@prep-kit/shared';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewKitRecord {
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

export interface PracticeStateRecord {
  id: string;
  userId: string;
  kitId: string;
  flashcardId: string;
  confidence: ConfidenceLevel;
  attempts: number;
  lastReviewedAt: string;
  covered: boolean;
}

// In-Memory Global Datastore
class MemoryDatastore {
  public users: Map<string, UserRecord> = new Map();
  public kits: Map<string, InterviewKitRecord> = new Map();
  public practiceStates: Map<string, PracticeStateRecord> = new Map();

  // User Operations
  async createUser(email: string, passwordHash: string): Promise<UserRecord> {
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const user: UserRecord = {
      id,
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email === normalized) return user;
    }
    return null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) || null;
  }

  // Kit Operations
  async createKit(
    userId: string,
    input: { jd: string; companyUrl: string; days: number }
  ): Promise<InterviewKitRecord> {
    const id = `kit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const record: InterviewKitRecord = {
      id,
      userId,
      status: 'queued',
      input,
      kit: null,
      progress: {
        stage: 'validating',
        message: 'Generation initialized',
        percentage: 0,
      },
      createdAt: now,
      updatedAt: now,
    };
    this.kits.set(id, record);
    return record;
  }

  async findKitById(id: string): Promise<InterviewKitRecord | null> {
    return this.kits.get(id) || null;
  }

  async findKitsByUserId(userId: string): Promise<InterviewKitRecord[]> {
    const list: InterviewKitRecord[] = [];
    for (const kit of this.kits.values()) {
      if (kit.userId === userId) list.push(kit);
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async updateKit(id: string, updates: Partial<InterviewKitRecord>): Promise<InterviewKitRecord | null> {
    const existing = this.kits.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.kits.set(id, updated);
    return updated;
  }

  async deleteKit(id: string): Promise<boolean> {
    return this.kits.delete(id);
  }

  // Practice Operations
  async savePracticeAttempt(
    userId: string,
    kitId: string,
    flashcardId: string,
    confidence: ConfidenceLevel
  ): Promise<PracticeStateRecord> {
    const key = `${userId}:${kitId}:${flashcardId}`;
    const existing = this.practiceStates.get(key);
    const now = new Date().toISOString();

    const record: PracticeStateRecord = {
      id: existing?.id || `prac_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      kitId,
      flashcardId,
      confidence,
      attempts: (existing?.attempts || 0) + 1,
      lastReviewedAt: now,
      covered: true,
    };

    this.practiceStates.set(key, record);
    return record;
  }

  async getPracticeStatesForKit(userId: string, kitId: string): Promise<PracticeStateRecord[]> {
    const list: PracticeStateRecord[] = [];
    for (const state of this.practiceStates.values()) {
      if (state.userId === userId && state.kitId === kitId) {
        list.push(state);
      }
    }
    return list;
  }
}

export const datastore = new MemoryDatastore();
