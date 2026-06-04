export interface RpcClientOptions {
  safeEnabled?: boolean;
  warnOnUnsafe?: boolean;
  requireSafeHeader?: boolean;
  maxSerializationDepth?: number;
  maxDeserializationDepth?: number;
  fetch?: typeof fetch;
  fetchOptions?: RequestInit;
}

export interface RpcBatchRequest {
  method: string;
  params?: unknown;
  id?: string | number | null;
}

export class RpcError extends Error {
  code?: number;
  data?: unknown;
  constructor(error: { code?: number; message?: string; data?: unknown });
}

export class RpcHttpError extends Error {
  status: number;
  statusText: string;
  body: unknown;
}

export class RpcClient {
  constructor(
    endpoint: string,
    defaultHeaders?: Record<string, string>,
    options?: RpcClientOptions
  );

  call<T = unknown>(
    method: string,
    params?: unknown,
    id?: string | number | null,
    overrideHeaders?: Record<string, string>
  ): Promise<T>;

  notify(
    method: string,
    params?: unknown,
    overrideHeaders?: Record<string, string>
  ): Promise<void>;

  batch<T = unknown>(
    requests: RpcBatchRequest[],
    overrideHeaders?: Record<string, string>
  ): Promise<T[]>;

  serializeBigIntsAndDates(value: unknown): unknown;
  deserializeBigIntsAndDates(
    value: unknown,
    options?: { safeEnabled?: boolean }
  ): unknown;
}

export class RpcSafeClient extends RpcClient {}

export default RpcClient;
