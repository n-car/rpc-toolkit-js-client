# Examples

These examples show how to use `rpc-toolkit-js-client` from Node.js and from the browser.

## Start The Local Example Server

From the repository root:

```bash
npm install
npm run build
npm run example:server
```

The server listens on:

```text
http://localhost:8080
```

It exposes a JSON-RPC endpoint at:

```text
http://localhost:8080/rpc
```

Implemented example methods:

- `ping`
- `echo`
- `types`
- `sumArray`
- `domainError`
- `notify.record`
- `notify.stats`
- `notify.reset`

The server supports standard JSON-RPC 2.0 and RPC Toolkit Safe Mode through the `X-RPC-Safe-Enabled` header.

## Node Client

In another terminal:

```bash
npm run example:node
```

Or pass a custom endpoint:

```bash
node examples/node-client.mjs http://localhost:8080/rpc
```

The Node example covers:

- standard JSON-RPC calls;
- Safe Mode calls;
- marker-like strings beginning with `S:` and `D:`;
- ISO date strings;
- BigInt marker strings;
- batch requests;
- notifications;
- custom JSON-RPC errors with `error.data`.

## Browser Module Example

Start the local example server and open:

```text
http://localhost:8080/examples/browser-module.html
```

This page imports the ESM bundle from `dist/rpc-client.mjs`.

## Browser Global Example

Start the local example server and open:

```text
http://localhost:8080/examples/browser-global.html
```

This page loads the browser global bundle from `dist/rpc-client.min.js`.
