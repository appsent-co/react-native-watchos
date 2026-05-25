// `whatwg-fetch`'s UMD wrapper picks its install target via
// `typeof self !== 'undefined' ? self : this`. Inside a Hermes module under
// strict mode, top-level `this` is undefined and `self` isn't a Hermes
// global — so without this shim the polyfill silently picks the wrong
// target and `globalThis.fetch` stays undefined.
//
// Must run BEFORE `import 'whatwg-fetch'`. Babel hoists ESM imports above
// plain statements within a single file, so we live in our own module that
// `polyfills.ts` imports first.
(globalThis as { self?: unknown }).self ??= globalThis;

export {};
