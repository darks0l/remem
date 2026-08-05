#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { ReMEM, type StorageMaintenanceOptions } from './index.js';
import { runSmokeChecks } from './smoke.js';
import { generateInitArtifacts, type RuntimeFocus } from './setup.js';
import { launchTerminalUi } from './ui.js';
import { knowledgeArtifactRegistrationSchema, knowledgeGraphArtifactSchema, rememConfigSchema, type ContextPackOptions, type MemoryHealthOptions, type MemoryLayer, type QueryOptions, type ReMEMConfig, type SmartRecallOptions, type RememberKind } from './types.js';

const gunzipAsync = promisify(gunzip);

type ParsedArgs = {
  command: string;
  rest: string[];
  options: Record<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const command = args[0] || 'help';
  const rest: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) {
      rest.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    i += 1;
  }

  return { command, rest, options };
}

function asString(value: string | boolean | undefined, fallback = '') {
  if (typeof value === 'string') return value;
  return fallback;
}

function asNumber(value: string | boolean | undefined, fallback: number) {
  const parsed = Number(asString(value, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asCsv(value: string | boolean | undefined) {
  if (typeof value !== 'string') return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function asNamespace(value: string | boolean | undefined) {
  if (typeof value !== 'string') return [] as string[];
  return value.replace(/\//g, ',').split(',').map((item) => item.trim()).filter(Boolean);
}

function parseMaybeJson(value: string | boolean | undefined) {
  if (typeof value !== 'string' || !value.trim()) return {};
  return JSON.parse(value) as Record<string, unknown>;
}

function buildConfig(options: Record<string, string | boolean>): { config: ReMEMConfig; storageLabel: string; dbLabel: string; scopeLabel: string } {
  const storage = asString(options.storage, 'sqlite') as 'sqlite' | 'memory' | 'postgres';
  const dbPath = asString(options.db, storage === 'memory' ? ':memory:' : './remem.db');
  const agentId = asString(options['agent-id']) || undefined;
  const userId = asString(options['user-id']) || undefined;
  const config: ReMEMConfig = {
    storage,
    dbPath,
    storageConfig: {
      agentId,
      userId,
    },
  };

  const postgresUrl = asString(options['postgres-url']);
  if (storage === 'postgres' && postgresUrl) {
    config.postgres = { connectionString: postgresUrl };
  }

  if (options.embeddings) {
    config.embeddings = {
      enabled: true,
      baseUrl: asString(options['embeddings-url'], 'http://localhost:11434'),
      model: asString(options['embeddings-model'], 'nomic-embed-text'),
      asyncEmbed: true,
    };
  }

  const llmType = asString(options['llm-type']);
  if (llmType) {
    const apiKey = asString(options['llm-api-key']);
    const model = asString(options['llm-model']);
    const baseUrl = asString(options['llm-base-url']);
    if (llmType === 'ollama') {
      config.llm = {
        type: 'ollama',
        baseUrl: baseUrl || 'http://localhost:11434',
        model: model || 'llama3',
      };
    } else if (llmType === 'openai' && apiKey) {
      config.llm = { type: 'openai', apiKey, model: model || 'gpt-4o', ...(baseUrl ? { baseUrl } : {}) };
    } else if (llmType === 'anthropic' && apiKey) {
      config.llm = { type: 'anthropic', apiKey, model: model || 'claude-sonnet-4-6', ...(baseUrl ? { baseUrl } : {}) };
    } else if (llmType === 'bankr' && apiKey) {
      config.llm = { type: 'bankr', apiKey, ...(baseUrl ? { baseUrl } : {}) };
    }
  }

  return {
    config,
    storageLabel: storage,
    dbLabel: storage === 'postgres' ? (postgresUrl || 'postgres') : dbPath,
    scopeLabel: [agentId ? `agent:${agentId}` : null, userId ? `user:${userId}` : null].filter(Boolean).join(' | ') || 'global',
  };
}

function helpText() {
  return `ReMEM CLI

Usage:
  remem ui [--db <path>] [--storage sqlite|memory|postgres] [--agent-id <id>] [--user-id <id>]
  remem init [same flags as ui] [--runtime openclaw|hermes|generic] [--out-dir <path>] [--json]
  remem status [--db <path>]
  remem stats [--db <path>] [--json]
  remem graph [--query <text>] [--limit 100] [--dot] [--json]
  remem health [--db <path>] [--json]
  remem storage-maintenance [--dry-run] [--compact] [--json]
  remem knowledge-artifact --path <file> [--source codebase-memory-mcp] [--project <name>] [--resource-uri <uri>] [--required-scopes a,b] [--format sqlite] [--compression zstd] [--json]
  remem knowledge-ingest --artifact <graph.json|graph.json.gz> [--source <name>] [--project <name>] [--namespace team/code] [--visibility shared|private] [--json]
  remem knowledge-overview [--project <name>] [--limit 10] [--json]
  remem knowledge-subgraph --query <text> [--project <name>] [--limit 8] [--neighbor-limit 8] [--connections calls,imports] [--max-context-chars 6000] [--json]
  remem store --content <text> [--topics a,b] [--metadata '{"kind":"note"}']
  remem remember --content <text> [--kind fact|preference|decision|procedure|recent-event|artifact-note] [--topics a,b] [--source <name>] [--dry-run]
  remem query --query <text> [--limit 8]
  remem recent [--limit 10]
  remem topic --topic <name> [--limit 10]
  remem layer-store --layer semantic --content <text> [--topics a,b]
  remem procedural-store --content <text> --trigger <phrase> [--topics a,b]
  remem procedural-match --context <text>
  remem shared-store --namespace team/ops --content <text> [--visibility shared|private]
  remem namespace-query --namespace team/ops --query <text> [--visibility all|shared|private]
  remem namespace-recent --namespace team/ops [--limit 10] [--visibility all|shared|private]
  remem smart-recall --query <text> [--profile fast|deep|agent-safe|ops-debug] [--limit 8]
  remem context-pack --query <text> [--profile agent-safe|deep] [--max-chars 6000] [--dream]
  remem dream [--query <text>] [--layers identity,semantic,procedural] [--limit 12]
  remem snapshots --action list|create|restore|delete [--label <name>] [--snapshot-id <id>]
  remem consolidate [--summaries] [--procedural]
  remem smoke-check [--db <path>] [--json]
  remem doctor [--config <path>] [--json]
  remem validate-config --config <path> [--json]

Human-facing setup:
  remem ui / remem init      Setup console for runtime focus selection, storage,
                             embeddings, model config, adapter onboarding,
                             starter snippets/config, and smoke checks.

Agent-facing ops:
  Use the direct CLI commands above for memory writes, recall, snapshots, and consolidation.

Common config flags:
  --db <path>                SQLite path (default ./remem.db)
  --storage <mode>           sqlite | memory | postgres
  --postgres-url <url>       Postgres connection string
  --agent-id <id>            Agent scope
  --user-id <id>             User scope
  --embeddings               Enable embedding search
  --embeddings-url <url>     Ollama embeddings URL
  --embeddings-model <name>  Embedding model (default nomic-embed-text)
  --llm-type <provider>      bankr | openai | anthropic | ollama
  --llm-api-key <key>        API key for bankr/openai/anthropic
  --llm-model <name>         Model override
  --llm-base-url <url>       Custom provider base URL
  --runtime <name>           openclaw | hermes | generic (for init artifacts)
  --out-dir <path>           Output directory for generated init artifacts
  --json                     Emit machine-readable JSON output
`;
}

type CliRuntime = {
  writeStdout?: (chunk: string) => void;
  writeStderr?: (chunk: string) => void;
  launchUi?: typeof launchTerminalUi;
};

function isJsonMode(options: Record<string, string | boolean>) {
  return Boolean(options.json);
}

function emitError(runtime: CliRuntime, jsonMode: boolean, message: string) {
  if (jsonMode) {
    writeStderr(runtime, `${JSON.stringify({ ok: false, error: message })}\n`);
  } else {
    writeStderr(runtime, `Error: ${message}\n`);
  }
}

function requireOption(value: string | boolean | undefined, name: string, jsonMode: boolean, runtime: CliRuntime): string | null {
  const str = asString(value);
  if (!str) {
    emitError(runtime, jsonMode, `Missing required option: --${name}`);
    return null;
  }
  return str;
}

function writeStdout(runtime: CliRuntime, chunk: string) {
  (runtime.writeStdout ?? ((value) => process.stdout.write(value)))(chunk);
}

function writeStderr(runtime: CliRuntime, chunk: string) {
  (runtime.writeStderr ?? ((value) => process.stderr.write(value)))(chunk);
}

function emitJson(runtime: CliRuntime, value: unknown) {
  writeStdout(runtime, `${JSON.stringify(value)}\n`);
}

function emitText(runtime: CliRuntime, value = '') {
  writeStdout(runtime, value);
}

function formatQueryResults(results: Array<{ content: string; relevanceScore?: number }>) {
  if (!results.length) return 'No results.';
  return results.map((result, index) => `${index + 1}. ${result.content}${typeof result.relevanceScore === 'number' ? ` (score ${result.relevanceScore.toFixed(3)})` : ''}`).join('\n');
}

function formatChecks(checks: Array<{ name: string; status: string; detail: string }>) {
  return checks.map((check) => `- [${check.status}] ${check.name}: ${check.detail}`).join('\n');
}

function formatRecommendations(recommendations: Array<{ priority: string; action: string; reason: string; command?: string }>) {
  if (!recommendations.length) return 'No recommendations.';
  return recommendations.map((item) => {
    const command = item.command ? `\n  command: ${item.command}` : '';
    return `- [${item.priority}] ${item.action}: ${item.reason}${command}`;
  }).join('\n');
}

function hasFailingChecks(checks: Array<{ status: string }>) {
  return checks.some((check) => check.status === 'fail');
}

function parseRuntimeFocus(value: string | boolean | undefined): RuntimeFocus {
  const normalized = asString(value, 'openclaw').toLowerCase();
  if (normalized === 'hermes') return 'Hermes';
  if (normalized === 'generic') return 'Generic';
  return 'OpenClaw';
}

async function writeInitArtifacts(outDir: string, artifacts: ReturnType<typeof generateInitArtifacts>) {
  await fs.mkdir(outDir, { recursive: true });

  const files = [
    { path: path.join(outDir, 'remem.config.json'), content: artifacts.configJson },
    { path: path.join(outDir, 'remem-snippet.ts'), content: artifacts.snippetTs },
    { path: path.join(outDir, '.env.example'), content: artifacts.envExample },
  ];

  await Promise.all(files.map((file) => fs.writeFile(file.path, file.content, 'utf8')));
  return files.map((file) => file.path);
}

async function readJsonFile(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as unknown;
}

async function readKnowledgeGraphFile(filePath: string) {
  const resolved = path.resolve(filePath);
  const data = await fs.readFile(resolved);
  const raw = resolved.endsWith('.gz')
    ? (await gunzipAsync(data)).toString('utf8')
    : data.toString('utf8');
  return knowledgeGraphArtifactSchema.parse(JSON.parse(raw));
}

async function validateConfigFile(filePath: string) {
  const resolved = path.resolve(filePath);
  const checks: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; detail: string }> = [];
  let config: ReMEMConfig | null = null;

  try {
    const parsed = await readJsonFile(resolved);
    checks.push({
      name: 'config-json',
      status: 'pass',
      detail: `Read valid JSON from ${resolved}.`,
    });

    const knownConfigKeys = ['storage', 'storageConfig', 'postgres', 'llm', 'adapter', 'dbPath', 'embeddings'];
    const hasKnownConfigKey =
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      knownConfigKeys.some((key) => Object.prototype.hasOwnProperty.call(parsed, key));

    const validation = hasKnownConfigKey
      ? rememConfigSchema.safeParse(parsed)
      : {
          success: false as const,
          error: {
            issues: [{ path: [], message: 'No ReMEM config fields found.' }],
          },
        };
    if (validation.success) {
      config = validation.data;
      checks.push({
        name: 'config-schema',
        status: 'pass',
        detail: 'Configuration matches ReMEM schema.',
      });
    } else {
      checks.push({
        name: 'config-schema',
        status: 'fail',
        detail: validation.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`).join('; '),
      });
    }
  } catch (error) {
    checks.push({
      name: 'config-json',
      status: 'fail',
      detail: `Could not read/parse config: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  if (config) {
    if (config.storage === 'postgres' && !config.postgres?.connectionString) {
      checks.push({
        name: 'postgres-url',
        status: 'warn',
        detail: 'Postgres storage is selected but no connectionString is set.',
      });
    }

    if ((config.storage ?? 'sqlite') === 'sqlite' && !config.dbPath) {
      checks.push({
        name: 'sqlite-db-path',
        status: 'warn',
        detail: 'SQLite storage will use the default ./remem.db path.',
      });
    }
  }

  return {
    ok: !hasFailingChecks(checks),
    configPath: resolved,
    config,
    checks,
  };
}

function publicConfigValidation(validation: Awaited<ReturnType<typeof validateConfigFile>>) {
  return {
    ok: validation.ok,
    configPath: validation.configPath,
    checks: validation.checks,
  };
}

async function packageVersion() {
  const binaryDir = process.argv[1] ? path.dirname(process.argv[1]) : process.cwd();
  const candidates = [
    path.resolve(process.cwd(), 'package.json'),
    path.resolve(binaryDir, '..', 'package.json'),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = await readJsonFile(candidate) as { name?: string; version?: string };
      if (parsed.name === '@darksol/remem' && parsed.version) return parsed.version;
    } catch {
      // Best-effort package version discovery for installed and repo-local CLI runs.
    }
  }

  return 'unknown';
}

async function runDoctor(memory: ReMEM, context: ReturnType<typeof buildConfig>, options: Record<string, string | boolean>) {
  const checks: Array<{ name: string; status: 'pass' | 'fail' | 'warn' | 'skip'; detail: string }> = [];
  const version = await packageVersion();

  checks.push({
    name: 'package-version',
    status: version === 'unknown' ? 'warn' : 'pass',
    detail: `@darksol/remem ${version}`,
  });

  checks.push({
    name: 'node-version',
    status: 'pass',
    detail: process.version,
  });

  checks.push({
    name: 'binary-path',
    status: 'pass',
    detail: process.argv[1] ?? 'unknown',
  });

  const configPath = asString(options.config);
  let configValidation: Awaited<ReturnType<typeof validateConfigFile>> | null = null;
  if (configPath) {
    configValidation = await validateConfigFile(configPath);
    checks.push(...configValidation.checks);
  } else {
    checks.push({
      name: 'config-file',
      status: 'skip',
      detail: 'No --config path provided.',
    });
  }

  checks.push({
    name: 'storage',
    status: 'pass',
    detail: `${context.storageLabel} (${context.dbLabel})`,
  });

  checks.push({
    name: 'scope',
    status: 'pass',
    detail: context.scopeLabel,
  });

  checks.push({
    name: 'native-vector-search',
    status: memory.usesNativeVectorSearch() ? 'pass' : 'skip',
    detail: memory.usesNativeVectorSearch()
      ? 'Native vector search is active.'
      : 'Native vector search is not active for this storage/config.',
  });

  checks.push(...await runSmokeChecks(memory, configValidation?.config ?? context.config));

  return {
    ok: !hasFailingChecks(checks),
    command: 'doctor',
    version,
    storage: context.storageLabel,
    db: context.dbLabel,
    scope: context.scopeLabel,
    configPath: configValidation?.configPath ?? null,
    checks,
  };
}

async function withMemory<T>(options: Record<string, string | boolean>, fn: (memory: ReMEM, context: ReturnType<typeof buildConfig>) => Promise<T>) {
  const context = buildConfig(options);
  const memory = new ReMEM(context.config);
  await memory.init();
  await memory.enableLayers();
  try {
    return await fn(memory, context);
  } finally {
    memory.close();
  }
}

export async function runCli(argv: string[] = process.argv, runtime: CliRuntime = {}): Promise<number> {
  const { command, options } = parseArgs(argv);
  const jsonMode = isJsonMode(options);
  const uiLauncher = runtime.launchUi ?? launchTerminalUi;

  if (command === 'help' || command === '--help' || command === '-h') {
    emitText(runtime, helpText());
    return 0;
  }

  if (command === 'ui' || command === 'console') {
    await withMemory(options, async (memory, context) => {
      await uiLauncher(memory, {
        storageLabel: context.storageLabel,
        dbLabel: context.dbLabel,
        scopeLabel: context.scopeLabel,
        config: context.config,
      });
    });
    return 0;
  }

  if (command === 'init') {
    await withMemory(options, async (memory, context) => {
      const runtimeFocus = parseRuntimeFocus(options.runtime);
      const artifacts = generateInitArtifacts({ config: context.config, runtimeFocus });
      const outDir = path.resolve(asString(options['out-dir'], path.join(process.cwd(), '.remem')));
      const written = await writeInitArtifacts(outDir, artifacts);
      const configValidation = await validateConfigFile(path.join(outDir, 'remem.config.json'));
      const smokeChecks = await runSmokeChecks(memory, context.config);
      const doctorChecks = options.check || options.doctor
        ? (await runDoctor(memory, context, { ...options, config: path.join(outDir, 'remem.config.json') })).checks
        : undefined;
      const payload = {
        ok: configValidation.ok && !hasFailingChecks(smokeChecks) && (!doctorChecks || !hasFailingChecks(doctorChecks)),
        command,
        runtimeFocus,
        outDir,
        files: written,
        configValidation: publicConfigValidation(configValidation),
        smokeChecks,
        ...(doctorChecks ? { doctorChecks } : {}),
      };

      if (jsonMode) emitJson(runtime, payload);
      else {
        const checkOutput = options.check || options.doctor
          ? `\nDoctor checks:\n${formatChecks(doctorChecks ?? [])}\n`
          : '';
        emitText(runtime, `Generated init artifacts in ${outDir}\n${written.map((file) => `- ${file}`).join('\n')}\n${checkOutput}`);
      }
    });
    return 0;
  }

  if (command === 'status') {
    await withMemory(options, async (memory, context) => {
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        layersEnabled: memory.isLayersEnabled(),
        nativeVectorSearch: memory.usesNativeVectorSearch(),
        layerStats: memory.getLayerStats(),
        snapshots: await memory.listSnapshots(),
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `status: ok\nstorage: ${payload.storage}\ndb: ${payload.db}\nscope: ${payload.scope}\nlayers: ${payload.layersEnabled ? 'enabled' : 'disabled'}\nsnapshots: ${payload.snapshots.length}\n`);
    });
    return 0;
  }

  if (command === 'stats') {
    await withMemory(options, async (memory, context) => {
      const stats = await memory.stats();
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...stats,
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        const topTopics = stats.topics.slice(0, 8).map((item) => `${item.topic}:${item.count}`).join(', ') || 'none';
        emitText(
          runtime,
          [
            `core memories: ${stats.coreCount}`,
            `layer memories: ${stats.layerCount}`,
            `snapshots: ${stats.snapshotCount}`,
            `events: ${stats.eventCount}`,
            `top topics: ${topTopics}`,
            '',
          ].join('\n')
        );
      }
    });
    return 0;
  }

  if (command === 'graph') {
    await withMemory(options, async (memory, context) => {
      const metadata = parseMaybeJson(options.metadata) as QueryOptions['metadata'];
      const graph = await memory.graph({
        query: asString(options.query) || undefined,
        limit: asNumber(options.limit, 100),
        topics: asCsv(options.topics),
        metadata,
        includeIsolated: !options['hide-isolated'],
        maxLinks: asNumber(options['max-links'], 250),
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...graph,
      };
      if (options.dot) emitText(runtime, `${graph.dot}\n`);
      else if (jsonMode) emitJson(runtime, payload);
      else {
        const topTopics = graph.topics.slice(0, 8).map((item) => `${item.topic}:${item.count}`).join(', ') || 'none';
        emitText(
          runtime,
          [
            `memory graph: ${graph.nodes.length} nodes, ${graph.links.length} links`,
            `top topics: ${topTopics}`,
            `dot: remem graph --dot${graph.query ? ` --query "${graph.query}"` : ''}`,
            '',
          ].join('\n')
        );
      }
    });
    return 0;
  }

  if (command === 'health') {
    await withMemory(options, async (memory, context) => {
      const healthOptions: MemoryHealthOptions = {
        staleAgeMs: asNumber(options['stale-age-ms'], 7 * 24 * 60 * 60 * 1000),
        maxSnapshotAgeMs: asNumber(options['max-snapshot-age-ms'], 24 * 60 * 60 * 1000),
        minSnapshotMemories: asNumber(options['min-snapshot-memories'], 10),
        maxUntaggedRatio: asNumber(options['max-untagged-ratio'], 0.25),
        duplicateSampleLimit: asNumber(options['duplicate-sample-limit'], 10),
      };
      const health = await memory.health(healthOptions);
      const payload = {
        ok: health.status !== 'attention',
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...health,
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `health: ${health.status} (${health.score}/100)`,
            'checks:',
            formatChecks(health.checks),
            'recommendations:',
            formatRecommendations(health.recommendations),
            '',
          ].join('\n')
        );
      }
    });
    return 0;
  }

  if (command === 'storage-maintenance') {
    await withMemory(options, async (memory, context) => {
      const maintenanceOptions: StorageMaintenanceOptions = {
        dryRun: Boolean(options['dry-run']),
        compact: Boolean(options.compact),
        pruneExpired: !options['skip-expired'],
        pruneOrphanLinks: !options['skip-orphan-links'],
        pruneOrphanEmbeddings: !options['skip-orphan-embeddings'],
        now: options.now ? asNumber(options.now, Date.now()) : undefined,
      };
      const result = await memory.storageMaintenance(maintenanceOptions);
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result,
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `storage maintenance: ${result.dryRun ? 'dry-run' : 'applied'}`,
            `expired layer entries: ${result.expiredLayerEntries}`,
            `orphan links: ${result.orphanLinks}`,
            `orphan embeddings: ${result.orphanEmbeddings}`,
            `compacted: ${result.compacted ? 'yes' : 'no'}`,
            '',
          ].join('\n')
        );
      }
    });
    return 0;
  }

  if (command === 'knowledge-artifact') {
    await withMemory(options, async (memory, context) => {
      const artifactPath = requireOption(options.path, 'path', jsonMode, runtime);
      if (artifactPath === null) return;
      const registration = knowledgeArtifactRegistrationSchema.parse({
        source: asString(options.source, 'codebase-memory-mcp'),
        project: asString(options.project) || undefined,
        artifactPath,
        resourceUri: asString(options['resource-uri']) || undefined,
        requiredScopes: asCsv(options['required-scopes']),
        format: asString(options.format, artifactPath.endsWith('.zst') ? 'sqlite' : 'json'),
        compression: asString(options.compression, artifactPath.endsWith('.zst') ? 'zstd' : '') || undefined,
        checksum: asString(options.checksum) || undefined,
        generatedAt: options['generated-at'] ? asNumber(options['generated-at'], Date.now()) : undefined,
        metadata: parseMaybeJson(options.metadata),
      });
      const result = await memory.registerKnowledgeArtifact(registration);
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result,
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `Registered knowledge artifact ${result.artifactPath} (${result.id}).\n`);
    });
    return 0;
  }

  if (command === 'knowledge-ingest') {
    await withMemory(options, async (memory, context) => {
      const artifactPath = requireOption(options.artifact, 'artifact', jsonMode, runtime);
      if (artifactPath === null) return;
      const resolved = path.resolve(artifactPath);
      try {
        const stat = await fs.stat(resolved);
        if (!stat.isFile()) {
          emitError(runtime, jsonMode, `Path is not a file: ${resolved}`);
          return;
        }
      } catch {
        emitError(runtime, jsonMode, `File not found: ${resolved}`);
        return;
      }
      const graph = await readKnowledgeGraphFile(artifactPath);
      const visibility = asString(options.visibility, 'shared') === 'private' ? 'private' : 'shared';
      const result = await memory.ingestKnowledgeGraph(graph, {
        source: asString(options.source) || graph.source,
        project: asString(options.project) || graph.project,
        namespace: asNamespace(options.namespace).length
          ? asNamespace(options.namespace)
          : undefined,
        visibility,
        topic: asString(options.topic, 'knowledge-graph'),
        linkTypePrefix: asString(options['link-prefix'], 'knowledge'),
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        artifact: path.resolve(artifactPath),
        ...result,
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `Ingested ${result.nodesStored} knowledge nodes and ${result.edgesLinked} links (${result.skippedEdges} skipped).\n`);
    });
    return 0;
  }

  if (command === 'knowledge-overview') {
    await withMemory(options, async (memory, context) => {
      const result = await memory.knowledgeOverview({
        project: asString(options.project) || undefined,
        limit: asNumber(options.limit, 10),
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result,
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `knowledge overview${result.project ? ` (${result.project})` : ''}`,
            `nodes: ${result.nodes}`,
            `labels: ${Object.entries(result.labels).map(([label, count]) => `${label}:${count}`).join(', ') || 'none'}`,
            `owners: ${result.owners.length}`,
            `entrypoints: ${result.entrypoints.length}`,
            `hotspots: ${result.hotspots.length}`,
            `deadzones: ${result.deadzones.length}`,
            '',
          ].join('\n')
        );
      }
    });
    return 0;
  }

  if (command === 'knowledge-subgraph') {
    await withMemory(options, async (memory, context) => {
      const query = requireOption(options.query, 'query', jsonMode, runtime);
      if (query === null) return;
      const result = await memory.knowledgeSubgraph(query, {
        project: asString(options.project) || undefined,
        limit: asNumber(options.limit, 8),
        neighborLimit: asNumber(options['neighbor-limit'], asNumber(options.limit, 8)),
        maxContextChars: asNumber(options['max-context-chars'], 6000),
        connectionTypes: asCsv(options.connections),
        minConnectionWeight: options['min-connection-weight'] ? asNumber(options['min-connection-weight'], 0) : undefined,
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result,
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `knowledge subgraph for "${query}"`,
            `nodes: ${result.results.length}`,
            `paths: ${result.paths.length}`,
            `links traversed: ${result.linksTraversed}`,
            '',
            result.context,
            '',
          ].join('\n')
        );
      }
    });
    return 0;
  }

  if (command === 'store') {
    await withMemory(options, async (memory) => {
      const content = requireOption(options.content, 'content', jsonMode, runtime);
      if (content === null) return;
      await memory.store({
        content,
        topics: asCsv(options.topics),
        metadata: parseMaybeJson(options.metadata),
      });
      if (jsonMode) emitJson(runtime, { ok: true, command, stored: true });
      else emitText(runtime, 'Stored memory entry.\n');
    });
    return 0;
  }

  if (command === 'remember') {
    await withMemory(options, async (memory) => {
      const content = requireOption(options.content, 'content', jsonMode, runtime);
      if (content === null) return;
      const result = await memory.remember({
        content,
        topics: asCsv(options.topics),
        metadata: parseMaybeJson(options.metadata),
        kind: (asString(options.kind) || undefined) as RememberKind | undefined,
        source: asString(options.source) || undefined,
        dryRun: Boolean(options['dry-run']),
        forceStore: Boolean(options['force-store']),
      });
      const payload = { ok: result.action === 'stored' || result.action === 'preview', command, ...result };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${result.action}: ${result.reason}\nkind: ${result.kind}\nlayer: ${result.layer}\nscore: ${result.score}\n`);
    });
    return 0;
  }

  if (command === 'query') {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, ...(await memory.query(asString(options.query), { limit: Number(asString(options.limit, '8')) || 8 })) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}\n`);
    });
    return 0;
  }

  if (command === 'recent') {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, results: await memory.getRecent(Number(asString(options.limit, '10')) || 10) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}\n`);
    });
    return 0;
  }

  if (command === 'topic') {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, results: await memory.getByTopic(asString(options.topic), Number(asString(options.limit, '10')) || 10) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}\n`);
    });
    return 0;
  }

  if (command === 'layer-store') {
    await withMemory(options, async (memory) => {
      const layer = requireOption(options.layer, 'layer', jsonMode, runtime);
      if (layer === null) return;
      const payload = {
        ok: true,
        command,
        layer,
        result: await memory.storeInLayer({
          content: asString(options.content),
          topics: asCsv(options.topics),
          metadata: parseMaybeJson(options.metadata),
        }, layer as MemoryLayer),
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `Stored layered memory in ${layer}.\n`);
    });
    return 0;
  }

  if (command === 'procedural-store') {
    await withMemory(options, async (memory) => {
      const trigger = requireOption(options.trigger, 'trigger', jsonMode, runtime);
      if (trigger === null) return;
      const payload = {
        ok: true,
        command,
        result: await memory.storeProcedural({
          content: asString(options.content),
          topics: asCsv(options.topics),
          metadata: parseMaybeJson(options.metadata),
        }, trigger),
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, 'Stored procedural memory.\n');
    });
    return 0;
  }

  if (command === 'procedural-match') {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, matches: memory.matchProcedural(asString(options.context)) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${payload.matches.length} procedural matches found.\n`);
    });
    return 0;
  }

  if (command === 'shared-store') {
    await withMemory(options, async (memory) => {
      const ns = asNamespace(options.namespace);
      if (!ns.length) {
        emitError(runtime, jsonMode, 'Missing required option: --namespace');
        return;
      }
      await memory.storeShared({
        namespace: ns,
        visibility: asString(options.visibility, 'shared') === 'private' ? 'private' : 'shared',
        content: asString(options.content),
        topics: asCsv(options.topics),
        metadata: parseMaybeJson(options.metadata),
      });
      if (jsonMode) emitJson(runtime, { ok: true, command, stored: true });
      else emitText(runtime, 'Stored shared memory entry.\n');
    });
    return 0;
  }

  if (command === 'namespace-query') {
    await withMemory(options, async (memory) => {
      const ns = asNamespace(options.namespace);
      if (!ns.length) {
        emitError(runtime, jsonMode, 'Missing required option: --namespace');
        return;
      }
      const visibility = asString(options.visibility, 'all');
      const payload = {
        ok: true,
        command,
        ...(await memory.queryNamespace(
          ns,
          asString(options.query),
          { limit: Number(asString(options.limit, '8')) || 8 },
          {
            visibility: visibility === 'shared' ? 'shared' : visibility === 'private' ? 'private' : 'all',
            includeDescendants: Boolean(options.descendants),
          }
        )),
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}\n`);
    });
    return 0;
  }

  if (command === 'namespace-recent') {
    await withMemory(options, async (memory) => {
      const ns = asNamespace(options.namespace);
      if (!ns.length) {
        emitError(runtime, jsonMode, 'Missing required option: --namespace');
        return;
      }
      const visibility = asString(options.visibility, 'all');
      const payload = {
        ok: true,
        command,
        results: await memory.getRecentInNamespace(
          ns,
          Number(asString(options.limit, '10')) || 10,
          {
            visibility: visibility === 'shared' ? 'shared' : visibility === 'private' ? 'private' : 'all',
            includeDescendants: Boolean(options.descendants),
          }
        ),
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}\n`);
    });
    return 0;
  }

  if (command === 'smart-recall') {
    await withMemory(options, async (memory) => {
      const metadataFilters = parseMaybeJson(options.metadata) as QueryOptions['metadata'];
      const smartRecallOptions: SmartRecallOptions = {
        profile: asString(options.profile, 'fast') as 'fast' | 'deep' | 'agent-safe' | 'ops-debug',
        limit: Number(asString(options.limit, '8')) || 8,
        includeRecent: Boolean(options.recent),
        recentLimit: Number(asString(options['recent-limit'], '5')) || 5,
        includeProcedural: options.procedural === false ? false : true,
        proceduralLimit: Number(asString(options['procedural-limit'], '5')) || 5,
        hops: (Number(asString(options.hops, '1')) === 2 ? 2 : 1) as 1 | 2,
        minNeighborScore: Number(asString(options['min-neighbor-score'], '0.2')) || 0.2,
        neighborLimit: Number(asString(options['neighbor-limit'], '25')) || 25,
        includeBaseResults: true,
        includePathDetails: false,
        topics: asCsv(options.topics).length ? asCsv(options.topics) : undefined,
        minAccessCount: options['min-access-count'] ? Number(asString(options['min-access-count'])) : undefined,
        metadata: metadataFilters && Object.keys(metadataFilters).length ? metadataFilters : undefined,
      };
      const payload = {
        ok: true,
        command,
        ...(await memory.smartRecall(asString(options.query), smartRecallOptions)),
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}\n`);
    });
    return 0;
  }

  if (command === 'context-pack') {
    await withMemory(options, async (memory) => {
      const metadataFilters = parseMaybeJson(options.metadata) as QueryOptions['metadata'];
      const contextPackOptions: ContextPackOptions = {
        profile: asString(options.profile, 'agent-safe') as ContextPackOptions['profile'],
        limit: Number(asString(options.limit, '8')) || 8,
        maxChars: Number(asString(options['max-chars'], '6000')) || 6000,
        includeDream: Boolean(options.dream),
        includeRecent: options.recent === false ? false : true,
        includeMetadata: Boolean(options['include-metadata']),
        recentLimit: Number(asString(options['recent-limit'], '5')) || 5,
        includeProcedural: options.procedural === false ? false : true,
        proceduralLimit: Number(asString(options['procedural-limit'], '5')) || 5,
        hops: (Number(asString(options.hops, '1')) === 2 ? 2 : 1) as 1 | 2,
        minNeighborScore: Number(asString(options['min-neighbor-score'], '0.2')) || 0.2,
        neighborLimit: Number(asString(options['neighbor-limit'], '25')) || 25,
        includeBaseResults: true,
        includePathDetails: false,
        topics: asCsv(options.topics).length ? asCsv(options.topics) : undefined,
        minAccessCount: options['min-access-count'] ? Number(asString(options['min-access-count'])) : undefined,
        metadata: metadataFilters && Object.keys(metadataFilters).length ? metadataFilters : undefined,
      };
      const payload = {
        ok: true,
        command,
        ...(await memory.contextPack(asString(options.query), contextPackOptions)),
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${payload.content}\n`);
    });
    return 0;
  }

  if (command === 'dream') {
    await withMemory(options, async (memory) => {
      const metadataFilters = parseMaybeJson(options.metadata) as QueryOptions['metadata'];
      const parsedLayers = asCsv(options.layers).filter(Boolean) as Array<'identity' | 'semantic' | 'procedural'>;
      const payload = {
        ok: true,
        command,
        ...(await memory.dream({
          query: asString(options.query, 'What long-memory patterns matter most right now?'),
          layers: parsedLayers.length ? parsedLayers : ['identity', 'semantic', 'procedural'],
          limit: Number(asString(options.limit, '12')) || 12,
          metadata: metadataFilters && Object.keys(metadataFilters).length ? metadataFilters : undefined,
          topicAllowlist: asCsv(options.topics).length ? asCsv(options.topics) : undefined,
        })),
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${payload.title}\n${payload.content}\n`);
    });
    return 0;
  }

  if (command === 'snapshots') {
    await withMemory(options, async (memory) => {
      const action = asString(options.action, 'list');
      if (action === 'create') {
        const payload = { ok: true, command, action, snapshot: await memory.createSnapshot(asString(options.label, `snapshot-${Date.now()}`)) };
        if (jsonMode) emitJson(runtime, payload);
        else emitText(runtime, `Created snapshot ${payload.snapshot.id}.\n`);
        return;
      }
      if (action === 'restore') {
        const payload = { ok: true, command, action, restored: await memory.restoreSnapshot(asString(options['snapshot-id'])) };
        if (jsonMode) emitJson(runtime, payload);
        else emitText(runtime, `Restored ${payload.restored} entries from snapshot.\n`);
        return;
      }
      if (action === 'delete') {
        const payload = { ok: true, command, action, deleted: await memory.deleteSnapshot(asString(options['snapshot-id'])) };
        if (jsonMode) emitJson(runtime, payload);
        else emitText(runtime, payload.deleted ? 'Deleted snapshot.\n' : 'Snapshot not found.\n');
        return;
      }
      const payload = { ok: true, command, action: 'list', snapshots: await memory.listSnapshots() };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, payload.snapshots.length ? `${payload.snapshots.map((snapshot) => `- ${snapshot.id} ${snapshot.label}`).join('\n')}\n` : 'No snapshots.\n');
    });
    return 0;
  }

  if (command === 'consolidate') {
    await withMemory(options, async (memory) => {
      const payload = {
        ok: true,
        command,
        result: await memory.runConsolidation({
          summary: {
            enabled: Boolean(options.summaries),
          },
          proceduralPromotion: {
            enabled: Boolean(options.procedural),
          },
        }),
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, 'Consolidation run completed.\n');
    });
    return 0;
  }

  if (command === 'smoke-check') {
    await withMemory(options, async (memory, context) => {
      const checks = await runSmokeChecks(memory, context.config);
      const payload = {
        ok: !hasFailingChecks(checks),
        command,
        checks,
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatChecks(checks)}\n`);
    });
    return 0;
  }

  if (command === 'doctor') {
    await withMemory(options, async (memory, context) => {
      const payload = await runDoctor(memory, context, options);
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatChecks(payload.checks)}\n`);
    });
    return 0;
  }

  if (command === 'validate-config') {
    const configPath = asString(options.config);
    const payload = configPath
      ? { command, ...publicConfigValidation(await validateConfigFile(configPath)) }
      : {
          ok: false,
          command,
          configPath: null,
          checks: [{ name: 'config-path', status: 'fail' as const, detail: 'Pass --config <path>.' }],
        };

    if (jsonMode) emitJson(runtime, payload);
    else emitText(runtime, `${formatChecks(payload.checks)}\n`);
    return payload.ok ? 0 : 1;
  }

  emitText(runtime, helpText());
  return 1;
}

async function main() {
  try {
    process.exitCode = await runCli(process.argv);
  } catch (error) {
    const jsonMode = process.argv.includes('--json');
    const message = error instanceof Error ? error.message : String(error);
    if (jsonMode) {
      writeStderr({}, `${JSON.stringify({ ok: false, error: message })}\n`);
    } else {
      writeStderr({}, `Error: ${message}\n`);
    }
    process.exitCode = 1;
  }
}

void main();
