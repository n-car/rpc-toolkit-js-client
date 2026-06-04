# RPC Toolkit JS Client

Shared JavaScript client for RPC Toolkit JSON-RPC 2.0 endpoints.

It is the browser/Node client used by toolkit implementations such as `rpc-express-toolkit` and `rpc-dotnet-toolkit`.

## Install

```bash
npm install rpc-toolkit-js-client
```

Requires Node.js 18+ when used outside the browser.

## Node

```js
const { RpcClient } = require('rpc-toolkit-js-client');

const client = new RpcClient('http://localhost:3000/rpc');
const result = await client.call('math.add', { a: 2, b: 3 });
```

## Browser Module

```html
<script type="module">
  import { RpcClient } from '/vendor/rpc-client/rpc-client.mjs';

  const client = new RpcClient('/rpc');
  const status = await client.call('tray.status');
</script>
```

## Browser Global

```html
<script src="/vendor/rpc-client/rpc-client.js"></script>
<script>
  const client = new RpcToolkitClient.RpcClient('/rpc');
</script>
```

## Safe Mode

Safe Mode adds explicit prefixes for ambiguous types:

- strings: `S:value`
- dates: `D:2026-01-02T03:04:05.000Z`
- bigints: `9007199254740993n`

```js
const { RpcSafeClient } = require('rpc-toolkit-js-client');

const client = new RpcSafeClient('http://localhost:3000/rpc');
```

The client sends `X-RPC-Safe-Enabled` on every request and reads the same header from responses to deserialize results correctly.

## API

- `new RpcClient(endpoint, headers?, options?)`
- `client.call(method, params?, id?, headers?)`
- `client.batch([{ method, params, id }], headers?)`
- `client.notify(method, params?, headers?)`
- `new RpcSafeClient(endpoint, headers?, options?)`

Options:

- `safeEnabled`: enable Safe Mode serialization.
- `warnOnUnsafe`: show warnings for ambiguous values in standard mode.
- `requireSafeHeader`: when Safe Mode is enabled, require server compatibility header. Defaults to `true`.
- `fetch`: custom fetch implementation for tests or non-standard runtimes.
- `fetchOptions`: extra options merged into each fetch call.
