import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';

const TOKEN = 'x'.repeat(32);

describe('loadConfig', () => {
  it('parses required and default values', () => {
    const c = loadConfig({ DATABASE_URL: 'postgres://u:p@localhost:5432/db', TABULA_TOKEN: TOKEN });
    expect(c).toEqual({
      databaseUrl: 'postgres://u:p@localhost:5432/db',
      token: TOKEN,
      connectorSecret: undefined,
      port: 3000,
      host: '0.0.0.0',
      webDist: 'web/dist',
    });
  });

  it('rejects a short token', () => {
    expect(() => loadConfig({ DATABASE_URL: 'postgres://x', TABULA_TOKEN: 'short' })).toThrow(/TABULA_TOKEN/);
  });

  it('treats an empty connector secret as unset', () => {
    const c = loadConfig({ DATABASE_URL: 'postgres://x', TABULA_TOKEN: TOKEN, TABULA_CONNECTOR_SECRET: '' });
    expect(c.connectorSecret).toBeUndefined();
  });

  it('rejects a short connector secret', () => {
    expect(() =>
      loadConfig({ DATABASE_URL: 'postgres://x', TABULA_TOKEN: TOKEN, TABULA_CONNECTOR_SECRET: 'abc' }),
    ).toThrow(/TABULA_CONNECTOR_SECRET/);
  });
});
