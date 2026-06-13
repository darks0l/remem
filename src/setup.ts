import type { ReMEM } from './index.js';
import type { ReMEMConfig } from './types.js';

export type RuntimeFocus = 'OpenClaw' | 'Hermes' | 'Generic';

export type SetupContext = {
  memory: ReMEM;
  storageLabel: string;
  dbLabel: string;
  scopeLabel: string;
  config: ReMEMConfig;
  snapshots: Awaited<ReturnType<ReMEM['listSnapshots']>>;
  runtimeFocus: RuntimeFocus;
};

function formatMaybeJson(value: unknown) {
  return JSON.stringify(value, null, 2).split('\n');
}

export function storageSummary(context: SetupContext) {
  return [
    `storage: ${context.storageLabel}`,
    `db: ${context.dbLabel}`,
    `scope: ${context.scopeLabel}`,
    `native vector search: ${context.memory.usesNativeVectorSearch() ? 'yes' : 'no'}`,
    `snapshots: ${context.snapshots.length}`,
  ];
}

export function embeddingSummary(config: ReMEMConfig, memory: ReMEM) {
  const enabled = Boolean(config.embeddings?.enabled);
  return [
    `enabled: ${enabled ? 'yes' : 'no'}`,
    'provider: Ollama-compatible',
    `base URL: ${config.embeddings?.baseUrl ?? 'http://localhost:11434'}`,
    `model: ${config.embeddings?.model ?? 'nomic-embed-text'}`,
    `runtime active: ${memory.isEmbeddingEnabled() ? 'yes' : 'no'}`,
  ];
}

export function llmSummary(config: ReMEMConfig) {
  const llm = config.llm;
  const configuredModel = llm?.type === 'bankr'
    ? 'provider default'
    : llm?.model ?? 'none';

  return [
    `configured: ${llm ? 'yes' : 'no'}`,
    `provider: ${llm?.type ?? 'none'}`,
    `model: ${configuredModel}`,
    `base URL: ${'baseUrl' in (llm ?? {}) ? ((llm as { baseUrl?: string }).baseUrl ?? 'default') : 'default'}`,
  ];
}

export function openClawChecklist() {
  return [
    'Use when you want memory behind session turns, decisions, and reusable procedures.',
    '',
    'Recommended onboarding:',
    '1. Create a local SQLite or Postgres-backed ReMEM instance.',
    '2. Enable embeddings if conversational recall quality matters.',
    '3. Wrap the instance with createOpenClawAdapter(memory).',
    '4. Write turns + decisions into memory from your runtime hooks.',
    '5. Pull concise context blocks with recallContext() or recallProjectContext().',
    '',
    'Best fit:',
    '- persistent session memory',
    '- release rules / decisions / user preferences',
    '- shared project memory without bloating prompt context',
  ];
}

export function hermesChecklist() {
  return [
    'Use when you want harness-oriented memory around threads, runs, artifacts, and shared lanes.',
    '',
    'Recommended onboarding:',
    '1. Stand up the base ReMEM store.',
    '2. Wrap it with createHermesAdapter(memory).',
    '3. Persist turns, artifacts, decisions, and shared namespace notes.',
    '4. Use recallShared() for reusable team/project lanes.',
    '',
    'Best fit:',
    '- thread/run scoped recall',
    '- artifacts and rollout lanes',
    '- shared namespace memory across harness workflows',
  ];
}

export function setupPlan(runtimeFocus: RuntimeFocus) {
  const runtimeStep = runtimeFocus === 'OpenClaw'
    ? 'Wire createOpenClawAdapter(memory) into turn + decision hooks.'
    : runtimeFocus === 'Hermes'
      ? 'Wire createHermesAdapter(memory) into thread/run/artifact hooks.'
      : 'Choose the adapter surface your runtime actually needs.';

  return [
    '1. Pick storage lane (sqlite first, postgres when shared infra is real)',
    '2. Turn on embeddings if semantic recall matters',
    '3. Add an LLM only if you need recursive/synthesis workflows',
    `4. ${runtimeStep}`,
    '5. Generate starter config + smoke test init/status before shipping',
  ];
}

export function smokeCheckSummary() {
  return [
    'Running real smoke checks against the configured runtime...',
    'Includes snapshot roundtrip plus optional embedding / model endpoint probes.',
  ];
}

export function generateExampleConfig(context: Pick<SetupContext, 'config'>) {
  const config = context.config;
  const example = {
    storage: config.storage ?? 'sqlite',
    dbPath: config.dbPath ?? './remem.db',
    storageConfig: config.storageConfig ?? {},
    ...(config.postgres ? { postgres: config.postgres } : {}),
    ...(config.embeddings ? { embeddings: config.embeddings } : {}),
    ...(config.llm
      ? { llm: { ...config.llm, ...(config.llm.type !== 'ollama' ? { apiKey: 'ENV_OR_SECRET_HERE' } : {}) } }
      : {}),
  };
  return formatMaybeJson(example);
}

export function generateAdapterSnippet(runtimeFocus: RuntimeFocus) {
  if (runtimeFocus === 'OpenClaw') {
    return [
      "import { ReMEM, createOpenClawAdapter } from '@darksol/remem';",
      '',
      "const memory = new ReMEM({ dbPath: './remem.db' });",
      'await memory.init();',
      'await memory.enableLayers();',
      '',
      'const openclaw = createOpenClawAdapter(memory);',
      'await openclaw.rememberTurn({',
      "  role: 'user',",
      "  content: 'Ship after tests pass',",
      "  sessionId: 'general',",
      '});',
      '',
      "const context = await openclaw.recallContext('release rules');",
    ];
  }

  if (runtimeFocus === 'Hermes') {
    return [
      "import { ReMEM, createHermesAdapter } from '@darksol/remem';",
      '',
      "const memory = new ReMEM({ dbPath: './remem.db' });",
      'await memory.init();',
      'await memory.enableLayers();',
      '',
      'const hermes = createHermesAdapter(memory);',
      'await hermes.rememberTurn({',
      "  role: 'user',",
      "  content: 'Ship Hermes support after tests pass',",
      "  threadId: 'general',",
      "  runId: 'run-42',",
      '});',
      '',
      "const shared = await hermes.recallShared(['team', 'hermes'], 'rollout lane');",
    ];
  }

  return [
    "import { ReMEM } from '@darksol/remem';",
    '',
    "const memory = new ReMEM({ dbPath: './remem.db' });",
    'await memory.init();',
    'await memory.enableLayers();',
    '',
    '// Pick the adapter your runtime actually needs:',
    '// createOpenClawAdapter(memory)',
    '// createHermesAdapter(memory)',
    '// createLangGraphStoreAdapter(memory)',
    '// createVercelAIAdapter(memory)',
  ];
}

export function executionModelNotes() {
  return [
    'What belongs in the UI:',
    '- config review',
    '- onboarding guidance',
    '- adapter choice',
    '- starter snippets',
    '- smoke checks',
    '',
    'What should stay out of the UI:',
    '- routine agent memory writes',
    '- full manual recall browsing as a primary workflow',
    '- procedural / layered ops that agents can already script directly',
  ];
}

export function generateInitArtifacts(context: Pick<SetupContext, 'config' | 'runtimeFocus'>) {
  const configJson = `${generateExampleConfig({ config: context.config }).join('\n')}\n`;
  const snippetTs = `${generateAdapterSnippet(context.runtimeFocus).join('\n')}\n`;
  const envExampleLines = [
    '# ReMEM starter environment',
    context.config.storage === 'postgres' ? 'REMEM_POSTGRES_URL=postgres://user:pass@localhost:5432/remem' : '# REMEM_POSTGRES_URL=',
    context.config.embeddings?.enabled ? `REMEM_EMBEDDINGS_URL=${context.config.embeddings.baseUrl}` : '# REMEM_EMBEDDINGS_URL=http://localhost:11434',
    context.config.embeddings?.enabled ? `REMEM_EMBEDDINGS_MODEL=${context.config.embeddings.model}` : '# REMEM_EMBEDDINGS_MODEL=nomic-embed-text',
    context.config.llm?.type && context.config.llm.type !== 'ollama' ? `REMEM_${context.config.llm.type.toUpperCase()}_API_KEY=your-key-here` : '# REMEM_LLM_API_KEY=',
  ];

  return {
    configJson,
    snippetTs,
    envExample: `${envExampleLines.join('\n')}\n`,
  };
}
