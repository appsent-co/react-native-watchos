// Language / scheduling globals Hermes (as built for watchOS) lacks. Each is
// feature-detected so the module is a no-op where the real thing exists.

const g = globalThis as {
  queueMicrotask?: (callback: () => void) => void;
};

// Without `Symbol.asyncIterator`, Babel's `_asyncIterator` helper behind
// every `for await` throws. The registered symbol is what a bundle compiled
// elsewhere looks up, and what Expo's runtime setup installs too.
const SymbolWithAsyncIterator = Symbol as { asyncIterator?: symbol };
if (typeof SymbolWithAsyncIterator.asyncIterator !== 'symbol') {
  SymbolWithAsyncIterator.asyncIterator = Symbol.for('Symbol.asyncIterator');
}

if (typeof g.queueMicrotask !== 'function') {
  g.queueMicrotask = function queueMicrotask(callback: () => void): void {
    if (typeof callback !== 'function') {
      throw new TypeError(
        'queueMicrotask must be called with a function as the first argument'
      );
    }
    Promise.resolve().then(callback);
  };
}

export {};
