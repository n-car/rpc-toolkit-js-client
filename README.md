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
const { RpcClient, RpcSafeClient } = require('rpc-toolkit-js-client');

const client = new RpcClient('http://localhost:3000/rpc');
const result = await client.call('math.add', { a: 2, b: 3 });

const safeClient = new RpcSafeClient('http://localhost:3000/rpc');
const status = await safeClient.call('tray.status');
```

## Browser Module

```html
<script type="module">
  import { RpcClient, RpcSafeClient } from '/vendor/rpc-client/rpc-client.mjs';

  const client = new RpcClient('/rpc');
  const status = await client.call('tray.status');

  const safeClient = new RpcSafeClient('/rpc');
  await safeClient.notify('tray.opened');
</script>
```

## Browser Global

```html
<script src="/vendor/rpc-client/rpc-client.min.js"></script>
<script>
  const client = new RpcToolkitClient.RpcClient('/rpc');
  const safeClient = new RpcToolkitClient.RpcSafeClient('/rpc');

  client.call('tray.status').then((status) => {
    console.log(status);
  });
</script>
```

## Examples

Runnable examples are available in [`examples/`](examples/):

- `mock-server.mjs` - dependency-free local JSON-RPC endpoint for examples.
- `node-client.mjs` - Node.js client covering standard JSON-RPC and Safe Mode.
- `browser-module.html` - browser example using the ESM bundle.
- `browser-global.html` - browser example using the global browser bundle.

```bash
npm install
npm run build
npm run example:server
npm run example:node
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

Notifications are sent without an `id`, as required by JSON-RPC 2.0. A valid empty `204` response is accepted, including for `RpcSafeClient`.

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
- `maxSerializationDepth`: maximum nested depth before serialization fails. Defaults to `100`.
- `maxDeserializationDepth`: maximum nested depth before deserialization fails. Defaults to `100`.

Serialization and deserialization detect circular references and keep `__proto__` keys as inert own properties.

## License

MIT. See [LICENSE](LICENSE).
