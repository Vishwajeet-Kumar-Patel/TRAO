import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend or root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET || 'ai-interview-prep-kit-jwt-secret-key-2026',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/interview_prep_kit',
  allowLocalhostSsrf:
    process.env.ALLOW_LOCALHOST_SSRF === 'true' ||
    process.env.NODE_ENV !== 'production' ||
    process.env.IS_EVALUATION === 'true',
  llm: {
    apiKey: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '',
    model: process.env.LLM_MODEL || 'gemini-1.5-flash',
    provider: process.env.LLM_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini'),
    baseUrl: process.env.LLM_BASE_URL || '',
  },
  crawler: {
    maxPages: parseInt(process.env.CRAWLER_MAX_PAGES || '4', 10),
    timeoutMs: parseInt(process.env.CRAWLER_TIMEOUT_MS || '6000', 10),
    maxResponseBytes: 1024 * 1024 * 2, // 2MB limit
    maxRetries: 3,
  },
};
