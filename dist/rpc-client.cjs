var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});

// src/index.mjs
var index_exports = {};
__export(index_exports, {
  RpcClient: () => RpcClient,
  RpcError: () => RpcError,
  RpcHttpError: () => RpcHttpError,
  RpcSafeClient: () => RpcSafeClient,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var SAFE_HEADER = "X-RPC-Safe-Enabled";
var DEFAULT_MAX_SERIALIZATION_DEPTH = 100;
var ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
var RpcError = class extends Error {
  constructor(error) {
    super(error?.message || "RPC error");
    this.name = "RpcError";
    this.code = error?.code;
    this.data = error?.data;
  }
};
var RpcHttpError = class extends Error {
  constructor(response, body) {
    super(`HTTP Error: ${response.status} ${response.statusText}`);
    this.name = "RpcHttpError";
    this.status = response.status;
    this.statusText = response.statusText;
    this.body = body;
  }
};
var _endpoint, _defaultHeaders, _fetch, _fetchOptions, _options, _requestId, _RpcClient_instances, serializeValue_fn, nextId_fn, createRequest_fn, postJson_fn, warn_fn;
var RpcClient = class {
  constructor(endpoint, defaultHeaders = {}, options = {}) {
    __privateAdd(this, _RpcClient_instances);
    __privateAdd(this, _endpoint);
    __privateAdd(this, _defaultHeaders);
    __privateAdd(this, _fetch);
    __privateAdd(this, _fetchOptions);
    __privateAdd(this, _options);
    __privateAdd(this, _requestId);
    if (!endpoint || typeof endpoint !== "string") {
      throw new TypeError("endpoint must be a non-empty string");
    }
    const fetchImpl = options.fetch || globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new Error("fetch is not available. Use Node.js 18+ or pass options.fetch.");
    }
    __privateSet(this, _endpoint, endpoint);
    __privateSet(this, _defaultHeaders, {
      "Content-Type": "application/json",
      ...defaultHeaders
    });
    __privateSet(this, _fetch, fetchImpl.bind(globalThis));
    __privateSet(this, _fetchOptions, options.fetchOptions || {});
    __privateSet(this, _options, {
      safeEnabled: options.safeEnabled === true,
      warnOnUnsafe: options.warnOnUnsafe !== false,
      requireSafeHeader: options.requireSafeHeader !== false,
      maxSerializationDepth: normalizeDepthLimit(options.maxSerializationDepth),
      maxDeserializationDepth: normalizeDepthLimit(options.maxDeserializationDepth)
    });
    __privateSet(this, _requestId, Date.now() * 1e3 + Math.floor(Math.random() * 1e3));
  }
  async call(method, params = void 0, id = void 0, overrideHeaders = {}) {
    const requestId = id === void 0 ? __privateMethod(this, _RpcClient_instances, nextId_fn).call(this) : id;
    const request = __privateMethod(this, _RpcClient_instances, createRequest_fn).call(this, method, params, requestId);
    const response = await __privateMethod(this, _RpcClient_instances, postJson_fn).call(this, request, overrideHeaders);
    if (response.body == null) {
      return void 0;
    }
    if (response.body.error) {
      throw new RpcError(response.body.error);
    }
    return this.deserializeBigIntsAndDates(response.body.result, {
      safeEnabled: response.safeEnabled
    });
  }
  async notify(method, params = void 0, overrideHeaders = {}) {
    const request = __privateMethod(this, _RpcClient_instances, createRequest_fn).call(this, method, params);
    await __privateMethod(this, _RpcClient_instances, postJson_fn).call(this, request, overrideHeaders, {
      requireSafeHeader: false
    });
  }
  async batch(requests, overrideHeaders = {}) {
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new TypeError("batch requests must be a non-empty array");
    }
    const payload = requests.map(
      (request) => __privateMethod(this, _RpcClient_instances, createRequest_fn).call(this, request.method, request.params, request.id === void 0 ? __privateMethod(this, _RpcClient_instances, nextId_fn).call(this) : request.id)
    );
    const response = await __privateMethod(this, _RpcClient_instances, postJson_fn).call(this, payload, overrideHeaders);
    if (response.body == null) {
      return [];
    }
    const body = Array.isArray(response.body) ? response.body : [response.body];
    return body.map((item) => {
      if (item.error) {
        throw new RpcError(item.error);
      }
      return this.deserializeBigIntsAndDates(item.result, {
        safeEnabled: response.safeEnabled
      });
    });
  }
  serializeBigIntsAndDates(value) {
    return __privateMethod(this, _RpcClient_instances, serializeValue_fn).call(this, value, {
      depth: 0,
      seen: /* @__PURE__ */ new WeakSet()
    });
  }
  deserializeBigIntsAndDates(value, options = null, state = null) {
    const safeEnabled = options ? options.safeEnabled : __privateGet(this, _options).safeEnabled;
    const traversalState = state || {
      depth: 0,
      seen: /* @__PURE__ */ new WeakSet()
    };
    if (traversalState.depth > __privateGet(this, _options).maxDeserializationDepth) {
      throw new Error("Deserialization depth limit exceeded");
    }
    if (typeof value === "string") {
      if (safeEnabled && value.startsWith("S:")) {
        return value.substring(2);
      }
      if (safeEnabled && value.startsWith("D:")) {
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
      if (traversalState.seen.has(value)) {
        throw new Error("Circular reference detected during deserialization");
      }
      traversalState.seen.add(value);
      try {
        return value.map(
          (item) => this.deserializeBigIntsAndDates(
            item,
            { safeEnabled },
            {
              depth: traversalState.depth + 1,
              seen: traversalState.seen
            }
          )
        );
      } finally {
        traversalState.seen.delete(value);
      }
    }
    if (value && typeof value === "object") {
      if (traversalState.seen.has(value)) {
        throw new Error("Circular reference detected during deserialization");
      }
      traversalState.seen.add(value);
      const result = {};
      try {
        Object.entries(value).forEach(([key, item]) => {
          Object.defineProperty(result, key, {
            value: this.deserializeBigIntsAndDates(
              item,
              { safeEnabled },
              {
                depth: traversalState.depth + 1,
                seen: traversalState.seen
              }
            ),
            enumerable: true,
            configurable: true,
            writable: true
          });
        });
      } finally {
        traversalState.seen.delete(value);
      }
      return result;
    }
    return value;
  }
};
_endpoint = new WeakMap();
_defaultHeaders = new WeakMap();
_fetch = new WeakMap();
_fetchOptions = new WeakMap();
_options = new WeakMap();
_requestId = new WeakMap();
_RpcClient_instances = new WeakSet();
serializeValue_fn = function(value, state) {
  if (state.depth > __privateGet(this, _options).maxSerializationDepth) {
    throw new Error("Serialization depth limit exceeded");
  }
  if (typeof value === "bigint") {
    return `${value.toString()}n`;
  }
  if (value instanceof Date) {
    const isoString = value.toISOString();
    if (__privateGet(this, _options).safeEnabled) {
      return `D:${isoString}`;
    }
    __privateMethod(this, _RpcClient_instances, warn_fn).call(this, "Date serialization: using plain ISO string format. Enable safeEnabled for explicit date round-trips.");
    return isoString;
  }
  if (typeof value === "string") {
    if (__privateGet(this, _options).safeEnabled) {
      return `S:${value}`;
    }
    if (/^-?\d+n?$/.test(value)) {
      __privateMethod(this, _RpcClient_instances, warn_fn).call(this, `String serialization: "${value}" can be confused with a BigInt. Enable safeEnabled to disambiguate.`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (state.seen.has(value)) {
      throw new Error("Circular reference detected during serialization");
    }
    state.seen.add(value);
    try {
      return value.map(
        (item) => __privateMethod(this, _RpcClient_instances, serializeValue_fn).call(this, item, {
          depth: state.depth + 1,
          seen: state.seen
        })
      );
    } finally {
      state.seen.delete(value);
    }
  }
  if (value && typeof value === "object") {
    if (state.seen.has(value)) {
      throw new Error("Circular reference detected during serialization");
    }
    state.seen.add(value);
    const result = {};
    try {
      Object.entries(value).forEach(([key, item]) => {
        Object.defineProperty(result, key, {
          value: __privateMethod(this, _RpcClient_instances, serializeValue_fn).call(this, item, {
            depth: state.depth + 1,
            seen: state.seen
          }),
          enumerable: true,
          configurable: true,
          writable: true
        });
      });
    } finally {
      state.seen.delete(value);
    }
    return result;
  }
  return value;
};
nextId_fn = function() {
  return ++__privateWrapper(this, _requestId)._;
};
createRequest_fn = function(method, params, id) {
  if (!method || typeof method !== "string") {
    throw new TypeError("method must be a non-empty string");
  }
  const request = {
    jsonrpc: "2.0",
    method
  };
  if (id !== void 0) {
    request.id = id;
  }
  if (params !== void 0 && params !== null) {
    request.params = this.serializeBigIntsAndDates(params);
  }
  return request;
};
postJson_fn = async function(payload, overrideHeaders, options = {}) {
  const response = await __privateGet(this, _fetch).call(this, __privateGet(this, _endpoint), {
    method: "POST",
    headers: {
      ...__privateGet(this, _defaultHeaders),
      [SAFE_HEADER]: __privateGet(this, _options).safeEnabled ? "true" : "false",
      ...overrideHeaders
    },
    body: JSON.stringify(payload),
    ...__privateGet(this, _fetchOptions)
  });
  const body = await readJsonBody(response);
  if (!response.ok) {
    throw new RpcHttpError(response, body);
  }
  const safeHeader = response.headers?.get?.(SAFE_HEADER);
  if (__privateGet(this, _options).safeEnabled && safeHeader == null && __privateGet(this, _options).requireSafeHeader && options.requireSafeHeader !== false) {
    throw new Error(
      "RPC Compatibility Error: client safeEnabled=true but the server did not return X-RPC-Safe-Enabled."
    );
  }
  if (!__privateGet(this, _options).safeEnabled && safeHeader === "true") {
    __privateMethod(this, _RpcClient_instances, warn_fn).call(this, "RPC Compatibility Notice: server supports safe serialization but client safeEnabled=false.");
  }
  return {
    body,
    safeEnabled: safeHeader === "true"
  };
};
warn_fn = function(message) {
  if (__privateGet(this, _options).warnOnUnsafe) {
    console.warn(message);
  }
};
var RpcSafeClient = class extends RpcClient {
  constructor(endpoint, defaultHeaders = {}, options = {}) {
    super(endpoint, defaultHeaders, { ...options, safeEnabled: true });
  }
};
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
function normalizeDepthLimit(value) {
  return Number.isInteger(value) && value >= 0 ? value : DEFAULT_MAX_SERIALIZATION_DEPTH;
}
var index_default = RpcClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RpcClient,
  RpcError,
  RpcHttpError,
  RpcSafeClient
});
