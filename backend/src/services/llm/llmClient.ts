import { config } from '../../config/env.js';

export interface LLMRequestOptions {
  systemPrompt?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export class LLMClient {
  private apiKey: string;
  private model: string;
  private provider: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.llm.apiKey;
    this.model = config.llm.model;
    this.provider = config.llm.provider;
    this.baseUrl = config.llm.baseUrl;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateStructuredJson<T>(
    options: LLMRequestOptions,
    validator?: (data: unknown) => { success: boolean; data?: T; error?: string }
  ): Promise<T | null> {
    if (!this.isConfigured) {
      return null;
    }

    let lastError: Error | null = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const rawResponse = await this.callLLM(options);
        const parsed = this.extractJson(rawResponse);
        if (!parsed) {
          throw new Error('LLM response did not contain valid JSON');
        }

        if (validator) {
          const validationResult = validator(parsed);
          if (!validationResult.success) {
            throw new Error(`Schema validation failed: ${validationResult.error}`);
          }
          return validationResult.data as T;
        }

        return parsed as T;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    console.warn(`[LLMClient] Failed after retries: ${lastError?.message}. Proceeding to fallback logic.`);
    return null;
  }

  private async callLLM(options: LLMRequestOptions): Promise<string> {
    const { prompt, systemPrompt, temperature = 0.2 } = options;

    if (this.provider === 'gemini' || !this.provider) {
      return this.callGemini(prompt, systemPrompt, temperature);
    } else {
      return this.callOpenAICompatible(prompt, systemPrompt, temperature);
    }
  }

  private async callGemini(prompt: string, systemPrompt?: string, temperature = 0.2): Promise<string> {
    const effectiveModel = this.model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent?key=${this.apiKey}`;

    const contents = [];
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `System Instructions:\n${systemPrompt}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will strictly follow these instructions and return only valid JSON.' }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: `${prompt}\n\nIMPORTANT: Respond with ONLY a valid JSON object. Do not include markdown code fences or conversational text.` }],
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini API returned empty candidate text');
    }

    return text;
  }

  private async callOpenAICompatible(prompt: string, systemPrompt?: string, temperature = 0.2): Promise<string> {
    const endpoint = this.baseUrl ? `${this.baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
    const effectiveModel = this.model || 'gpt-4o-mini';

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({
      role: 'user',
      content: `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON.`,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages,
        temperature,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = result.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('LLM API returned empty choice');
    }

    return text;
  }

  private extractJson(raw: string): unknown {
    if (!raw) return null;

    let text = raw.trim();

    // Strip markdown code fences if present
    if (text.startsWith('```')) {
      const lines = text.split('\n');
      if (lines[0].startsWith('```')) {
        lines.shift();
      }
      if (lines[lines.length - 1].startsWith('```')) {
        lines.pop();
      }
      text = lines.join('\n').trim();
    }

    try {
      return JSON.parse(text);
    } catch {
      // Find outermost JSON object { ... } or array [ ... ]
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(text.slice(firstBrace, lastBrace + 1));
        } catch {
          // continue
        }
      }

      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        try {
          return JSON.parse(text.slice(firstBracket, lastBracket + 1));
        } catch {
          // continue
        }
      }

      return null;
    }
  }
}

export const llmClient = new LLMClient();
