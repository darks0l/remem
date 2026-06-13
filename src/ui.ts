import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type { ReMEM } from './index.js';
import { runSmokeChecks } from './smoke.js';
import {
  type SetupContext,
  storageSummary,
  embeddingSummary,
  llmSummary,
  openClawChecklist,
  hermesChecklist,
  setupPlan,
  smokeCheckSummary,
  generateExampleConfig,
  generateAdapterSnippet,
  executionModelNotes,
} from './setup.js';
import type { ReMEMConfig } from './types.js';

function clearScreen() {
  output.write('\x1Bc');
}

function divider(width = 92) {
  return '─'.repeat(width);
}

function truncate(value: string, width: number) {
  if (value.length <= width) return value;
  return `${value.slice(0, Math.max(0, width - 1))}…`;
}

function panel(title: string, lines: string[] = []) {
  const width = 92;
  const top = `┌${divider(width - 2)}┐`;
  const mid = `├${divider(width - 2)}┤`;
  const bottom = `└${divider(width - 2)}┘`;
  const titleLine = `│ ${truncate(title, width - 4)}`.padEnd(width - 1, ' ') + '│';
  const body = (lines.length ? lines : ['']).map((line) => (
    `│ ${truncate(String(line), width - 4)}`.padEnd(width - 1, ' ') + '│'
  ));
  return [top, titleLine, mid, ...body, bottom].join('\n');
}

function hero(selectedRuntime: string) {
  return [
    '██████╗ ███████╗███╗   ███╗███████╗███╗   ███╗',
    '██╔══██╗██╔════╝████╗ ████║██╔════╝████╗ ████║',
    '██████╔╝█████╗  ██╔████╔██║█████╗  ██╔████╔██║',
    '██╔══██╗██╔══╝  ██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║',
    '██║  ██║███████╗██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║',
    '╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝',
    '',
    `setup + integration console  |  focus: ${selectedRuntime}`,
  ].join('\n');
}

async function pause(rl: readline.Interface, message = 'Press Enter to continue...') {
  await rl.question(`\n${message}`);
}

async function overviewFlow(context: SetupContext) {
  console.log(panel('ReMEM setup overview', [
    ...storageSummary(context),
    '',
    `runtime focus: ${context.runtimeFocus}`,
    'This console is for human setup and adapter onboarding.',
    'The agent-facing memory ops stay in CLI/API land.',
  ]));
}

async function runtimeFocusFlow(rl: readline.Interface, context: SetupContext) {
  const answer = (await rl.question('Pick runtime focus [1] OpenClaw [2] Hermes [3] Generic: ')).trim();
  if (answer === '1') context.runtimeFocus = 'OpenClaw';
  else if (answer === '2') context.runtimeFocus = 'Hermes';
  else if (answer === '3') context.runtimeFocus = 'Generic';

  console.log(panel('Runtime focus updated', [
    `selected: ${context.runtimeFocus}`,
    context.runtimeFocus === 'OpenClaw'
      ? 'Next screens will bias toward session-turn memory onboarding.'
      : context.runtimeFocus === 'Hermes'
        ? 'Next screens will bias toward thread/run/artifact onboarding.'
        : 'Next screens will stay framework-neutral.',
  ]));
}

async function storageFlow(context: SetupContext) {
  console.log(panel('Storage configuration', [
    ...storageSummary(context),
    '',
    context.storageLabel === 'postgres'
      ? 'Use this when shared/server deployments need scoped persistence.'
      : context.storageLabel === 'memory'
        ? 'Ephemeral lane for tests, demos, and smoke checks.'
        : 'SQLite is the sane default for local durable memory and first integration passes.',
  ]));
}

async function embeddingsFlow(context: SetupContext) {
  console.log(panel('Embeddings configuration', [
    ...embeddingSummary(context.config, context.memory),
    '',
    'Turn this on when you want semantic recall instead of pure keyword matching.',
  ]));
}

async function llmFlow(context: SetupContext) {
  console.log(panel('LLM configuration', [
    ...llmSummary(context.config),
    '',
    'Only needed for recursive/synthesis workflows. Core memory store/query does not require it.',
  ]));
}

async function adapterFlow(context: SetupContext) {
  const lines = context.runtimeFocus === 'OpenClaw'
    ? openClawChecklist()
    : context.runtimeFocus === 'Hermes'
      ? hermesChecklist()
      : [
          'Pick the thinnest adapter surface that matches your runtime.',
          '',
          '- OpenClaw: session turns, decisions, procedures, project context',
          '- Hermes: threads, runs, artifacts, shared namespaces',
          '- LangGraph: BaseStore-ish search/put/get namespace lane',
          '- Vercel AI: helper surface for saved messages + context recall',
        ];

  console.log(panel(`${context.runtimeFocus} adapter onboarding`, lines));
}

async function snippetFlow(context: SetupContext) {
  console.log(panel(`${context.runtimeFocus} starter snippet`, generateAdapterSnippet(context.runtimeFocus)));
}

async function generatedConfigFlow(context: SetupContext) {
  console.log(panel('Starter config', generateExampleConfig(context)));
}

async function smokeChecksFlow(context: SetupContext) {
  console.log(panel('Smoke checks', smokeCheckSummary()));
  console.log();
  const checks = await runSmokeChecks(context.memory, context.config);
  console.log(panel('Smoke check results', checks.map((check) => `${check.status.toUpperCase()}  ${check.name}  ${check.detail}`)));
}

async function executionPlanFlow(context: SetupContext) {
  console.log(panel('Execution plan', setupPlan(context.runtimeFocus)));
  console.log();
  console.log(panel('Scope sanity check', executionModelNotes()));
}

export async function launchTerminalUi(
  memory: ReMEM,
  context: { storageLabel: string; dbLabel: string; scopeLabel: string; config: ReMEMConfig }
) {
  if (!input.isTTY || !output.isTTY) {
    throw new Error('terminal_ui_requires_tty');
  }

  const rl = readline.createInterface({ input, output });
  const setupContext: SetupContext = {
    memory,
    storageLabel: context.storageLabel,
    dbLabel: context.dbLabel,
    scopeLabel: context.scopeLabel,
    config: context.config,
    snapshots: await memory.listSnapshots(),
    runtimeFocus: 'OpenClaw',
  };

  try {
    for (;;) {
      clearScreen();
      console.log(hero(setupContext.runtimeFocus));
      console.log();
      console.log(panel('ReMEM setup console', [
        '1. Overview',
        '2. Choose runtime focus',
        '3. Storage configuration',
        '4. Embeddings configuration',
        '5. LLM configuration',
        '6. Adapter onboarding',
        '7. Starter snippet',
        '8. Generate starter config',
        '9. Smoke checks',
        '10. Recommended execution plan',
        '0. Exit',
      ]));

      const choice = (await rl.question('\nSelect action: ')).trim();
      clearScreen();

      try {
        if (choice === '0') break;
        if (choice === '1') await overviewFlow(setupContext);
        else if (choice === '2') await runtimeFocusFlow(rl, setupContext);
        else if (choice === '3') await storageFlow(setupContext);
        else if (choice === '4') await embeddingsFlow(setupContext);
        else if (choice === '5') await llmFlow(setupContext);
        else if (choice === '6') await adapterFlow(setupContext);
        else if (choice === '7') await snippetFlow(setupContext);
        else if (choice === '8') await generatedConfigFlow(setupContext);
        else if (choice === '9') await smokeChecksFlow(setupContext);
        else if (choice === '10') await executionPlanFlow(setupContext);
        else console.log(panel('Unknown action', ['Pick one of the listed numbers.']));
      } catch (error) {
        console.log(panel('Action failed', [error instanceof Error ? error.message : String(error)]));
      }

      await pause(rl);
    }
  } finally {
    rl.close();
    clearScreen();
  }
}
