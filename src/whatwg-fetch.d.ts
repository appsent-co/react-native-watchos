// `whatwg-fetch` is a side-effect polyfill — it decorates `globalThis` with
// `fetch` / `Headers` / `Request` / `Response` and has no exports. The
// package doesn't ship .d.ts and isn't on DefinitelyTyped, so declare it
// here as an empty module to satisfy `import 'whatwg-fetch'`.
declare module 'whatwg-fetch';
