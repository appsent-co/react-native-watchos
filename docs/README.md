# Docs

Docusaurus site published to GitHub Pages at
<https://appsent-co.github.io/react-native-watchos/>.

## Local dev

```sh
pnpm install
pnpm --filter react-native-watchos-docs start
```

The site reloads on save. Sidebar order lives in [`sidebars.ts`](./sidebars.ts);
site config lives in [`docusaurus.config.ts`](./docusaurus.config.ts).

## Production build

```sh
pnpm --filter react-native-watchos-docs build
pnpm --filter react-native-watchos-docs serve
```

CI deploys `main` to GitHub Pages via
[`.github/workflows/docs.yml`](../.github/workflows/docs.yml) whenever
files under `docs/` change.

## Assets

Logos, social cards, and the favicon live in `static/img/`. The
config currently references `img/logo.svg`, `img/favicon.ico`, and
`img/social-card.png` — drop those in when ready (the site builds
without them but will warn about missing favicons).
