import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import { RpcClient, RpcError, RpcSafeClient } from '../src/index.mjs';

describe('RpcClient', () => {
  it('sends JSON-RPC envelope and safe header', async () => {
    const fetchCalls = [];
    const client = new RpcClient('http://localhost/rpc', {}, {
      fetch: fakeFetch(fetchCalls, {
        headers: { 'X-RPC-Safe-Enabled': 'false' },
        body: { jsonrpc: '2.0', id: 1, result: 5 },
      }),
      warnOnUnsafe: false,
    });

    const result = await client.call('math.add', { a: 2, b: 3 }, 1);

    assert.equal(result, 5);
    assert.deepEqual(JSON.parse(fetchCalls[0].body), {
      jsonrpc: '2.0',
      method: 'math.add',
      id: 1,
      params: { a: 2, b: 3 },
    });
    assert.equal(fetchCalls[0].headers['X-RPC-Safe-Enabled'], 'false');
  });

  it('serializes and deserializes safe strings, dates, and bigints', () => {
    const client = new RpcClient('http://localhost/rpc', {}, {
      fetch: fakeFetch(),
      safeEnabled: true,
      warnOnUnsafe: false,
    });

    const serialized = client.serializeBigIntsAndDates({
      text: '42n',
      date: new Date('2026-01-02T03:04:05.000Z'),
      value: 9007199254740993n,
    });

    assert.deepEqual(serialized, {
      text: 'S:42n',
      date: 'D:2026-01-02T03:04:05.000Z',
      value: '9007199254740993n',
    });

    const deserialized = client.deserializeBigIntsAndDates(serialized, {
      safeEnabled: true,
    });

    assert.equal(deserialized.text, '42n');
    assert.equal(deserialized.date.toISOString(), '2026-01-02T03:04:05.000Z');
    assert.equal(deserialized.value, 9007199254740993n);
  });

  it('uses response safe header for deserialization', async () => {
    const client = new RpcClient('http://localhost/rpc', {}, {
      fetch: fakeFetch([], {
        headers: { 'X-RPC-Safe-Enabled': 'true' },
        body: {
          jsonrpc: '2.0',
          id: 1,
          result: {
            text: 'S:hello',
            date: 'D:2026-01-02T03:04:05.000Z',
          },
        },
      }),
      safeEnabled: false,
      warnOnUnsafe: false,
    });

    const result = await client.call('echo', undefined, 1);

    assert.equal(result.text, 'hello');
    assert.equal(result.date.toISOString(), '2026-01-02T03:04:05.000Z');
  });

  it('requires compatibility header when safe client is strict', async () => {
    const client = new RpcSafeClient('http://localhost/rpc', {}, {
      fetch: fakeFetch([], {
        headers: {},
        body: { jsonrpc: '2.0', id: 1, result: 'S:ok' },
      }),
      warnOnUnsafe: false,
    });

    await assert.rejects(
      () => client.call('echo', undefined, 1),
      /X-RPC-Safe-Enabled/
    );
  });

  it('handles batch responses and RPC errors', async () => {
    const client = new RpcClient('http://localhost/rpc', {}, {
      fetch: fakeFetch([], {
        headers: { 'X-RPC-Safe-Enabled': 'false' },
        body: [
          { jsonrpc: '2.0', id: 1, result: 5 },
          { jsonrpc: '2.0', id: 2, result: 'ok' },
        ],
      }),
      warnOnUnsafe: false,
    });

    const result = await client.batch([
      { method: 'math.add', params: { a: 2, b: 3 }, id: 1 },
      { method: 'echo', params: { text: 'ok' }, id: 2 },
    ]);

    assert.deepEqual(result, [5, 'ok']);

    const failing = new RpcClient('http://localhost/rpc', {}, {
      fetch: fakeFetch([], {
        headers: { 'X-RPC-Safe-Enabled': 'false' },
        body: { jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Nope' } },
      }),
      warnOnUnsafe: false,
    });

    await assert.rejects(() => failing.call('missing', undefined, 1), RpcError);
  });

  it('exposes built CJS exports', async () => {
    const require = createRequire(import.meta.url);
    const cjs = require('../dist/rpc-client.cjs');

    assert.equal(typeof cjs.RpcClient, 'function');
    assert.equal(typeof cjs.RpcSafeClient, 'function');
  });
});

function fakeFetch(calls = [], response = null) {
  return async (_url, options) => {
    calls.push(options);
    const nextResponse =
      response || {
        headers: { 'X-RPC-Safe-Enabled': 'false' },
        body: { jsonrpc: '2.0', id: 1, result: null },
      };

    return {
      ok: nextResponse.ok !== false,
      status: nextResponse.status || 200,
      statusText: nextResponse.statusText || 'OK',
      headers: {
        get(name) {
          const entry = Object.entries(nextResponse.headers || {}).find(
            ([key]) => key.toLowerCase() === name.toLowerCase()
          );
          return entry ? entry[1] : null;
        },
      },
      async text() {
        return nextResponse.body == null ? '' : JSON.stringify(nextResponse.body);
      },
    };
  };
}
