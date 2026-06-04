const SAFE_HEADER = 'X-RPC-Safe-Enabled';
const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

export class RpcError extends Error {
  constructor(error) {
    super(error?.message || 'RPC error');
    this.name = 'RpcError';
    this.code = error?.code;
    this.data = error?.data;
  }
}

export class RpcHttpError extends Error {
  constructor(response, body) {
    super(`HTTP Error: ${response.status} ${response.statusText}`);
    this.name = 'RpcHttpError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.body = body;
  }
}

export class RpcClient {
  #endpoint;
  #defaultHeaders;
  #fetch;
  #fetchOptions;
  #options;
  #requestId;

  constructor(endpoint, defaultHeaders = {}, options = {}) {
    if (!endpoint || typeof endpoint !== 'string') {
      throw new TypeError('endpoint must be a non-empty string');
    }

    const fetchImpl = options.fetch || globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
      throw new Error('fetch is not available. Use Node.js 18+ or pass options.fetch.');
    }

    this.#endpoint = endpoint;
    this.#defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
    this.#fetch = fetchImpl.bind(globalThis);
    this.#fetchOptions = options.fetchOptions || {};
    this.#options = {
      safeEnabled: options.safeEnabled === true,
      warnOnUnsafe: options.warnOnUnsafe !== false,
      requireSafeHeader: options.requireSafeHeader !== false,
    };
    this.#requestId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  }

  async call(method, params = undefined, id = undefined, overrideHeaders = {}) {
    const requestId = id === undefined ? this.#nextId() : id;
    const request = this.#createRequest(method, params, requestId);
    const response = await this.#postJson(request, overrideHeaders);

    if (response.body == null) {
      return undefined;
    }

    if (response.body.error) {
      throw new RpcError(response.body.error);
    }

    return this.deserializeBigIntsAndDates(response.body.result, {
      safeEnabled: response.safeEnabled,
    });
  }

  async notify(method, params = undefined, overrideHeaders = {}) {
    await this.call(method, params, null, overrideHeaders);
  }

  async batch(requests, overrideHeaders = {}) {
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new TypeError('batch requests must be a non-empty array');
    }

    const payload = requests.map((request) =>
      this.#createRequest(
        request.method,
        request.params,
        request.id === undefined ? this.#nextId() : request.id
      )
    );

    const response = await this.#postJson(payload, overrideHeaders);
    if (response.body == null) {
      return [];
    }

    const body = Array.isArray(response.body) ? response.body : [response.body];
    return body.map((item) => {
      if (item.error) {
        throw new RpcError(item.error);
      }

      return this.deserializeBigIntsAndDates(item.result, {
        safeEnabled: response.safeEnabled,
      });
    });
  }

  serializeBigIntsAndDates(value) {
    if (typeof value === 'bigint') {
      return `${value.toString()}n`;
    }

    if (value instanceof Date) {
      const isoString = value.toISOString();
      if (this.#options.safeEnabled) {
        return `D:${isoString}`;
      }

      this.#warn(
        'Date serialization: using plain ISO string format. Enable safeEnabled for explicit date round-trips.'
      );
      return isoString;
    }

    if (typeof value === 'string') {
      if (this.#options.safeEnabled) {
        return `S:${value}`;
      }

      if (/^-?\d+n?$/.test(value)) {
        this.#warn(
          `String serialization: "${value}" can be confused with a BigInt. Enable safeEnabled to disambiguate.`
        );
      }
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.serializeBigIntsAndDates(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          this.serializeBigIntsAndDates(item),
        ])
      );
    }

    return value;
  }

  deserializeBigIntsAndDates(value, options = null) {
    const safeEnabled = options ? options.safeEnabled : this.#options.safeEnabled;

    if (typeof value === 'string') {
      if (safeEnabled && value.startsWith('S:')) {
        return value.substring(2);
      }

      if (safeEnabled && value.startsWith('D:')) {
        const date = new Date(value.substring(2));
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }

      if (/^-?\d+n$/.test(value)) {
        return BigInt(value.slice(0, -1));
      }

      if (!safeEnabled && ISO_DATE_REGEX.test(value)) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.deserializeBigIntsAndDates(item, options));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          this.deserializeBigIntsAndDates(item, options),
        ])
      );
    }

    return value;
  }

  #nextId() {
    return ++this.#requestId;
  }

  #createRequest(method, params, id) {
    if (!method || typeof method !== 'string') {
      throw new TypeError('method must be a non-empty string');
    }

    const request = {
      jsonrpc: '2.0',
      method,
      id,
    };

    if (params !== undefined && params !== null) {
      request.params = this.serializeBigIntsAndDates(params);
    }

    return request;
  }

  async #postJson(payload, overrideHeaders) {
    const response = await this.#fetch(this.#endpoint, {
      method: 'POST',
      headers: {
        ...this.#defaultHeaders,
        [SAFE_HEADER]: this.#options.safeEnabled ? 'true' : 'false',
        ...overrideHeaders,
      },
      body: JSON.stringify(payload),
      ...this.#fetchOptions,
    });

    const body = await readJsonBody(response);
    if (!response.ok) {
      throw new RpcHttpError(response, body);
    }

    const safeHeader = response.headers?.get?.(SAFE_HEADER);
    if (this.#options.safeEnabled && safeHeader == null && this.#options.requireSafeHeader) {
      throw new Error(
        'RPC Compatibility Error: client safeEnabled=true but the server did not return X-RPC-Safe-Enabled.'
      );
    }

    if (!this.#options.safeEnabled && safeHeader === 'true') {
      this.#warn(
        'RPC Compatibility Notice: server supports safe serialization but client safeEnabled=false.'
      );
    }

    return {
      body,
      safeEnabled: safeHeader === 'true',
    };
  }

  #warn(message) {
    if (this.#options.warnOnUnsafe) {
      console.warn(message);
    }
  }
}

export class RpcSafeClient extends RpcClient {
  constructor(endpoint, defaultHeaders = {}, options = {}) {
    super(endpoint, defaultHeaders, { ...options, safeEnabled: true });
  }
}

async function readJsonBody(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  return JSON.parse(text);
}

export default RpcClient;
