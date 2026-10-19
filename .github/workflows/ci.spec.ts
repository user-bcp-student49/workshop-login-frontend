import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../../vitest.config';

const readWorkflow = (name: string) =>
  readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const workflow = readWorkflow('ci.yml');
const setup = `    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '22.22.0'
          cache: npm
      - run: npm ci
`;

describe('CI gate contract (exact workflow text, not a GitHub runner)', () => {
  it('preserves events and read-only permissions', () => {
    expect(workflow.split('jobs:\n')[0]).toBe(`name: Frontend CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

`);
  });

  it('runs coverage and build without failure suppression', () => {
    const job = workflow.split('  build-test:\n')[1]?.split('  audit:\n')[0];
    expect(job).toBe(setup + `      - run: npm run test:coverage
      - run: npm run build
`);
  });

  it('runs audit in an independent job without failure suppression', () => {
    expect(workflow.split('  audit:\n')[1]).toBe(setup + '      - run: npm run audit:workshop\n');
    expect(workflow).not.toMatch(/continue-on-error|needs:|--omit|--audit-level|--force|\|\|/);
  });

  it('preserves moderate audit and the 85 percent per-file coverage gate', () => {
    const manifest: unknown = JSON.parse(readWorkflow('../../package.json'));
    expect(manifest).toMatchObject({
      scripts: {
        'test:coverage': 'vitest run --coverage',
        'audit:workshop': 'npm audit --audit-level=moderate'
      }
    });
    expect(config).toMatchObject({
      test: {
        coverage: {
          thresholds: { perFile: true, lines: 85, statements: 85, functions: 85, branches: 85 }
        }
      }
    });
  });

  it('preserves CodeQL triggers, permissions and security-and-quality queries', () => {
    expect(readWorkflow('codeql.yml')).toBe(`name: CodeQL

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '31 3 * * 1'

permissions:
  security-events: write
  packages: read
  contents: read

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: github/codeql-action/init@v4
        with:
          languages: javascript-typescript
          queries: security-and-quality
      - uses: github/codeql-action/analyze@v4
`);
  });

  it('preserves dependency review severity and permissions', () => {
    expect(readWorkflow('dependency-review.yml')).toBe(`name: Dependency Review

on:
  pull_request:

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
`);
  });
});
