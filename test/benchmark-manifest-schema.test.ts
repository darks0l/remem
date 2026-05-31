/**
 * ReMEM - benchmark manifest schema contract coverage
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../benchmarks/PUBLIC-RESULTS-2026-05-03.json';
import schema from '../benchmarks/public-results.schema.json';

type ValidationIssue = {
  path: string;
  message: string;
};

function validate(value: unknown, node: any, currentPath = '$'): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (node.type === 'null') {
    if (value !== null) {
      issues.push({ path: currentPath, message: 'must be null' });
    }
    return issues;
  }

  if (node.oneOf) {
    const branchMatches = node.oneOf.filter((branch: any) => validate(value, branch, currentPath).length === 0);
    if (branchMatches.length !== 1) {
      issues.push({ path: currentPath, message: 'must match exactly one schema branch' });
    }
    return issues;
  }

  if (node.$ref) {
    const refPath = String(node.$ref);
    const refNode = refPath
      .replace(/^#\//, '')
      .split('/')
      .reduce((acc: any, segment: string) => acc?.[segment], schema);
    if (!refNode) {
      issues.push({ path: currentPath, message: `unresolved ref ${refPath}` });
      return issues;
    }
    return validate(value, refNode, currentPath);
  }

  if (Object.prototype.hasOwnProperty.call(node, 'const') && value !== node.const) {
    issues.push({ path: currentPath, message: `must equal ${JSON.stringify(node.const)}` });
    return issues;
  }

  if (value === null) {
    if (node.type && node.type !== 'null') {
      issues.push({ path: currentPath, message: `must be ${node.type}` });
    }
    return issues;
  }

  switch (node.type) {
    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        issues.push({ path: currentPath, message: 'must be object' });
        return issues;
      }
      const record = value as Record<string, unknown>;
      for (const key of node.required ?? []) {
        if (!(key in record)) {
          issues.push({ path: currentPath, message: `missing required property ${key}` });
        }
      }
      if (node.additionalProperties === false && node.properties) {
        for (const key of Object.keys(record)) {
          if (!Object.prototype.hasOwnProperty.call(node.properties, key)) {
            issues.push({ path: `${currentPath}.${key}`, message: 'unexpected property' });
          }
        }
      }
      for (const [key, childSchema] of Object.entries(node.properties ?? {})) {
        if (key in record) {
          issues.push(...validate(record[key], childSchema, `${currentPath}.${key}`));
        }
      }
      return issues;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        issues.push({ path: currentPath, message: 'must be array' });
        return issues;
      }
      if (typeof node.minItems === 'number' && value.length < node.minItems) {
        issues.push({ path: currentPath, message: `must contain at least ${node.minItems} items` });
      }
      value.forEach((item, index) => {
        issues.push(...validate(item, node.items, `${currentPath}[${index}]`));
      });
      return issues;
    }
    case 'string': {
      if (typeof value !== 'string') {
        issues.push({ path: currentPath, message: 'must be string' });
        return issues;
      }
      if (typeof node.minLength === 'number' && value.length < node.minLength) {
        issues.push({ path: currentPath, message: `must have length >= ${node.minLength}` });
      }
      if (node.pattern && !(new RegExp(node.pattern).test(value))) {
        issues.push({ path: currentPath, message: `must match ${node.pattern}` });
      }
      if (node.format === 'date-time' && Number.isNaN(Date.parse(value))) {
        issues.push({ path: currentPath, message: 'must be a valid date-time' });
      }
      return issues;
    }
    case 'integer':
    case 'number': {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        issues.push({ path: currentPath, message: 'must be number' });
        return issues;
      }
      if (node.type === 'integer' && !Number.isInteger(value)) {
        issues.push({ path: currentPath, message: 'must be integer' });
      }
      if (typeof node.minimum === 'number' && value < node.minimum) {
        issues.push({ path: currentPath, message: `must be >= ${node.minimum}` });
      }
      return issues;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        issues.push({ path: currentPath, message: 'must be boolean' });
      }
      return issues;
    }
    default:
      return issues;
  }
}

describe('benchmark manifest schema', () => {
  it('ships a checked-in schema for downstream consumers', () => {
    const schemaPath = path.resolve(__dirname, '..', 'benchmarks', 'public-results.schema.json');
    const rawSchema = readFileSync(schemaPath, 'utf8');

    expect(path.basename(schemaPath)).toBe('public-results.schema.json');
    expect(rawSchema).toContain('"title": "ReMEM public benchmark results manifest"');
    expect(schema.$id).toContain('PUBLIC-RESULTS.schema.json');
  });

  it('validates the checked-in benchmark manifest against the published schema', () => {
    const issues = validate(manifest, schema);
    expect(issues).toEqual([]);
    expect(manifest.$schema).toBe('./PUBLIC-RESULTS.schema.json');
    expect(manifest.schemaVersion).toBe(1);
  });
});
