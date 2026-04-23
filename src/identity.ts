/**
 * ReMEM — Identity & Constitution
 * RLM-style identity layer with drift detection and constitution injection
 */

import { randomUUID } from 'crypto';
import { ModelAbstraction } from './model.js';
import {
  type Constitution,
  type ConstitutionStatement,
  type DriftResult,
  type IdentityConfig,
  constitutionStatementSchema,
  type LLMMessage,
} from './types.js';

// ============================================================================
// Constitution Manager — stores and manages identity statements
// ============================================================================

export class ConstitutionManager {
  private constitution: Constitution;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private config: any;

  constructor(config: Partial<IdentityConfig> = {}) {
    const cfg = config;
    this.config = {
      driftThreshold: cfg.driftThreshold ?? 0.3,
      criticalThreshold: cfg.criticalThreshold ?? 0.7,
      autoInject: cfg.autoInject ?? true,
      evalModel: cfg.evalModel,
      constitution: cfg.constitution ?? {
        statements: [],
        version: '1.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    };
    this.constitution = this.config.constitution;
  }

  /**
   * Import statements from source text (e.g., SOUL.md, IDENTITY.md).
   * Parses the text and extracts identity statements by category.
   */
  importFromText(text: string, source: string): number {
    // Simple extraction: look for section headers and their content
    // Categories: values, boundaries, preferences, goals
    const categoryPatterns: Record<string, RegExp> = {
      values: /(?:values?|core\s*truths?|principles?)[\s:]*\n([\s\S]*?)(?=\n##|\n#|$)/gi,
      boundaries: /(?:boundaries?|limits?|rules?)[\s:]*\n([\s\S]*?)(?=\n##|\n#|$)/gi,
      preferences: /(?:preferences?|likes?|style)[\s:]*\n([\s\S]*?)(?=\n##|\n#|$)/gi,
      goals: /(?:goals?|objectives?|direction)[\s:]*\n([\s\S]*?)(?=\n##|\n#|$)/gi,
    };

    let imported = 0;
    const now = Date.now();

    for (const [category, pattern] of Object.entries(categoryPatterns)) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const content = match[1].trim();
        if (!content) continue;

        // Split by bullet points or newlines to get individual statements
        const lines = content
          .split(/\n|•|-|\*/)
          .map((l) => l.trim())
          .filter((l) => l.length > 10);

        for (const line of lines) {
          const statement: ConstitutionStatement = {
            id: randomUUID(),
            text: line,
            category: category as ConstitutionStatement['category'],
            weight: 0.5,
            source,
            createdAt: now,
          };
          // Use safe parsing
          const parsed = constitutionStatementSchema.safeParse(statement);
          if (parsed.success) {
            this.constitution.statements.push(parsed.data);
            imported++;
          }
        }
      }
    }

    // Fallback: if no categories found, import everything as 'values' with lower weight
    if (imported === 0) {
      const lines = text
        .split(/\n/)
        .map((l) => l.replace(/^#+\s*/, '').trim())
        .filter((l) => l.length > 15 && !l.startsWith('['));

      for (const line of lines.slice(0, 20)) {
        const statement: ConstitutionStatement = {
          id: randomUUID(),
          text: line,
          category: 'values',
          weight: 0.3,
          source,
          createdAt: now,
        };
        const parsed = constitutionStatementSchema.safeParse(statement);
        if (parsed.success) {
          this.constitution.statements.push(parsed.data);
          imported++;
        }
      }
    }

    this.constitution.updatedAt = Date.now();
    return imported;
  }

  /**
   * Add a single statement manually.
   */
  addStatement(
    text: string,
    category: ConstitutionStatement['category'],
    weight: number = 0.5,
    source?: string
  ): ConstitutionStatement {
    const statement: ConstitutionStatement = {
      id: randomUUID(),
      text,
      category,
      weight,
      source: source ?? 'manual',
      createdAt: Date.now(),
    };
    const validated = constitutionStatementSchema.parse(statement);
    this.constitution.statements.push(validated);
    this.constitution.updatedAt = Date.now();
    return validated;
  }

  /**
   * Get all statements, optionally filtered by category.
   */
  getStatements(category?: ConstitutionStatement['category']): ConstitutionStatement[] {
    if (!category) return [...this.constitution.statements];
    return this.constitution.statements.filter((s) => s.category === category);
  }

  /**
   * Get the full constitution.
   */
  getConstitution(): Constitution {
    return { ...this.constitution };
  }

  /**
   * Serialize constitution for injection into LLM context.
   */
  toInjectionBlock(): string {
    const statements = this.constitution.statements;
    if (statements.length === 0) return '';

    const byCategory = statements.reduce(
      (acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
      },
      {} as Record<string, ConstitutionStatement[]>
    );

    const parts = ['## Identity Constitution\n'];
    for (const [category, stmts] of Object.entries(byCategory)) {
      parts.push(`\n### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`);
      for (const s of stmts) {
        parts.push(`- [${s.weight.toFixed(1)}] ${s.text}\n`);
      }
    }
    return parts.join('');
  }
}

// ============================================================================
// Drift Detector — pattern matching + LLM self-evaluation
// ============================================================================

export class DriftDetector {
  private constitution: ConstitutionManager;
  private evalModel?: ModelAbstraction;
  private threshold: number;
  private criticalThreshold: number;

  constructor(constitution: ConstitutionManager, config: Partial<IdentityConfig> = {}) {
    this.constitution = constitution;
    if (config.evalModel) {
      this.evalModel = new ModelAbstraction(config.evalModel);
    }
    this.threshold = config.driftThreshold ?? 0.3;
    this.criticalThreshold = config.criticalThreshold ?? 0.7;
  }

  /**
   * Detect drift using BOTH pattern matching and LLM self-evaluation.
   * Returns a DriftResult with score, level, and violating statements.
   */
  async detectDrift(
    sessionText: string,
    options?: { method?: 'pattern' | 'llm' | 'both'; confidenceThreshold?: number }
  ): Promise<DriftResult> {
    const method = options?.method ?? 'both';

    let patternDrift: DriftResult | null = null;
    let llmDrift: DriftResult | null = null;

    if (method === 'pattern' || method === 'both') {
      patternDrift = this.detectPatternDrift(sessionText);
    }

    if (method === 'llm' || method === 'both') {
      llmDrift = await this.detectLLMDrift(sessionText);
    }

    // Merge results: use the worse score
    const scores = [patternDrift?.score, llmDrift?.score].filter(
      (s): s is number => s !== null && s !== undefined
    );

    if (scores.length === 0) {
      return {
        score: 0,
        level: 'aligned',
        violatingStatements: [],
        reasoning: 'No drift detected — no significant violations found.',
        detectedAt: Date.now(),
      };
    }

    const maxScore = Math.max(...scores);
    const allViolations = [
      ...(patternDrift?.violatingStatements ?? []),
      ...(llmDrift?.violatingStatements ?? []),
    ];

    // Deduplicate by ID
    const seen = new Set<string>();
    const uniqueViolations = allViolations.filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    const level =
      maxScore >= this.criticalThreshold
        ? 'critical'
        : maxScore >= this.threshold
        ? maxScore >= (this.threshold + this.criticalThreshold) / 2
          ? 'moderate'
          : 'minor'
        : 'aligned';

    const reasoning = [
      patternDrift && `Pattern matching: ${patternDrift.reasoning}`,
      llmDrift && `LLM evaluation: ${llmDrift.reasoning}`,
    ]
      .filter(Boolean)
      .join(' | ');

    return {
      score: maxScore,
      level,
      violatingStatements: uniqueViolations,
      reasoning,
      detectedAt: Date.now(),
    };
  }

  /**
   * Fast pattern-matching drift detection.
   * Checks for negation patterns, value contradictions, and boundary violations.
   */
  private detectPatternDrift(sessionText: string): DriftResult {
    const statements = this.constitution.getStatements();
    const lowerText = sessionText.toLowerCase();

    // Negation patterns that might indicate drift
    const negationPatterns = [
      /\bnot\s+(?:a|I|me|my)\b/i,
      /\bdon't\s+think\b/i,
      /\bno\s+longer\b/i,
      /\bchanged\s+my\s+mind\b/i,
      /\bactually\b.*\b(not|no)\b/i,
    ];

    const negationMatches = negationPatterns.filter((p) => p.test(lowerText));
    const hasNegation = negationMatches.length > 0;

    // Find violating statements
    const violatingStatements: ConstitutionStatement[] = [];

    for (const statement of statements) {
      const statementLower = statement.text.toLowerCase();

      // Check for direct negation of a statement
      const negationVariants = [
        statementLower.replace(/^(i\s+|you\s+|we\s+)/i, 'not $1'),
        `not ${statementLower}`,
        `i don't ${statementLower.replace(/^(i\s+)/, '')}`,
      ];

      for (const variant of negationVariants) {
        if (lowerText.includes(variant.slice(0, 50))) {
          violatingStatements.push(statement);
          break;
        }
      }
    }

    // Calculate score
    let score = 0;
    const reasoningParts: string[] = [];

    if (hasNegation) {
      score += 0.15;
      reasoningParts.push('negation patterns detected');
    }

    if (violatingStatements.length > 0) {
      const weightedSum = violatingStatements.reduce((sum, s) => sum + s.weight, 0);
      score += Math.min(weightedSum / Math.max(statements.length, 1), 0.5);
      reasoningParts.push(`${violatingStatements.length} value contradictions`);
    }

    const level: DriftResult['level'] =
      score >= this.criticalThreshold
        ? 'critical'
        : score >= this.threshold
        ? score >= (this.threshold + this.criticalThreshold) / 2
          ? 'moderate'
          : 'minor'
        : 'aligned';

    return {
      score: Math.min(score, 1),
      level,
      violatingStatements,
      reasoning: reasoningParts.join('; ') || 'no violations',
      detectedAt: Date.now(),
    };
  }

  /**
   * LLM-based drift evaluation using self-check.
   * Asks the model: "Are you still aligned with these values?"
   */
  private async detectLLMDrift(sessionText: string): Promise<DriftResult | null> {
    if (!this.evalModel) {
      // Fall back to pattern-only if no eval model
      return null;
    }

    const statements = this.constitution.getStatements();
    if (statements.length === 0) return null;

    const constitutionText = this.constitution.toInjectionBlock();

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an identity alignment checker. Evaluate whether the recent conversation shows drift from the stated identity.

Rate drift on a 0-1 scale where:
- 0.0-0.2: aligned (minor language variation only)
- 0.3-0.5: minor drift (slight deviation from some values)
- 0.6-0.8: moderate drift (significant value contradictions)
- 0.9-1.0: critical drift (core values completely abandoned)

Respond with ONLY valid JSON:
{
  "score": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "violations": ["<list of specific violations>"]
}

Be strict. Better to say there is drift than to excuse it.`,
      },
      {
        role: 'user',
        content: `Identity Constitution:
${constitutionText}

Recent conversation:
---
${sessionText.slice(-4000)}
---

Evaluate alignment. Return ONLY JSON.`,
      },
    ];

    try {
      const response = await this.evalModel.chat(messages, {
        temperature: 0.1,
        maxTokens: 512,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const score = typeof parsed.score === 'number' ? parsed.score : 0;

      // Map violations to statement objects
      const violatingStatements: ConstitutionStatement[] = [];
      if (Array.isArray(parsed.violations)) {
        for (const v of parsed.violations) {
          // Try to find matching statement by text similarity
          const match = statements.find(
            (s) =>
              s.text.toLowerCase().includes(String(v).toLowerCase().slice(0, 20)) ||
              String(v).toLowerCase().includes(s.text.toLowerCase().slice(0, 20))
          );
          if (match) violatingStatements.push(match);
        }
      }

      return {
        score: Math.min(Math.max(score, 0), 1),
        level:
          score >= this.criticalThreshold
            ? 'critical'
            : score >= this.threshold
            ? score >= (this.threshold + this.criticalThreshold) / 2
              ? 'moderate'
              : 'minor'
            : 'aligned',
        violatingStatements,
        reasoning: parsed.reasoning ?? 'LLM evaluation complete',
        detectedAt: Date.now(),
      };
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Constitution Injector — generates correction reminders when drift is detected
// ============================================================================

export class ConstitutionInjector {
  private constitution: ConstitutionManager;
  private autoInject: boolean;

  constructor(constitution: ConstitutionManager, autoInject: boolean = true) {
    this.constitution = constitution;
    this.autoInject = autoInject;
  }

  /**
   * Generate a constitution injection block for the current drift result.
   * Call this before sending messages to the LLM when drift is detected.
   */
  buildInjection(drift: DriftResult): string {
    const constitution = this.constitution.toInjectionBlock();
    if (!constitution) return '';

    const parts = [
      '## ⚠️ Identity Alignment Reminder\n',
      `Drift detected: **${drift.level.toUpperCase()}** (score: ${drift.score.toFixed(2)})\n`,
      drift.reasoning ? `${drift.reasoning}\n` : '',
      '\nYour stated identity:\n',
      constitution,
    ];

    if (drift.violatingStatements.length > 0) {
      parts.push('\n## Statements that may have been violated:\n');
      for (const s of drift.violatingStatements) {
        parts.push(`- ${s.text} [${s.category}] weight=${s.weight.toFixed(1)}\n`);
      }
    }

    parts.push(
      '\n## Corrective Instruction\n',
      `Re-align with the above constitution. ${drift.level === 'critical' ? 'This is a critical violation — stop immediately and correct.' : 'Gently correct course.'}\n`
    );

    return parts.join('');
  }

  /**
   * Get the auto-inject setting.
   */
  shouldAutoInject(): boolean {
    return this.autoInject;
  }

  /**
   * Set the auto-inject setting.
   */
  setAutoInject(value: boolean): void {
    this.autoInject = value;
  }
}

// ============================================================================
// ReMEM Identity — unified identity system combining all three components
// ============================================================================

export interface IdentitySystem {
  constitution: ConstitutionManager;
  detector: DriftDetector;
  injector: ConstitutionInjector;
}

export function createIdentitySystem(config?: IdentityConfig): IdentitySystem {
  const constitution = new ConstitutionManager(config);
  const detector = new DriftDetector(constitution, config);
  const injector = new ConstitutionInjector(constitution, config?.autoInject ?? true);

  return { constitution, detector, injector };
}
