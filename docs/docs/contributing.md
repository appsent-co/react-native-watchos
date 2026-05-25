---
title: Contributing
---

# Contributing

See [`CONTRIBUTING.md`](https://github.com/appsent-co/react-native-watchos/blob/main/CONTRIBUTING.md)
for the canonical guide. Quick notes for working on the docs site
itself:

```sh
pnpm --filter react-native-watchos-docs start
```

Builds locally:

```sh
pnpm --filter react-native-watchos-docs build
```

The site is deployed to GitHub Pages from `main` whenever files
under `docs/` (or the `docs.yml` workflow) change — see
[`.github/workflows/docs.yml`](https://github.com/appsent-co/react-native-watchos/blob/main/.github/workflows/docs.yml).
