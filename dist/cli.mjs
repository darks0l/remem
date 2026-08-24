#!/usr/bin/env node
import {
  ReMEM,
  contextPackOptionsSchema,
  getSmartRecallProfiles,
  knowledgeArtifactRegistrationSchema,
  knowledgeGraphArtifactSchema,
  rememConfigSchema,
  resolveSmartRecallProfile,
  smartRecallOptionsSchema
} from "./chunk-54F7NTJN.mjs";

// src/cli.ts
import fs from "fs/promises";
import path from "path";
import { gunzip } from "zlib";
import { promisify } from "util";

// src/smoke.ts
async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }
  return response.json();
}
async function runEmbeddingProbe(memory, config) {
  const results = [];
  if (!config.embeddings?.enabled) {
    results.push({
      name: "embeddings",
      status: "skip",
      detail: "Embeddings are not enabled."
    });
    return results;
  }
  results.push({
    name: "embeddings-runtime",
    status: memory.isEmbeddingEnabled() ? "pass" : "fail",
    detail: memory.isEmbeddingEnabled() ? "Embedding runtime is enabled." : "Embeddings were configured but runtime is not active."
  });
  const service = memory.getEmbeddingService();
  if (!service) {
    results.push({
      name: "embeddings-service",
      status: "fail",
      detail: "Embedding service instance is unavailable."
    });
    return results;
  }
  try {
    const baseUrl = service.baseUrl.replace(/\/$/, "");
    await fetchJson(`${baseUrl}/api/tags`);
    results.push({
      name: "embeddings-endpoint",
      status: "pass",
      detail: `Reached Ollama endpoint at ${baseUrl}.`
    });
  } catch (error) {
    results.push({
      name: "embeddings-endpoint",
      status: "fail",
      detail: `Embedding endpoint probe failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  return results;
}
async function runLlmProbe(config) {
  const llm = config.llm;
  if (!llm) {
    return [{
      name: "llm",
      status: "skip",
      detail: "No LLM configured."
    }];
  }
  if (llm.type === "ollama") {
    try {
      const baseUrl = llm.baseUrl.replace(/\/$/, "");
      await fetchJson(`${baseUrl}/api/tags`);
      return [{
        name: "llm-endpoint",
        status: "pass",
        detail: `Reached Ollama chat endpoint at ${baseUrl}.`
      }];
    } catch (error) {
      return [{
        name: "llm-endpoint",
        status: "fail",
        detail: `LLM endpoint probe failed: ${error instanceof Error ? error.message : String(error)}`
      }];
    }
  }
  const authHeader = llm.type === "anthropic" ? { "x-api-key": llm.apiKey, "anthropic-version": "2023-06-01" } : { Authorization: `Bearer ${llm.apiKey}` };
  const modelsUrl = llm.type === "openai" ? `${(llm.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "")}/models` : llm.type === "anthropic" ? `${(llm.baseUrl ?? "https://api.anthropic.com/v1").replace(/\/$/, "")}/models` : `${(llm.baseUrl ?? "https://api.bankr.ai").replace(/\/$/, "")}/v1/models`;
  try {
    await fetchJson(modelsUrl, { headers: authHeader });
    return [{
      name: "llm-endpoint",
      status: "pass",
      detail: `Reached ${llm.type} model endpoint.`
    }];
  } catch (error) {
    return [{
      name: "llm-endpoint",
      status: "warn",
      detail: `Configured ${llm.type}, but endpoint probe failed: ${error instanceof Error ? error.message : String(error)}`
    }];
  }
}
async function runSmokeChecks(memory, config) {
  const checks = [];
  checks.push({
    name: "memory-init",
    status: "pass",
    detail: "Memory store initialized."
  });
  checks.push({
    name: "layers",
    status: memory.isLayersEnabled() ? "pass" : "warn",
    detail: memory.isLayersEnabled() ? "Layer manager enabled." : "Layers are not enabled."
  });
  try {
    const snapshot = await memory.createSnapshot(`smoke-check-${Date.now()}`);
    const snapshots = await memory.listSnapshots();
    const exists = snapshots.some((item) => item.id === snapshot.id);
    await memory.deleteSnapshot(snapshot.id);
    checks.push({
      name: "snapshot-roundtrip",
      status: exists ? "pass" : "fail",
      detail: exists ? "Snapshot create/list/delete roundtrip succeeded." : "Snapshot was created but not visible in list output."
    });
  } catch (error) {
    checks.push({
      name: "snapshot-roundtrip",
      status: "fail",
      detail: `Snapshot roundtrip failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  checks.push(...await runEmbeddingProbe(memory, config));
  checks.push(...await runLlmProbe(config));
  return checks;
}

// src/setup.ts
function formatMaybeJson(value) {
  return JSON.stringify(value, null, 2).split("\n");
}
function storageSummary(context) {
  return [
    `storage: ${context.storageLabel}`,
    `db: ${context.dbLabel}`,
    `scope: ${context.scopeLabel}`,
    `native vector search: ${context.memory.usesNativeVectorSearch() ? "yes" : "no"}`,
    `snapshots: ${context.snapshots.length}`
  ];
}
function embeddingSummary(config, memory) {
  const enabled = Boolean(config.embeddings?.enabled);
  return [
    `enabled: ${enabled ? "yes" : "no"}`,
    "provider: Ollama-compatible",
    `base URL: ${config.embeddings?.baseUrl ?? "http://localhost:11434"}`,
    `model: ${config.embeddings?.model ?? "nomic-embed-text"}`,
    `runtime active: ${memory.isEmbeddingEnabled() ? "yes" : "no"}`
  ];
}
function llmSummary(config) {
  const llm = config.llm;
  const configuredModel = llm?.type === "bankr" ? "provider default" : llm?.model ?? "none";
  return [
    `configured: ${llm ? "yes" : "no"}`,
    `provider: ${llm?.type ?? "none"}`,
    `model: ${configuredModel}`,
    `base URL: ${"baseUrl" in (llm ?? {}) ? llm.baseUrl ?? "default" : "default"}`
  ];
}
function openClawChecklist() {
  return [
    "Use when you want memory behind session turns, decisions, and reusable procedures.",
    "",
    "Recommended onboarding:",
    "1. Create a local SQLite or Postgres-backed ReMEM instance.",
    "2. Enable embeddings if conversational recall quality matters.",
    "3. Wrap the instance with createOpenClawAdapter(memory).",
    "4. Write turns + decisions into memory from your runtime hooks.",
    "5. Pull concise context blocks with recallContext() or recallProjectContext().",
    "",
    "Best fit:",
    "- persistent session memory",
    "- release rules / decisions / user preferences",
    "- shared project memory without bloating prompt context"
  ];
}
function hermesChecklist() {
  return [
    "Use when you want harness-oriented memory around threads, runs, artifacts, and shared lanes.",
    "",
    "Recommended onboarding:",
    "1. Stand up the base ReMEM store.",
    "2. Wrap it with createHermesAdapter(memory).",
    "3. Persist turns, artifacts, decisions, and shared namespace notes.",
    "4. Use recallShared() for reusable team/project lanes.",
    "",
    "Best fit:",
    "- thread/run scoped recall",
    "- artifacts and rollout lanes",
    "- shared namespace memory across harness workflows"
  ];
}
function setupPlan(runtimeFocus) {
  const runtimeStep = runtimeFocus === "OpenClaw" ? "Wire createOpenClawAdapter(memory) into turn + decision hooks." : runtimeFocus === "Hermes" ? "Wire createHermesAdapter(memory) into thread/run/artifact hooks." : "Choose the adapter surface your runtime actually needs.";
  return [
    "1. Pick storage lane (sqlite first, postgres when shared infra is real)",
    "2. Turn on embeddings if semantic recall matters",
    "3. Add an LLM only if you need recursive/synthesis workflows",
    `4. ${runtimeStep}`,
    "5. Generate starter config + smoke test init/status before shipping"
  ];
}
function smokeCheckSummary() {
  return [
    "Running real smoke checks against the configured runtime...",
    "Includes snapshot roundtrip plus optional embedding / model endpoint probes."
  ];
}
function generateExampleConfig(context) {
  const config = context.config;
  const example = {
    storage: config.storage ?? "sqlite",
    dbPath: config.dbPath ?? "./remem.db",
    storageConfig: config.storageConfig ?? {},
    ...config.postgres ? { postgres: config.postgres } : {},
    ...config.embeddings ? { embeddings: config.embeddings } : {},
    ...config.llm ? { llm: { ...config.llm, ...config.llm.type !== "ollama" ? { apiKey: "ENV_OR_SECRET_HERE" } : {} } } : {}
  };
  return formatMaybeJson(example);
}
function generateAdapterSnippet(runtimeFocus) {
  if (runtimeFocus === "OpenClaw") {
    return [
      "import { ReMEM, createOpenClawAdapter } from '@darksol/remem';",
      "",
      "const memory = new ReMEM({ dbPath: './remem.db' });",
      "await memory.init();",
      "await memory.enableLayers();",
      "",
      "const openclaw = createOpenClawAdapter(memory);",
      "await openclaw.rememberTurn({",
      "  role: 'user',",
      "  content: 'Ship after tests pass',",
      "  sessionId: 'general',",
      "});",
      "",
      "const context = await openclaw.recallContext('release rules');"
    ];
  }
  if (runtimeFocus === "Hermes") {
    return [
      "import { ReMEM, createHermesAdapter } from '@darksol/remem';",
      "",
      "const memory = new ReMEM({ dbPath: './remem.db' });",
      "await memory.init();",
      "await memory.enableLayers();",
      "",
      "const hermes = createHermesAdapter(memory);",
      "await hermes.rememberTurn({",
      "  role: 'user',",
      "  content: 'Ship Hermes support after tests pass',",
      "  threadId: 'general',",
      "  runId: 'run-42',",
      "});",
      "",
      "const shared = await hermes.recallShared(['team', 'hermes'], 'rollout lane');"
    ];
  }
  return [
    "import { ReMEM } from '@darksol/remem';",
    "",
    "const memory = new ReMEM({ dbPath: './remem.db' });",
    "await memory.init();",
    "await memory.enableLayers();",
    "",
    "// Pick the adapter your runtime actually needs:",
    "// createOpenClawAdapter(memory)",
    "// createHermesAdapter(memory)",
    "// createLangGraphStoreAdapter(memory)",
    "// createVercelAIAdapter(memory)"
  ];
}
function executionModelNotes() {
  return [
    "What belongs in the UI:",
    "- config review",
    "- onboarding guidance",
    "- adapter choice",
    "- starter snippets",
    "- smoke checks",
    "",
    "What should stay out of the UI:",
    "- routine agent memory writes",
    "- full manual recall browsing as a primary workflow",
    "- procedural / layered ops that agents can already script directly"
  ];
}
function generateInitArtifacts(context) {
  const configJson = `${generateExampleConfig({ config: context.config }).join("\n")}
`;
  const snippetTs = `${generateAdapterSnippet(context.runtimeFocus).join("\n")}
`;
  const envExampleLines = [
    "# ReMEM starter environment",
    context.config.storage === "postgres" ? "REMEM_POSTGRES_URL=postgres://user:pass@localhost:5432/remem" : "# REMEM_POSTGRES_URL=",
    context.config.embeddings?.enabled ? `REMEM_EMBEDDINGS_URL=${context.config.embeddings.baseUrl}` : "# REMEM_EMBEDDINGS_URL=http://localhost:11434",
    context.config.embeddings?.enabled ? `REMEM_EMBEDDINGS_MODEL=${context.config.embeddings.model}` : "# REMEM_EMBEDDINGS_MODEL=nomic-embed-text",
    context.config.llm?.type && context.config.llm.type !== "ollama" ? `REMEM_${context.config.llm.type.toUpperCase()}_API_KEY=your-key-here` : "# REMEM_LLM_API_KEY="
  ];
  return {
    configJson,
    snippetTs,
    envExample: `${envExampleLines.join("\n")}
`
  };
}

// src/ui.ts
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
function clearScreen() {
  output.write("\x1Bc");
}
function divider(width = 92) {
  return "\u2500".repeat(width);
}
function truncate(value, width) {
  if (value.length <= width) return value;
  return `${value.slice(0, Math.max(0, width - 1))}\u2026`;
}
function panel(title, lines = []) {
  const width = 92;
  const top = `\u250C${divider(width - 2)}\u2510`;
  const mid = `\u251C${divider(width - 2)}\u2524`;
  const bottom = `\u2514${divider(width - 2)}\u2518`;
  const titleLine = `\u2502 ${truncate(title, width - 4)}`.padEnd(width - 1, " ") + "\u2502";
  const body = (lines.length ? lines : [""]).map((line) => `\u2502 ${truncate(String(line), width - 4)}`.padEnd(width - 1, " ") + "\u2502");
  return [top, titleLine, mid, ...body, bottom].join("\n");
}
function hero(selectedRuntime) {
  return [
    "\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557",
    "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551",
    "\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551",
    "\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551",
    "\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551",
    "\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u255D",
    "",
    `setup + integration console  |  focus: ${selectedRuntime}`
  ].join("\n");
}
async function pause(rl, message = "Press Enter to continue...") {
  await rl.question(`
${message}`);
}
async function overviewFlow(context) {
  console.log(panel("ReMEM setup overview", [
    ...storageSummary(context),
    "",
    `runtime focus: ${context.runtimeFocus}`,
    "This console is for human setup and adapter onboarding.",
    "The agent-facing memory ops stay in CLI/API land."
  ]));
}
async function runtimeFocusFlow(rl, context) {
  const answer = (await rl.question("Pick runtime focus [1] OpenClaw [2] Hermes [3] Generic: ")).trim();
  if (answer === "1") context.runtimeFocus = "OpenClaw";
  else if (answer === "2") context.runtimeFocus = "Hermes";
  else if (answer === "3") context.runtimeFocus = "Generic";
  console.log(panel("Runtime focus updated", [
    `selected: ${context.runtimeFocus}`,
    context.runtimeFocus === "OpenClaw" ? "Next screens will bias toward session-turn memory onboarding." : context.runtimeFocus === "Hermes" ? "Next screens will bias toward thread/run/artifact onboarding." : "Next screens will stay framework-neutral."
  ]));
}
async function storageFlow(context) {
  console.log(panel("Storage configuration", [
    ...storageSummary(context),
    "",
    context.storageLabel === "postgres" ? "Use this when shared/server deployments need scoped persistence." : context.storageLabel === "memory" ? "Ephemeral lane for tests, demos, and smoke checks." : "SQLite is the sane default for local durable memory and first integration passes."
  ]));
}
async function embeddingsFlow(context) {
  console.log(panel("Embeddings configuration", [
    ...embeddingSummary(context.config, context.memory),
    "",
    "Turn this on when you want semantic recall instead of pure keyword matching."
  ]));
}
async function llmFlow(context) {
  console.log(panel("LLM configuration", [
    ...llmSummary(context.config),
    "",
    "Only needed for recursive/synthesis workflows. Core memory store/query does not require it."
  ]));
}
async function adapterFlow(context) {
  const lines = context.runtimeFocus === "OpenClaw" ? openClawChecklist() : context.runtimeFocus === "Hermes" ? hermesChecklist() : [
    "Pick the thinnest adapter surface that matches your runtime.",
    "",
    "- OpenClaw: session turns, decisions, procedures, project context",
    "- Hermes: threads, runs, artifacts, shared namespaces",
    "- LangGraph: BaseStore-ish search/put/get namespace lane",
    "- Vercel AI: helper surface for saved messages + context recall"
  ];
  console.log(panel(`${context.runtimeFocus} adapter onboarding`, lines));
}
async function snippetFlow(context) {
  console.log(panel(`${context.runtimeFocus} starter snippet`, generateAdapterSnippet(context.runtimeFocus)));
}
async function generatedConfigFlow(context) {
  console.log(panel("Starter config", generateExampleConfig(context)));
}
async function smokeChecksFlow(context) {
  console.log(panel("Smoke checks", smokeCheckSummary()));
  console.log();
  const checks = await runSmokeChecks(context.memory, context.config);
  console.log(panel("Smoke check results", checks.map((check) => `${check.status.toUpperCase()}  ${check.name}  ${check.detail}`)));
}
async function executionPlanFlow(context) {
  console.log(panel("Execution plan", setupPlan(context.runtimeFocus)));
  console.log();
  console.log(panel("Scope sanity check", executionModelNotes()));
}
async function launchTerminalUi(memory, context) {
  if (!input.isTTY || !output.isTTY) {
    throw new Error("terminal_ui_requires_tty");
  }
  const rl = readline.createInterface({ input, output });
  const setupContext = {
    memory,
    storageLabel: context.storageLabel,
    dbLabel: context.dbLabel,
    scopeLabel: context.scopeLabel,
    config: context.config,
    snapshots: await memory.listSnapshots(),
    runtimeFocus: "OpenClaw"
  };
  try {
    for (; ; ) {
      clearScreen();
      console.log(hero(setupContext.runtimeFocus));
      console.log();
      console.log(panel("ReMEM setup console", [
        "1. Overview",
        "2. Choose runtime focus",
        "3. Storage configuration",
        "4. Embeddings configuration",
        "5. LLM configuration",
        "6. Adapter onboarding",
        "7. Starter snippet",
        "8. Generate starter config",
        "9. Smoke checks",
        "10. Recommended execution plan",
        "0. Exit"
      ]));
      const choice = (await rl.question("\nSelect action: ")).trim();
      clearScreen();
      try {
        if (choice === "0") break;
        if (choice === "1") await overviewFlow(setupContext);
        else if (choice === "2") await runtimeFocusFlow(rl, setupContext);
        else if (choice === "3") await storageFlow(setupContext);
        else if (choice === "4") await embeddingsFlow(setupContext);
        else if (choice === "5") await llmFlow(setupContext);
        else if (choice === "6") await adapterFlow(setupContext);
        else if (choice === "7") await snippetFlow(setupContext);
        else if (choice === "8") await generatedConfigFlow(setupContext);
        else if (choice === "9") await smokeChecksFlow(setupContext);
        else if (choice === "10") await executionPlanFlow(setupContext);
        else console.log(panel("Unknown action", ["Pick one of the listed numbers."]));
      } catch (error) {
        console.log(panel("Action failed", [error instanceof Error ? error.message : String(error)]));
      }
      await pause(rl);
    }
  } finally {
    rl.close();
    clearScreen();
  }
}

// src/cli.ts
var gunzipAsync = promisify(gunzip);
function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] || "help";
  const rest = [];
  const options = {};
  for (let i = 1; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith("--")) {
      rest.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    i += 1;
  }
  return { command, rest, options };
}
function asString(value, fallback = "") {
  if (typeof value === "string") return value;
  return fallback;
}
function asNumber(value, fallback) {
  const parsed = Number(asString(value, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
}
function asCsv(value) {
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
function asNamespace(value) {
  if (typeof value !== "string") return [];
  return value.replace(/\//g, ",").split(",").map((item) => item.trim()).filter(Boolean);
}
function parseMaybeJson(value) {
  if (typeof value !== "string" || !value.trim()) return {};
  return JSON.parse(value);
}
function resolveProfileOption(value, fallback) {
  return resolveSmartRecallProfile(asString(value)) ?? fallback;
}
function buildConfig(options) {
  const storage = asString(options.storage, "sqlite");
  const dbPath = asString(options.db, storage === "memory" ? ":memory:" : "./remem.db");
  const workspaceId = asString(options["workspace-id"]) || void 0;
  const agentId = asString(options["agent-id"]) || void 0;
  const userId = asString(options["user-id"]) || void 0;
  const config = {
    storage,
    dbPath,
    storageConfig: {
      workspaceId,
      agentId,
      userId
    }
  };
  const postgresUrl = asString(options["postgres-url"]);
  if (storage === "postgres" && postgresUrl) {
    config.postgres = { connectionString: postgresUrl };
  }
  if (options.embeddings) {
    config.embeddings = {
      enabled: true,
      baseUrl: asString(options["embeddings-url"], "http://localhost:11434"),
      model: asString(options["embeddings-model"], "nomic-embed-text"),
      asyncEmbed: true
    };
  }
  const llmType = asString(options["llm-type"]);
  if (llmType) {
    const apiKey = asString(options["llm-api-key"]);
    const model = asString(options["llm-model"]);
    const baseUrl = asString(options["llm-base-url"]);
    if (llmType === "ollama") {
      config.llm = {
        type: "ollama",
        baseUrl: baseUrl || "http://localhost:11434",
        model: model || "llama3"
      };
    } else if (llmType === "openai" && apiKey) {
      config.llm = { type: "openai", apiKey, model: model || "gpt-4o", ...baseUrl ? { baseUrl } : {} };
    } else if (llmType === "anthropic" && apiKey) {
      config.llm = { type: "anthropic", apiKey, model: model || "claude-sonnet-4-6", ...baseUrl ? { baseUrl } : {} };
    } else if (llmType === "bankr" && apiKey) {
      config.llm = { type: "bankr", apiKey, ...baseUrl ? { baseUrl } : {} };
    }
  }
  return {
    config,
    storageLabel: storage,
    dbLabel: storage === "postgres" ? postgresUrl || "postgres" : dbPath,
    scopeLabel: [workspaceId ? `workspace:${workspaceId}` : null, agentId ? `agent:${agentId}` : null, userId ? `user:${userId}` : null].filter(Boolean).join(" | ") || "global"
  };
}
function helpText() {
  return `ReMEM CLI

Usage:
  remem ui [--db <path>] [--storage sqlite|memory|postgres] [--workspace-id <id>] [--agent-id <id>] [--user-id <id>]
  remem init [same flags as ui] [--runtime openclaw|hermes|generic] [--out-dir <path>] [--json]
  remem status [--db <path>]
  remem stats [--db <path>] [--json]
  remem graph [--query <text>] [--limit 100] [--dot] [--json]
  remem health [--db <path>] [--json]
  remem storage-maintenance [--dry-run] [--compact] [--json]
  remem knowledge-artifact --path <file> [--source codebase-memory-mcp] [--project <name>] [--resource-uri <uri>] [--required-scopes a,b] [--format sqlite] [--compression zstd] [--json]
  remem knowledge-ingest --artifact <graph.json|graph.json.gz> [--source <name>] [--project <name>] [--namespace team/code] [--visibility shared|private] [--json]
  remem knowledge-overview [--project <name>] [--limit 10] [--labels Function,Route] [--owners src,packages] [--json]
  remem knowledge-explain --query <text> [--project <name>] [--limit 8] [--neighbor-limit 8] [--connections calls,imports] [--labels Function,Route] [--owners src,packages] [--max-context-chars 6000] [--json]
  remem knowledge-subgraph --query <text> [--project <name>] [--limit 8] [--neighbor-limit 8] [--connections calls,imports] [--labels Function,Route] [--owners src,packages] [--max-context-chars 6000] [--json]
  remem knowledge-entrypoints [--project <name>] [--limit 10] [--labels Function,Route] [--owners src,packages] [--json]
  remem knowledge-owners [--project <name>] [--limit 10] [--labels Function,Route] [--owners src,packages] [--json]
  remem knowledge-hotspots [--project <name>] [--limit 10] [--labels Function,Route] [--owners src,packages] [--json]
  remem knowledge-deadzones [--project <name>] [--limit 10] [--labels Function,Route] [--owners src,packages] [--json]
  remem store --content <text> [--topics a,b] [--metadata '{"kind":"note"}']
  remem remember --content <text> [--kind fact|preference|decision|procedure|recent-event|artifact-note] [--topics a,b] [--source <name>] [--dry-run]
  remem remember-batch --file <items.json> [--stop-on-error] [--json]
  remem query --query <text> [--limit 8]
  remem recent [--limit 10]
  remem topic --topic <name> [--limit 10]
  remem layer-store --layer semantic --content <text> [--topics a,b]
  remem procedural-store --content <text> --trigger <phrase> [--topics a,b]
  remem procedural-match --context <text>
  remem shared-store --namespace team/ops --content <text> [--visibility shared|private]
  remem namespace-query --namespace team/ops --query <text> [--visibility all|shared|private]
  remem namespace-recent --namespace team/ops [--limit 10] [--visibility all|shared|private]
  remem recall-profiles [--profile <name>] [--json]
  remem smart-recall --query <text> [--profile fast|deep|agent-safe|ops-debug|coding-agent|ops-handoff|research-brief] [--limit 8]
  remem context-pack --query <text> [--profile fast|deep|agent-safe|ops-debug|coding-agent|ops-handoff|research-brief] [--max-chars 6000] [--dream]
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
  --workspace-id <id>        Workspace scope
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
function isJsonMode(options) {
  return Boolean(options.json);
}
function emitError(runtime, jsonMode, message) {
  if (jsonMode) {
    writeStderr(runtime, `${JSON.stringify({ ok: false, error: message })}
`);
  } else {
    writeStderr(runtime, `Error: ${message}
`);
  }
}
function requireOption(value, name, jsonMode, runtime) {
  const str = asString(value);
  if (!str) {
    emitError(runtime, jsonMode, `Missing required option: --${name}`);
    return null;
  }
  return str;
}
function writeStdout(runtime, chunk) {
  (runtime.writeStdout ?? ((value) => process.stdout.write(value)))(chunk);
}
function writeStderr(runtime, chunk) {
  (runtime.writeStderr ?? ((value) => process.stderr.write(value)))(chunk);
}
function emitJson(runtime, value) {
  writeStdout(runtime, `${JSON.stringify(value)}
`);
}
function emitText(runtime, value = "") {
  writeStdout(runtime, value);
}
function formatQueryResults(results) {
  if (!results.length) return "No results.";
  return results.map((result, index) => `${index + 1}. ${result.content}${typeof result.relevanceScore === "number" ? ` (score ${result.relevanceScore.toFixed(3)})` : ""}`).join("\n");
}
function formatChecks(checks) {
  return checks.map((check) => `- [${check.status}] ${check.name}: ${check.detail}`).join("\n");
}
function formatRecommendations(recommendations) {
  if (!recommendations.length) return "No recommendations.";
  return recommendations.map((item) => {
    const command = item.command ? `
  command: ${item.command}` : "";
    return `- [${item.priority}] ${item.action}: ${item.reason}${command}`;
  }).join("\n");
}
function hasFailingChecks(checks) {
  return checks.some((check) => check.status === "fail");
}
function parseRuntimeFocus(value) {
  const normalized = asString(value, "openclaw").toLowerCase();
  if (normalized === "hermes") return "Hermes";
  if (normalized === "generic") return "Generic";
  return "OpenClaw";
}
async function writeInitArtifacts(outDir, artifacts) {
  await fs.mkdir(outDir, { recursive: true });
  const files = [
    { path: path.join(outDir, "remem.config.json"), content: artifacts.configJson },
    { path: path.join(outDir, "remem-snippet.ts"), content: artifacts.snippetTs },
    { path: path.join(outDir, ".env.example"), content: artifacts.envExample }
  ];
  await Promise.all(files.map((file) => fs.writeFile(file.path, file.content, "utf8")));
  return files.map((file) => file.path);
}
async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}
async function readRememberBatchFile(filePath) {
  const parsed = await readJsonFile(path.resolve(filePath));
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
    return parsed.items;
  }
  throw new Error("Batch file must be a JSON array or an object with an items array.");
}
async function readKnowledgeGraphFile(filePath) {
  const resolved = path.resolve(filePath);
  const data = await fs.readFile(resolved);
  const raw = resolved.endsWith(".gz") ? (await gunzipAsync(data)).toString("utf8") : data.toString("utf8");
  return knowledgeGraphArtifactSchema.parse(JSON.parse(raw));
}
async function validateConfigFile(filePath) {
  const resolved = path.resolve(filePath);
  const checks = [];
  let config = null;
  try {
    const parsed = await readJsonFile(resolved);
    checks.push({
      name: "config-json",
      status: "pass",
      detail: `Read valid JSON from ${resolved}.`
    });
    const knownConfigKeys = ["storage", "storageConfig", "postgres", "llm", "adapter", "dbPath", "embeddings"];
    const hasKnownConfigKey = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && knownConfigKeys.some((key) => Object.prototype.hasOwnProperty.call(parsed, key));
    const validation = hasKnownConfigKey ? rememConfigSchema.safeParse(parsed) : {
      success: false,
      error: {
        issues: [{ path: [], message: "No ReMEM config fields found." }]
      }
    };
    if (validation.success) {
      config = validation.data;
      checks.push({
        name: "config-schema",
        status: "pass",
        detail: "Configuration matches ReMEM schema."
      });
    } else {
      checks.push({
        name: "config-schema",
        status: "fail",
        detail: validation.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ")
      });
    }
  } catch (error) {
    checks.push({
      name: "config-json",
      status: "fail",
      detail: `Could not read/parse config: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  if (config) {
    if (config.storage === "postgres" && !config.postgres?.connectionString) {
      checks.push({
        name: "postgres-url",
        status: "warn",
        detail: "Postgres storage is selected but no connectionString is set."
      });
    }
    if ((config.storage ?? "sqlite") === "sqlite" && !config.dbPath) {
      checks.push({
        name: "sqlite-db-path",
        status: "warn",
        detail: "SQLite storage will use the default ./remem.db path."
      });
    }
  }
  return {
    ok: !hasFailingChecks(checks),
    configPath: resolved,
    config,
    checks
  };
}
function publicConfigValidation(validation) {
  return {
    ok: validation.ok,
    configPath: validation.configPath,
    checks: validation.checks
  };
}
async function packageVersion() {
  const binaryDir = process.argv[1] ? path.dirname(process.argv[1]) : process.cwd();
  const candidates = [
    path.resolve(process.cwd(), "package.json"),
    path.resolve(binaryDir, "..", "package.json")
  ];
  for (const candidate of candidates) {
    try {
      const parsed = await readJsonFile(candidate);
      if (parsed.name === "@darksol/remem" && parsed.version) return parsed.version;
    } catch {
    }
  }
  return "unknown";
}
async function runDoctor(memory, context, options) {
  const checks = [];
  const version = await packageVersion();
  checks.push({
    name: "package-version",
    status: version === "unknown" ? "warn" : "pass",
    detail: `@darksol/remem ${version}`
  });
  checks.push({
    name: "node-version",
    status: "pass",
    detail: process.version
  });
  checks.push({
    name: "binary-path",
    status: "pass",
    detail: process.argv[1] ?? "unknown"
  });
  const configPath = asString(options.config);
  let configValidation = null;
  if (configPath) {
    configValidation = await validateConfigFile(configPath);
    checks.push(...configValidation.checks);
  } else {
    checks.push({
      name: "config-file",
      status: "skip",
      detail: "No --config path provided."
    });
  }
  checks.push({
    name: "storage",
    status: "pass",
    detail: `${context.storageLabel} (${context.dbLabel})`
  });
  checks.push({
    name: "scope",
    status: "pass",
    detail: context.scopeLabel
  });
  checks.push({
    name: "native-vector-search",
    status: memory.usesNativeVectorSearch() ? "pass" : "skip",
    detail: memory.usesNativeVectorSearch() ? "Native vector search is active." : "Native vector search is not active for this storage/config."
  });
  checks.push(...await runSmokeChecks(memory, configValidation?.config ?? context.config));
  return {
    ok: !hasFailingChecks(checks),
    command: "doctor",
    version,
    storage: context.storageLabel,
    db: context.dbLabel,
    scope: context.scopeLabel,
    configPath: configValidation?.configPath ?? null,
    checks
  };
}
async function withMemory(options, fn) {
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
async function runCli(argv = process.argv, runtime = {}) {
  const { command, options } = parseArgs(argv);
  const jsonMode = isJsonMode(options);
  const uiLauncher = runtime.launchUi ?? launchTerminalUi;
  if (command === "help" || command === "--help" || command === "-h") {
    emitText(runtime, helpText());
    return 0;
  }
  if (command === "ui" || command === "console") {
    await withMemory(options, async (memory, context) => {
      await uiLauncher(memory, {
        storageLabel: context.storageLabel,
        dbLabel: context.dbLabel,
        scopeLabel: context.scopeLabel,
        config: context.config
      });
    });
    return 0;
  }
  if (command === "init") {
    await withMemory(options, async (memory, context) => {
      const runtimeFocus = parseRuntimeFocus(options.runtime);
      const artifacts = generateInitArtifacts({ config: context.config, runtimeFocus });
      const outDir = path.resolve(asString(options["out-dir"], path.join(process.cwd(), ".remem")));
      const written = await writeInitArtifacts(outDir, artifacts);
      const configValidation = await validateConfigFile(path.join(outDir, "remem.config.json"));
      const smokeChecks = await runSmokeChecks(memory, context.config);
      const doctorChecks = options.check || options.doctor ? (await runDoctor(memory, context, { ...options, config: path.join(outDir, "remem.config.json") })).checks : void 0;
      const payload = {
        ok: configValidation.ok && !hasFailingChecks(smokeChecks) && (!doctorChecks || !hasFailingChecks(doctorChecks)),
        command,
        runtimeFocus,
        outDir,
        files: written,
        configValidation: publicConfigValidation(configValidation),
        smokeChecks,
        ...doctorChecks ? { doctorChecks } : {}
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        const checkOutput = options.check || options.doctor ? `
Doctor checks:
${formatChecks(doctorChecks ?? [])}
` : "";
        emitText(runtime, `Generated init artifacts in ${outDir}
${written.map((file) => `- ${file}`).join("\n")}
${checkOutput}`);
      }
    });
    return 0;
  }
  if (command === "status") {
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
        snapshots: await memory.listSnapshots()
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `status: ok
storage: ${payload.storage}
db: ${payload.db}
scope: ${payload.scope}
layers: ${payload.layersEnabled ? "enabled" : "disabled"}
snapshots: ${payload.snapshots.length}
`);
    });
    return 0;
  }
  if (command === "stats") {
    await withMemory(options, async (memory, context) => {
      const stats = await memory.stats();
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...stats
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        const topTopics = stats.topics.slice(0, 8).map((item) => `${item.topic}:${item.count}`).join(", ") || "none";
        emitText(
          runtime,
          [
            `core memories: ${stats.coreCount}`,
            `layer memories: ${stats.layerCount}`,
            `snapshots: ${stats.snapshotCount}`,
            `events: ${stats.eventCount}`,
            `top topics: ${topTopics}`,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "graph") {
    await withMemory(options, async (memory, context) => {
      const metadata = parseMaybeJson(options.metadata);
      const graph = await memory.graph({
        query: asString(options.query) || void 0,
        limit: asNumber(options.limit, 100),
        topics: asCsv(options.topics),
        metadata,
        includeIsolated: !options["hide-isolated"],
        maxLinks: asNumber(options["max-links"], 250)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...graph
      };
      if (options.dot) emitText(runtime, `${graph.dot}
`);
      else if (jsonMode) emitJson(runtime, payload);
      else {
        const topTopics = graph.topics.slice(0, 8).map((item) => `${item.topic}:${item.count}`).join(", ") || "none";
        emitText(
          runtime,
          [
            `memory graph: ${graph.nodes.length} nodes, ${graph.links.length} links`,
            `top topics: ${topTopics}`,
            `dot: remem graph --dot${graph.query ? ` --query "${graph.query}"` : ""}`,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "health") {
    await withMemory(options, async (memory, context) => {
      const healthOptions = {
        staleAgeMs: asNumber(options["stale-age-ms"], 7 * 24 * 60 * 60 * 1e3),
        maxSnapshotAgeMs: asNumber(options["max-snapshot-age-ms"], 24 * 60 * 60 * 1e3),
        minSnapshotMemories: asNumber(options["min-snapshot-memories"], 10),
        maxUntaggedRatio: asNumber(options["max-untagged-ratio"], 0.25),
        duplicateSampleLimit: asNumber(options["duplicate-sample-limit"], 10)
      };
      const health = await memory.health(healthOptions);
      const payload = {
        ok: health.status !== "attention",
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...health
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `health: ${health.status} (${health.score}/100)`,
            "checks:",
            formatChecks(health.checks),
            "recommendations:",
            formatRecommendations(health.recommendations),
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "storage-maintenance") {
    await withMemory(options, async (memory, context) => {
      const maintenanceOptions = {
        dryRun: Boolean(options["dry-run"]),
        compact: Boolean(options.compact),
        pruneExpired: !options["skip-expired"],
        pruneOrphanLinks: !options["skip-orphan-links"],
        pruneOrphanEmbeddings: !options["skip-orphan-embeddings"],
        now: options.now ? asNumber(options.now, Date.now()) : void 0
      };
      const result = await memory.storageMaintenance(maintenanceOptions);
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `storage maintenance: ${result.dryRun ? "dry-run" : "applied"}`,
            `expired layer entries: ${result.expiredLayerEntries}`,
            `orphan links: ${result.orphanLinks}`,
            `orphan embeddings: ${result.orphanEmbeddings}`,
            `compacted: ${result.compacted ? "yes" : "no"}`,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "knowledge-artifact") {
    await withMemory(options, async (memory, context) => {
      const artifactPath = requireOption(options.path, "path", jsonMode, runtime);
      if (artifactPath === null) return;
      const registration = knowledgeArtifactRegistrationSchema.parse({
        source: asString(options.source, "codebase-memory-mcp"),
        project: asString(options.project) || void 0,
        artifactPath,
        resourceUri: asString(options["resource-uri"]) || void 0,
        requiredScopes: asCsv(options["required-scopes"]),
        format: asString(options.format, artifactPath.endsWith(".zst") ? "sqlite" : "json"),
        compression: asString(options.compression, artifactPath.endsWith(".zst") ? "zstd" : "") || void 0,
        checksum: asString(options.checksum) || void 0,
        generatedAt: options["generated-at"] ? asNumber(options["generated-at"], Date.now()) : void 0,
        metadata: parseMaybeJson(options.metadata)
      });
      const result = await memory.registerKnowledgeArtifact(registration);
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `Registered knowledge artifact ${result.artifactPath} (${result.id}).
`);
    });
    return 0;
  }
  if (command === "knowledge-ingest") {
    await withMemory(options, async (memory, context) => {
      const artifactPath = requireOption(options.artifact, "artifact", jsonMode, runtime);
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
      const visibility = asString(options.visibility, "shared") === "private" ? "private" : "shared";
      const result = await memory.ingestKnowledgeGraph(graph, {
        source: asString(options.source) || graph.source,
        project: asString(options.project) || graph.project,
        namespace: asNamespace(options.namespace).length ? asNamespace(options.namespace) : void 0,
        visibility,
        topic: asString(options.topic, "knowledge-graph"),
        linkTypePrefix: asString(options["link-prefix"], "knowledge")
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        artifact: path.resolve(artifactPath),
        ...result
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `Ingested ${result.nodesStored} knowledge nodes and ${result.edgesLinked} links (${result.skippedEdges} skipped).
`);
    });
    return 0;
  }
  if (command === "knowledge-overview") {
    await withMemory(options, async (memory, context) => {
      const result = await memory.knowledgeOverview({
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 10),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `knowledge overview${result.project ? ` (${result.project})` : ""}`,
            `nodes: ${result.nodes}`,
            `labels: ${Object.entries(result.labels).map(([label, count]) => `${label}:${count}`).join(", ") || "none"}`,
            `owners: ${result.owners.length}`,
            `entrypoints: ${result.entrypoints.length}`,
            `hotspots: ${result.hotspots.length}`,
            `deadzones: ${result.deadzones.length}`,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "knowledge-subgraph") {
    await withMemory(options, async (memory, context) => {
      const query = requireOption(options.query, "query", jsonMode, runtime);
      if (query === null) return;
      const result = await memory.knowledgeSubgraph(query, {
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 8),
        neighborLimit: asNumber(options["neighbor-limit"], asNumber(options.limit, 8)),
        maxContextChars: asNumber(options["max-context-chars"], 6e3),
        connectionTypes: asCsv(options.connections),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners),
        minConnectionWeight: options["min-connection-weight"] ? asNumber(options["min-connection-weight"], 0) : void 0
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result
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
            "",
            result.context,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "knowledge-explain") {
    await withMemory(options, async (memory, context) => {
      const query = requireOption(options.query, "query", jsonMode, runtime);
      if (query === null) return;
      const result = await memory.knowledgeExplain(query, {
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 8),
        neighborLimit: asNumber(options["neighbor-limit"], asNumber(options.limit, 8)),
        maxContextChars: asNumber(options["max-context-chars"], 6e3),
        connectionTypes: asCsv(options.connections),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners),
        minConnectionWeight: options["min-connection-weight"] ? asNumber(options["min-connection-weight"], 0) : void 0
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        ...result
      };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            payload.summary,
            "",
            payload.context,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "knowledge-entrypoints") {
    await withMemory(options, async (memory, context) => {
      const entrypoints = await memory.knowledgeEntrypoints({
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 10),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        entrypoints
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, entrypoints.length ? `${entrypoints.map((item) => `- ${item.node.content.split("\n")[0]}`).join("\n")}
` : "No entrypoints.\n");
    });
    return 0;
  }
  if (command === "knowledge-owners") {
    await withMemory(options, async (memory, context) => {
      const owners = await memory.knowledgeOwners({
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 10),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        owners
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, owners.length ? `${owners.map((item) => `- ${item.owner} (${item.type}) nodes:${item.nodes}`).join("\n")}
` : "No owners.\n");
    });
    return 0;
  }
  if (command === "knowledge-hotspots") {
    await withMemory(options, async (memory, context) => {
      const hotspots = await memory.knowledgeHotspots({
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 10),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        hotspots
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, hotspots.length ? `${hotspots.map((item) => `- ${item.node.content.split("\n")[0]} in:${item.incoming} out:${item.outgoing}`).join("\n")}
` : "No hotspots.\n");
    });
    return 0;
  }
  if (command === "knowledge-deadzones") {
    await withMemory(options, async (memory, context) => {
      const deadzones = await memory.knowledgeDeadzones({
        project: asString(options.project) || void 0,
        limit: asNumber(options.limit, 10),
        nodeLabels: asCsv(options.labels),
        owners: asCsv(options.owners)
      });
      const payload = {
        ok: true,
        command,
        storage: context.storageLabel,
        db: context.dbLabel,
        scope: context.scopeLabel,
        deadzones
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, deadzones.length ? `${deadzones.map((item) => `- ${item.node.content.split("\n")[0]} in:${item.incoming} out:${item.outgoing}`).join("\n")}
` : "No deadzones.\n");
    });
    return 0;
  }
  if (command === "store") {
    await withMemory(options, async (memory) => {
      const content = requireOption(options.content, "content", jsonMode, runtime);
      if (content === null) return;
      await memory.store({
        content,
        topics: asCsv(options.topics),
        metadata: parseMaybeJson(options.metadata)
      });
      if (jsonMode) emitJson(runtime, { ok: true, command, stored: true });
      else emitText(runtime, "Stored memory entry.\n");
    });
    return 0;
  }
  if (command === "remember") {
    await withMemory(options, async (memory) => {
      const content = requireOption(options.content, "content", jsonMode, runtime);
      if (content === null) return;
      const result = await memory.remember({
        content,
        topics: asCsv(options.topics),
        metadata: parseMaybeJson(options.metadata),
        kind: asString(options.kind) || void 0,
        source: asString(options.source) || void 0,
        dryRun: Boolean(options["dry-run"]),
        forceStore: Boolean(options["force-store"])
      });
      const payload = { ok: result.action === "stored" || result.action === "preview", command, ...result };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${result.action}: ${result.reason}
kind: ${result.kind}
layer: ${result.layer}
score: ${result.score}
`);
    });
    return 0;
  }
  if (command === "remember-batch") {
    await withMemory(options, async (memory) => {
      const file = requireOption(options.file, "file", jsonMode, runtime);
      if (file === null) return;
      const result = await memory.rememberMany(await readRememberBatchFile(file), {
        stopOnError: Boolean(options["stop-on-error"])
      });
      const payload = { ok: result.failed === 0, command, ...result };
      if (jsonMode) emitJson(runtime, payload);
      else {
        emitText(
          runtime,
          [
            `remember-batch processed ${result.total} items`,
            `stored: ${result.stored}`,
            `preview: ${result.previews}`,
            `duplicates: ${result.skippedDuplicate}`,
            `low-signal: ${result.skippedLowSignal}`,
            `failed: ${result.failed}`,
            ""
          ].join("\n")
        );
      }
    });
    return 0;
  }
  if (command === "query") {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, ...await memory.query(asString(options.query), { limit: Number(asString(options.limit, "8")) || 8 }) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "recent") {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, results: await memory.getRecent(Number(asString(options.limit, "10")) || 10) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "topic") {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, results: await memory.getByTopic(asString(options.topic), Number(asString(options.limit, "10")) || 10) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "layer-store") {
    await withMemory(options, async (memory) => {
      const layer = requireOption(options.layer, "layer", jsonMode, runtime);
      if (layer === null) return;
      const payload = {
        ok: true,
        command,
        layer,
        result: await memory.storeInLayer({
          content: asString(options.content),
          topics: asCsv(options.topics),
          metadata: parseMaybeJson(options.metadata)
        }, layer)
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `Stored layered memory in ${layer}.
`);
    });
    return 0;
  }
  if (command === "procedural-store") {
    await withMemory(options, async (memory) => {
      const trigger = requireOption(options.trigger, "trigger", jsonMode, runtime);
      if (trigger === null) return;
      const payload = {
        ok: true,
        command,
        result: await memory.storeProcedural({
          content: asString(options.content),
          topics: asCsv(options.topics),
          metadata: parseMaybeJson(options.metadata)
        }, trigger)
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, "Stored procedural memory.\n");
    });
    return 0;
  }
  if (command === "procedural-match") {
    await withMemory(options, async (memory) => {
      const payload = { ok: true, command, matches: memory.matchProcedural(asString(options.context)) };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${payload.matches.length} procedural matches found.
`);
    });
    return 0;
  }
  if (command === "shared-store") {
    await withMemory(options, async (memory) => {
      const ns = asNamespace(options.namespace);
      if (!ns.length) {
        emitError(runtime, jsonMode, "Missing required option: --namespace");
        return;
      }
      await memory.storeShared({
        namespace: ns,
        visibility: asString(options.visibility, "shared") === "private" ? "private" : "shared",
        content: asString(options.content),
        topics: asCsv(options.topics),
        metadata: parseMaybeJson(options.metadata)
      });
      if (jsonMode) emitJson(runtime, { ok: true, command, stored: true });
      else emitText(runtime, "Stored shared memory entry.\n");
    });
    return 0;
  }
  if (command === "namespace-query") {
    await withMemory(options, async (memory) => {
      const ns = asNamespace(options.namespace);
      if (!ns.length) {
        emitError(runtime, jsonMode, "Missing required option: --namespace");
        return;
      }
      const visibility = asString(options.visibility, "all");
      const payload = {
        ok: true,
        command,
        ...await memory.queryNamespace(
          ns,
          asString(options.query),
          { limit: Number(asString(options.limit, "8")) || 8 },
          {
            visibility: visibility === "shared" ? "shared" : visibility === "private" ? "private" : "all",
            includeDescendants: Boolean(options.descendants)
          }
        )
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "namespace-recent") {
    await withMemory(options, async (memory) => {
      const ns = asNamespace(options.namespace);
      if (!ns.length) {
        emitError(runtime, jsonMode, "Missing required option: --namespace");
        return;
      }
      const visibility = asString(options.visibility, "all");
      const payload = {
        ok: true,
        command,
        results: await memory.getRecentInNamespace(
          ns,
          Number(asString(options.limit, "10")) || 10,
          {
            visibility: visibility === "shared" ? "shared" : visibility === "private" ? "private" : "all",
            includeDescendants: Boolean(options.descendants)
          }
        )
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "recall-profiles") {
    const profiles = getSmartRecallProfiles();
    const requested = asString(options.profile).trim();
    const resolvedProfile = resolveSmartRecallProfile(requested);
    const payload = requested ? profiles.find((profile) => profile.profile === resolvedProfile) : { profiles };
    if (!payload) {
      emitError(runtime, jsonMode, `Unknown recall profile: ${requested}`);
      return 1;
    }
    if (jsonMode) {
      emitJson(runtime, { ok: true, command, ..."profile" in payload ? { profile: payload } : payload });
    } else if ("profile" in payload) {
      emitText(
        runtime,
        [
          `${payload.profile} (${payload.label})`,
          payload.overview,
          `recommended for: ${payload.recommendedFor.join("; ")}`,
          `defaults: ${JSON.stringify(payload.defaultOptions)}`,
          ""
        ].join("\n")
      );
    } else {
      emitText(
        runtime,
        `${payload.profiles.map((profile) => `${profile.profile} - ${profile.overview}`).join("\n")}
`
      );
    }
    return 0;
  }
  if (command === "smart-recall") {
    await withMemory(options, async (memory) => {
      const metadataFilters = parseMaybeJson(options.metadata);
      const smartRecallOptions = smartRecallOptionsSchema.parse({
        profile: resolveProfileOption(options.profile, "fast"),
        limit: Number(asString(options.limit, "8")) || 8,
        includeRecent: Boolean(options.recent),
        recentLimit: Number(asString(options["recent-limit"], "5")) || 5,
        includeProcedural: options.procedural === false ? false : true,
        proceduralLimit: Number(asString(options["procedural-limit"], "5")) || 5,
        hops: Number(asString(options.hops, "1")) === 2 ? 2 : 1,
        minNeighborScore: Number(asString(options["min-neighbor-score"], "0.2")) || 0.2,
        neighborLimit: Number(asString(options["neighbor-limit"], "25")) || 25,
        includeBaseResults: true,
        includePathDetails: false,
        topics: asCsv(options.topics).length ? asCsv(options.topics) : void 0,
        minAccessCount: options["min-access-count"] ? Number(asString(options["min-access-count"])) : void 0,
        metadata: metadataFilters && Object.keys(metadataFilters).length ? metadataFilters : void 0
      });
      const payload = {
        ok: true,
        command,
        ...await memory.smartRecall(asString(options.query), smartRecallOptions)
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatQueryResults(payload.results)}
`);
    });
    return 0;
  }
  if (command === "context-pack") {
    await withMemory(options, async (memory) => {
      const metadataFilters = parseMaybeJson(options.metadata);
      const contextPackOptions = contextPackOptionsSchema.parse({
        profile: resolveProfileOption(options.profile, "agent-safe"),
        limit: Number(asString(options.limit, "8")) || 8,
        maxChars: Number(asString(options["max-chars"], "6000")) || 6e3,
        includeDream: Boolean(options.dream),
        includeRecent: options.recent === false ? false : true,
        includeMetadata: Boolean(options["include-metadata"]),
        recentLimit: Number(asString(options["recent-limit"], "5")) || 5,
        includeProcedural: options.procedural === false ? false : true,
        proceduralLimit: Number(asString(options["procedural-limit"], "5")) || 5,
        hops: Number(asString(options.hops, "1")) === 2 ? 2 : 1,
        minNeighborScore: Number(asString(options["min-neighbor-score"], "0.2")) || 0.2,
        neighborLimit: Number(asString(options["neighbor-limit"], "25")) || 25,
        includeBaseResults: true,
        includePathDetails: false,
        topics: asCsv(options.topics).length ? asCsv(options.topics) : void 0,
        minAccessCount: options["min-access-count"] ? Number(asString(options["min-access-count"])) : void 0,
        metadata: metadataFilters && Object.keys(metadataFilters).length ? metadataFilters : void 0
      });
      const payload = {
        ok: true,
        command,
        ...await memory.contextPack(asString(options.query), contextPackOptions)
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${payload.content}
`);
    });
    return 0;
  }
  if (command === "dream") {
    await withMemory(options, async (memory) => {
      const metadataFilters = parseMaybeJson(options.metadata);
      const parsedLayers = asCsv(options.layers).filter(Boolean);
      const payload = {
        ok: true,
        command,
        ...await memory.dream({
          query: asString(options.query, "What long-memory patterns matter most right now?"),
          layers: parsedLayers.length ? parsedLayers : ["identity", "semantic", "procedural"],
          limit: Number(asString(options.limit, "12")) || 12,
          metadata: metadataFilters && Object.keys(metadataFilters).length ? metadataFilters : void 0,
          topicAllowlist: asCsv(options.topics).length ? asCsv(options.topics) : void 0
        })
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${payload.title}
${payload.content}
`);
    });
    return 0;
  }
  if (command === "snapshots") {
    await withMemory(options, async (memory) => {
      const action = asString(options.action, "list");
      if (action === "create") {
        const payload2 = { ok: true, command, action, snapshot: await memory.createSnapshot(asString(options.label, `snapshot-${Date.now()}`)) };
        if (jsonMode) emitJson(runtime, payload2);
        else emitText(runtime, `Created snapshot ${payload2.snapshot.id}.
`);
        return;
      }
      if (action === "restore") {
        const payload2 = { ok: true, command, action, restored: await memory.restoreSnapshot(asString(options["snapshot-id"])) };
        if (jsonMode) emitJson(runtime, payload2);
        else emitText(runtime, `Restored ${payload2.restored} entries from snapshot.
`);
        return;
      }
      if (action === "delete") {
        const payload2 = { ok: true, command, action, deleted: await memory.deleteSnapshot(asString(options["snapshot-id"])) };
        if (jsonMode) emitJson(runtime, payload2);
        else emitText(runtime, payload2.deleted ? "Deleted snapshot.\n" : "Snapshot not found.\n");
        return;
      }
      const payload = { ok: true, command, action: "list", snapshots: await memory.listSnapshots() };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, payload.snapshots.length ? `${payload.snapshots.map((snapshot) => `- ${snapshot.id} ${snapshot.label}`).join("\n")}
` : "No snapshots.\n");
    });
    return 0;
  }
  if (command === "consolidate") {
    await withMemory(options, async (memory) => {
      const payload = {
        ok: true,
        command,
        result: await memory.runConsolidation({
          summary: {
            enabled: Boolean(options.summaries)
          },
          proceduralPromotion: {
            enabled: Boolean(options.procedural)
          }
        })
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, "Consolidation run completed.\n");
    });
    return 0;
  }
  if (command === "smoke-check") {
    await withMemory(options, async (memory, context) => {
      const checks = await runSmokeChecks(memory, context.config);
      const payload = {
        ok: !hasFailingChecks(checks),
        command,
        checks
      };
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatChecks(checks)}
`);
    });
    return 0;
  }
  if (command === "doctor") {
    await withMemory(options, async (memory, context) => {
      const payload = await runDoctor(memory, context, options);
      if (jsonMode) emitJson(runtime, payload);
      else emitText(runtime, `${formatChecks(payload.checks)}
`);
    });
    return 0;
  }
  if (command === "validate-config") {
    const configPath = asString(options.config);
    const payload = configPath ? { command, ...publicConfigValidation(await validateConfigFile(configPath)) } : {
      ok: false,
      command,
      configPath: null,
      checks: [{ name: "config-path", status: "fail", detail: "Pass --config <path>." }]
    };
    if (jsonMode) emitJson(runtime, payload);
    else emitText(runtime, `${formatChecks(payload.checks)}
`);
    return payload.ok ? 0 : 1;
  }
  emitText(runtime, helpText());
  return 1;
}
async function main() {
  try {
    process.exitCode = await runCli(process.argv);
  } catch (error) {
    const jsonMode = process.argv.includes("--json");
    const message = error instanceof Error ? error.message : String(error);
    if (jsonMode) {
      writeStderr({}, `${JSON.stringify({ ok: false, error: message })}
`);
    } else {
      writeStderr({}, `Error: ${message}
`);
    }
    process.exitCode = 1;
  }
}
void main();
export {
  runCli
};
