/**
 * ReMEM — Model Abstraction
 * Unified LLM interface supporting Bankr, OpenAI, Anthropic, Ollama
 */

import type { LLMMessage, LLMResponse, ModelConfig } from './types.js';

export interface ModelClient {
  chat(messages: LLMMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse>;
  name(): string;
}

export class ModelAbstraction {
  private client: ModelClient;
  config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
    this.client = this.createClient(config);
  }

  private createClient(config: ModelConfig): ModelClient {
    switch (config.type) {
      case 'bankr':
        return new BankrClient(config);
      case 'openai':
        return new OpenAIClient(config);
      case 'anthropic':
        return new AnthropicClient(config);
      case 'ollama':
        return new OllamaClient(config);
      default:
        throw new Error(`Unknown model type`);
    }
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    return this.client.chat(messages, options);
  }

  name(): string {
    return this.client.name();
  }
}

// ============================================================================
// Bankr Client
// ============================================================================

interface BankrConfig {
  type: 'bankr';
  apiKey: string;
  baseUrl?: string;
}

class BankrClient implements ModelClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: BankrConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.bankr.ai';
  }

  name(): string {
    return `bankr`;
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'auto',
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Bankr API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? '';

    return { content, raw: data };
  }
}

// ============================================================================
// OpenAI Client
// ============================================================================

interface OpenAIConfig {
  type: 'openai';
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

class OpenAIClient implements ModelClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'gpt-4o';
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  }

  name(): string {
    return `openai:${this.model}`;
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? '';

    return { content, raw: data };
  }
}

// ============================================================================
// Anthropic Client
// ============================================================================

interface AnthropicConfig {
  type: 'anthropic';
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

class AnthropicClient implements ModelClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'claude-sonnet-4-6';
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com/v1';
  }

  name(): string {
    return `anthropic:${this.model}`;
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    // Anthropic uses a different message format
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        system: systemMessage?.content,
        messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
    const content = data.content?.find((c) => c.type === 'text')?.text ?? '';

    return { content, raw: data };
  }
}

// ============================================================================
// Ollama Client
// ============================================================================

interface OllamaConfig {
  type: 'ollama';
  baseUrl?: string;
  model?: string;
}

class OllamaClient implements ModelClient {
  private baseUrl: string;
  private model: string;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.model = config.model ?? 'llama3';
  }

  name(): string {
    return `ollama:${this.model}`;
  }

  async chat(
    messages: LLMMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 4096,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    const content = data.message?.content ?? '';

    return { content, raw: data };
  }
}
