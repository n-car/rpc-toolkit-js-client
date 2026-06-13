import { RpcClient, RpcError, RpcSafeClient } from '../src/index.mjs';

const endpoint = process.argv[2] || 'http://localhost:8080/rpc';

console.log(`Using endpoint: ${endpoint}`);

const standardClient = new RpcClient(endpoint, {}, { warnOnUnsafe: false });
const safeClient = new RpcSafeClient(endpoint, {}, { warnOnUnsafe: false });

const standardPing = await standardClient.call('ping');
console.log('standard ping:', standardPing);

const safePing = await safeClient.call('ping');
console.log('safe ping:', safePing);

const echo = await safeClient.call('echo', {
  safePrefix: 'S:literal',
  datePrefix: 'D:literal',
  bigintLikeString: '9007199254740993n',
  nested: {
    array: ['S:nested', 'D:nested', '9007199254740994n'],
  },
});
console.log('safe echo:', echo);

const types = await safeClient.call('types');
console.log('types:', {
  plain: types.plain,
  safePrefix: types.safePrefix,
  isoDateString: types.isoDateString,
  dateValue: types.dateValue instanceof Date ? types.dateValue.toISOString() : types.dateValue,
  bigintValue: types.bigintValue.toString(),
});

const batch = await safeClient.batch([
  { method: 'ping', id: 1 },
  { method: 'sumArray', params: [1, 2, 3], id: 2 },
]);
console.log('batch:', batch);

await safeClient.call('notify.reset');
await safeClient.notify('notify.record', {
  eventName: 'node-client-example',
  seq: 1,
});
const stats = await safeClient.call('notify.stats');
console.log('notification stats:', stats);

try {
  await safeClient.call('domainError');
} catch (error) {
  if (!(error instanceof RpcError)) {
    throw error;
  }

  console.log('domain error:', {
    code: error.code,
    message: error.message,
    data: error.data,
  });
}

console.log('Example completed.');
