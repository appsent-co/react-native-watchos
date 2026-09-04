// `globalThis.crypto` — `getRandomValues` and `randomUUID` over the host's
// `__RNW_fillRandom` (SecRandomCopyBytes). Native fills in place; this module
// does the Web Crypto validation. Hermes has no DOMException, so the errors
// are plain Errors with `name` set. No `crypto.subtle`. Feature-detected, so
// importing this on a runtime that already has `crypto` is a no-op.

type Fill = (view: ArrayBufferView) => ArrayBufferView;

interface CryptoLike {
  getRandomValues?: unknown;
  randomUUID?: unknown;
}

const g = globalThis as { crypto?: CryptoLike; __RNW_fillRandom?: Fill };

// Web Crypto accepts integer typed arrays only.
const INTEGER_VIEWS: ((new (n: number) => ArrayBufferView) | undefined)[] = [
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  (globalThis as { BigInt64Array?: new (n: number) => ArrayBufferView })
    .BigInt64Array,
  (globalThis as { BigUint64Array?: new (n: number) => ArrayBufferView })
    .BigUint64Array,
];

function named(name: string, message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  const fill = g.__RNW_fillRandom;
  if (typeof fill !== 'function') {
    throw new Error(
      'crypto.getRandomValues: RNWHermesHost did not install __RNW_fillRandom'
    );
  }
  if (
    array == null ||
    !INTEGER_VIEWS.some((C) => C !== undefined && array instanceof C)
  ) {
    throw named(
      'TypeMismatchError',
      'crypto.getRandomValues: expected an integer typed array'
    );
  }
  if (array.byteLength > 65536) {
    throw named(
      'QuotaExceededError',
      'crypto.getRandomValues: cannot request more than 65536 bytes'
    );
  }
  fill(array);
  return array;
}

function randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
  const b = getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  let h = '';
  for (let i = 0; i < 16; i++) h += b[i]!.toString(16).padStart(2, '0');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

if (g.crypto == null) {
  g.crypto = {};
}
if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = getRandomValues;
}
if (typeof g.crypto.randomUUID !== 'function') {
  g.crypto.randomUUID = randomUUID;
}

export {};
