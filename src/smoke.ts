import type { ReMEM } from './index.js';
import type { ReMEMConfig } from './types.js';

export type SmokeCheckStatus = 'pass' | 'fail' | 'warn' | 'skip';

export type SmokeCheckResult = {
  name: string;
  status: SmokeCheckStatus;
  detail: string;
};

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }
  return response.json();
}

async function runEmbeddingProbe(memory: ReMEM, config: ReMEMConfig): Promise<SmokeCheckResult[]> {
  const results: SmokeCheckResult[] = [];

  if (!config.embeddings?.enabled) {
    results.push({
      name: 'embeddings',
      status: 'skip',
      detail: 'Embeddings are not enabled.',
    });
    return results;
  }

  results.push({
    name: 'embeddings-runtime',
    status: memory.isEmbeddingEnabled() ? 'pass' : 'fail',
    detail: memory.isEmbeddingEnabled()
      ? 'Embedding runtime is enabled.'
      : 'Embeddings were configured but runtime is not active.',
  });

  const service = memory.getEmbeddingService();
  if (!service) {
    results.push({
      name: 'embeddings-service',
      status: 'fail',
      detail: 'Embedding service instance is unavailable.',
    });
    return results;
  }

  try {
    const baseUrl = service.baseUrl.replace(/\/$/, '');
    await fetchJson(`${baseUrl}/api/tags`);
    results.push({
      name: 'embeddings-endpoint',
      status: 'pass',
      detail: `Reached Ollama endpoint at ${baseUrl}.`,
    });
  } catch (error) {
    results.push({
      name: 'embeddings-endpoint',
      status: 'fail',
      detail: `Embedding endpoint probe failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return results;
}

async function runLlmProbe(config: ReMEMConfig): Promise<SmokeCheckResult[]> {
  const llm = config.llm;
  if (!llm) {
    return [{
      name: 'llm',
      status: 'skip',
      detail: 'No LLM configured.',
    }];
  }

  if (llm.type === 'ollama') {
    try {
      const baseUrl = llm.baseUrl.replace(/\/$/, '');
      await fetchJson(`${baseUrl}/api/tags`);
      return [{
        name: 'llm-endpoint',
        status: 'pass',
        detail: `Reached Ollama chat endpoint at ${baseUrl}.`,
      }];
    } catch (error) {
      return [{
        name: 'llm-endpoint',
        status: 'fail',
        detail: `LLM endpoint probe failed: ${error instanceof Error ? error.message : String(error)}`,
      }];
    }
  }

  const authHeader: Record<string, string> = llm.type === 'anthropic'
    ? { 'x-api-key': llm.apiKey, 'anthropic-version': '2023-06-01' }
    : { Authorization: `Bearer ${llm.apiKey}` };

  const modelsUrl = llm.type === 'openai'
    ? `${(llm.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')}/models`
    : llm.type === 'anthropic'
      ? `${(llm.baseUrl ?? 'https://api.anthropic.com/v1').replace(/\/$/, '')}/models`
      : `${(llm.baseUrl ?? 'https://api.bankr.ai').replace(/\/$/, '')}/v1/models`;

  try {
    await fetchJson(modelsUrl, { headers: authHeader });
    return [{
      name: 'llm-endpoint',
      status: 'pass',
      detail: `Reached ${llm.type} model endpoint.`,
    }];
  } catch (error) {
    return [{
      name: 'llm-endpoint',
      status: 'warn',
      detail: `Configured ${llm.type}, but endpoint probe failed: ${error instanceof Error ? error.message : String(error)}`,
    }];
  }
}

export async function runSmokeChecks(memory: ReMEM, config: ReMEMConfig): Promise<SmokeCheckResult[]> {
  const checks: SmokeCheckResult[] = [];

  checks.push({
    name: 'memory-init',
    status: 'pass',
    detail: 'Memory store initialized.',
  });

  checks.push({
    name: 'layers',
    status: memory.isLayersEnabled() ? 'pass' : 'warn',
    detail: memory.isLayersEnabled()
      ? 'Layer manager enabled.'
      : 'Layers are not enabled.',
  });

  try {
    const snapshot = await memory.createSnapshot(`smoke-check-${Date.now()}`);
    const snapshots = await memory.listSnapshots();
    const exists = snapshots.some((item) => item.id === snapshot.id);
    await memory.deleteSnapshot(snapshot.id);

    checks.push({
      name: 'snapshot-roundtrip',
      status: exists ? 'pass' : 'fail',
      detail: exists
        ? 'Snapshot create/list/delete roundtrip succeeded.'
        : 'Snapshot was created but not visible in list output.',
    });
  } catch (error) {
    checks.push({
      name: 'snapshot-roundtrip',
      status: 'fail',
      detail: `Snapshot roundtrip failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  checks.push(...await runEmbeddingProbe(memory, config));
  checks.push(...await runLlmProbe(config));

  return checks;
}
