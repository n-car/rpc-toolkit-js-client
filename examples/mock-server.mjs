import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = normalize(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 8080);
const notifications = [];

const server = createServer(async (req, res) => {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    if (req.method === 'POST' && req.url === '/rpc') {
      await handleRpc(req, res);
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      await serveStatic(req, res);
      return;
    }

    writeText(res, 405, 'Method not allowed');
  } catch (error) {
    writeJson(res, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`RPC Toolkit JS client example server listening on http://localhost:${port}`);
  console.log(`JSON-RPC endpoint: http://localhost:${port}/rpc`);
  console.log(`Browser module example: http://localhost:${port}/examples/browser-module.html`);
  console.log(`Browser global example: http://localhost:${port}/examples/browser-global.html`);
});

async function handleRpc(req, res) {
  const rawBody = await readBody(req);
  const payload = JSON.parse(rawBody);
  const safeEnabled = req.headers['x-rpc-safe-enabled'] === 'true';
  const safeHeader = safeEnabled ? 'true' : 'false';

  const headers = {
    'Content-Type': 'application/json',
    'X-RPC-Safe-Enabled': safeHeader,
  };

  if (Array.isArray(payload)) {
    const responses = payload
      .map((request) => executeRequest(request, safeEnabled))
      .filter(Boolean);

    if (responses.length === 0) {
      res.writeHead(204, headers).end();
      return;
    }

    writeJson(res, 200, responses, headers);
    return;
  }

  const response = executeRequest(payload, safeEnabled);
  if (!response) {
    res.writeHead(204, headers).end();
    return;
  }

  writeJson(res, 200, response, headers);
}

function executeRequest(request, safeEnabled) {
  if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
    return {
      jsonrpc: '2.0',
      id: request?.id ?? null,
      error: {
        code: -32600,
        message: 'Invalid Request',
      },
    };
  }

  const id = request.id;
  const isNotification = id === undefined;

  try {
    const result = invokeMethod(request.method, request.params, safeEnabled);
    if (isNotification) {
      return null;
    }

    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  } catch (error) {
    if (isNotification) {
      return null;
    }

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: error.code || -32603,
        message: error.message || 'Internal error',
        ...(error.data === undefined ? {} : { data: error.data }),
      },
    };
  }
}

function invokeMethod(method, params, safeEnabled) {
  switch (method) {
    case 'ping':
      return safeString('pong', safeEnabled);

    case 'echo':
      return params ?? null;

    case 'types':
      return {
        plain: safeString('hello', safeEnabled),
        safePrefix: safeString('S:literal', safeEnabled),
        datePrefix: safeString('D:literal', safeEnabled),
        isoDateString: safeString('2026-06-10T12:34:56.000Z', safeEnabled),
        dateValue: safeEnabled ? 'D:2026-06-10T12:34:56.000Z' : '2026-06-10T12:34:56.000Z',
        bigintValue: '9007199254740993n',
        arrayValue: [1, safeString('S:nested', safeEnabled), '9007199254740994n'],
      };

    case 'sumArray':
      return Array.isArray(params)
        ? params.reduce((total, value) => total + Number(value || 0), 0)
        : 0;

    case 'notify.record':
      notifications.push({
        params,
        receivedAt: new Date().toISOString(),
      });
      return {
        recorded: true,
        count: notifications.length,
      };

    case 'notify.stats':
      return {
        count: notifications.length,
        last: notifications[notifications.length - 1] || null,
      };

    case 'notify.reset':
      notifications.length = 0;
      return { count: 0 };

    case 'domainError': {
      const error = new Error('Domain failure from JS client example server');
      error.code = -32042;
      error.data = {
        reason: safeString('intentional-test-error', safeEnabled),
        markerString: safeString('S:error-data-literal', safeEnabled),
        dateString: safeString('D:error-data-literal', safeEnabled),
        isoDateString: safeString('2026-06-10T12:34:56.000Z', safeEnabled),
        dateValue: safeEnabled ? 'D:2026-06-10T12:34:56.000Z' : '2026-06-10T12:34:56.000Z',
        bigintValue: '9007199254740993n',
      };
      throw error;
    }

    default: {
      const error = new Error(`Method not found: ${method}`);
      error.code = -32601;
      throw error;
    }
  }
}

function safeString(value, safeEnabled) {
  return safeEnabled ? `S:${value}` : value;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname === '/' ? '/examples/browser-module.html' : url.pathname;
  const relativePath = pathname.replace(/^\/+/, '');
  const filePath = normalize(join(rootDir, relativePath));

  if (!filePath.startsWith(rootDir)) {
    writeText(res, 403, 'Forbidden');
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType(filePath),
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    writeText(res, 404, 'Not found');
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RPC-Safe-Enabled');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function writeJson(res, status, value, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...headers,
  });
  res.end(JSON.stringify(value, null, 2));
}

function writeText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end(text);
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8';
    case '.map':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}
