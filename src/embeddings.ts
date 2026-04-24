/**
 * ReMEM — Embedding Service
 * Generates and stores vector embeddings for semantic memory search.
 *
 * Uses Ollama's /api/embeddings endpoint (or any compatible OpenAI-style embeddings API).
 * Stores embeddings in SQLite as base64-encoded float32 arrays.
 *
 * v0.3.2: Added for semantic search — cosine similarity replaces keyword-only matching.
 */

import { randomUUID } from 'crypto';

// Ollama embeddings endpoint
const OLLAMA_EMBED_URL = '/api/embeddings';

export interface EmbeddingConfig {
  /** Ollama base URL (e.g. http://192.168.68.73:11434) */
  baseUrl: string;
  /** Model to use for embeddings (e.g. 'nomic-embed-text', 'mxbai-embed-large') */
  model: string;
  /** Dimension of the embedding vectors (auto-detected on first run, or set explicitly) */
  dimension?: number;
}

export interface EmbeddingVector {
  id: string;
  memoryId: string;       // links to memory.id or layered_memory id
  vector: number[];      // raw float32 vector
  base64: string;        // base64-encoded for storage
  model: string;
  createdAt: number;
}

export class EmbeddingService {
  private config: EmbeddingConfig;
  private detectedDimension: number | null = null;
  private httpFetch: typeof fetch;

  constructor(config: EmbeddingConfig, httpFetch: typeof fetch = fetch) {
    this.config = { dimension: 768, ...config };
    this.detectedDimension = config.dimension ?? null;
    this.httpFetch = httpFetch;
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  get model(): string {
    return this.config.model;
  }

  get isConfigured(): boolean {
    return Boolean(this.config.baseUrl && this.config.model);
  }

  /**
   * Generate embedding for a single text.
   * Uses Ollama's /api/embeddings endpoint.
   */
  async embed(text: string): Promise<number[]> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${OLLAMA_EMBED_URL}`;

    const response = await this.httpFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      throw new Error(`Embedding failed (${response.status}): ${err}`);
    }

    const data = await response.json() as { embedding?: number[]; embedding_error?: string };

    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error(`Invalid embedding response: ${JSON.stringify(data)}`);
    }

    // Auto-detect dimension on first call
    if (this.detectedDimension === null) {
      this.detectedDimension = data.embedding.length;
    }

    return data.embedding;
  }

  /**
   * Generate embeddings for multiple texts in batch.
   * Calls embed() sequentially — Ollama doesn't have a batch endpoint.
   */
  async embedBatch(texts: string[], signal?: AbortSignal): Promise<number[][]> {
    const vectors: number[][] = [];
    for (const text of texts) {
      if (signal?.aborted) break;
      vectors.push(await this.embed(text));
    }
    return vectors;
  }

  /**
   * Encode a float32 vector to base64url.
   * Uses Buffer.from with a Uint8Array view of the Float32Array buffer.
   */
  static encodeVector(vec: number[]): string {
    // Float32Array → Uint8Array → Buffer → base64url
    const floatArr = new Float32Array(vec);
    const byteArr = new Uint8Array(floatArr.buffer);
    return Buffer.from(byteArr).toString('base64url');
  }

  /**
   * Decode a base64url string back to a float32 vector.
   */
  static decodeVector(base64: string, dimension: number): number[] {
    const byteArr = Buffer.from(base64, 'base64url');
    const floatArr = new Float32Array(byteArr.buffer, byteArr.byteOffset, dimension);
    return Array.from(floatArr);
  }

  /**
   * Compute cosine similarity between two vectors.
   * Returns a value between -1 (opposite) and 1 (identical).
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error('Vector dimension mismatch');
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Generate and package an embedding vector for storage.
   */
  async generateEmbedding(memoryId: string, text: string): Promise<EmbeddingVector> {
    const vector = await this.embed(text);
    return {
      id: randomUUID(),
      memoryId,
      vector,
      base64: EmbeddingService.encodeVector(vector),
      model: this.config.model,
      createdAt: Date.now(),
    };
  }
}
