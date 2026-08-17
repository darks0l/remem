import type { SmartRecallProfile } from './types.js';

const PROFILE_ALIASES: Readonly<Record<string, SmartRecallProfile>> = {
  agentsafe: 'agent-safe',
  'agent-safe': 'agent-safe',
  agent_safe: 'agent-safe',
  opsdebug: 'ops-debug',
  'ops-debug': 'ops-debug',
  ops_debug: 'ops-debug',
  coding: 'coding-agent',
  codingagent: 'coding-agent',
  'coding-agent': 'coding-agent',
  coding_agent: 'coding-agent',
  ops: 'ops-handoff',
  opshandoff: 'ops-handoff',
  'ops-handoff': 'ops-handoff',
  ops_handoff: 'ops-handoff',
  handoff: 'ops-handoff',
  research: 'research-brief',
  researchbrief: 'research-brief',
  'research-brief': 'research-brief',
  research_brief: 'research-brief',
};

export function normalizeSmartRecallProfileInput(profile: string | null | undefined): string {
  return (profile ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export function resolveSmartRecallProfile(profile: string | null | undefined): SmartRecallProfile | null {
  const normalized = normalizeSmartRecallProfileInput(profile);
  if (!normalized) return null;
  return PROFILE_ALIASES[normalized] ?? null;
}
