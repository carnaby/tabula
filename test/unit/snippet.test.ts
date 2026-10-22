import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { claudeMdSection } from '../../src/mcp/snippet.js';

describe('claudeMdSection', () => {
  it('equals templates/claude-md-snippet.md', () => {
    const template = readFileSync(new URL('../../templates/claude-md-snippet.md', import.meta.url), 'utf8');
    expect(claudeMdSection('<slug>').trim()).toBe(template.trim());
  });
});
