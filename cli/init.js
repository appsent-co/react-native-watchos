#!/usr/bin/env node
// @ts-check
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const TEMPLATES = path.join(__dirname, '..', 'plugin', 'templates');
const ENTRY_NAMES = [
  'index.watchos.tsx',
  'index.watchos.ts',
  'index.watchos.jsx',
  'index.watchos.js',
];

function help() {
  console.log('Usage: npx react-native-watchos init');
  console.log('');
  console.log('Scaffolds a watchOS target via @bacons/apple-targets and wires');
  console.log('@appsent-co/react-native-watchos into app.json.');
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === '-h' || cmd === '--help' || cmd === 'help') {
    help();
    return;
  }
  if (cmd !== 'init') {
    help();
    process.exit(1);
  }

  const cwd = process.cwd();
  const targetsRoot = path.join(cwd, 'targets');
  const existing = listWatchTargets(targetsRoot);

  // `create-target watch` loads the Expo config internally, which runs our
  // plugin's order assertion. If `npx expo install` auto-added us before
  // `@bacons/apple-targets`, that assertion throws and create-target exits 1
  // before we ever get to patchAppJson. Strip our entry first; patchAppJson
  // reinserts it in the correct position after create-target succeeds.
  stripOurPluginFromAppJson(cwd);

  console.log('› Running `npx create-target watch`…');
  await spawnInherit('npx', ['--yes', 'create-target', 'watch']);

  const after = listWatchTargets(targetsRoot);
  const created = after.find((d) => !existing.includes(d)) || after[0];
  if (!created) {
    console.error(
      '\nCould not locate the generated watch target under ./targets/.'
    );
    console.error('Skipping ContentView.swift and app.json wiring.');
    process.exit(1);
  }

  const targetName = path.basename(created);
  writeContentView(created);
  writeEntryFile(cwd);
  patchAppJson(cwd, targetName);

  console.log('');
  console.log('✓ @appsent-co/react-native-watchos wired up.');
  console.log(`  • Target:        targets/${targetName}/`);
  console.log('  • Entry:         index.watchos.tsx');
  console.log('  • Next:          npx expo prebuild -p ios --clean');
}

/** @param {string} targetsRoot */
function listWatchTargets(targetsRoot) {
  if (!fs.existsSync(targetsRoot)) return [];
  const out = [];
  for (const name of fs.readdirSync(targetsRoot)) {
    const dir = path.join(targetsRoot, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (isWatchTargetConfig(dir)) out.push(dir);
  }
  return out;
}

/** @param {string} dir */
function isWatchTargetConfig(dir) {
  for (const f of ['expo-target.config.json', 'expo-target.config.js']) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    if (/['"]?type['"]?\s*:\s*['"]watch['"]/.test(content)) return true;
  }
  return false;
}

/** @param {string} targetDir */
function writeContentView(targetDir) {
  const dest = path.join(targetDir, 'ContentView.swift');
  const src = path.join(TEMPLATES, 'ContentView.swift');
  fs.copyFileSync(src, dest);
  console.log(`› Wrote ${path.relative(process.cwd(), dest)}`);
}

/** @param {string} cwd */
function writeEntryFile(cwd) {
  for (const name of ENTRY_NAMES) {
    if (fs.existsSync(path.join(cwd, name))) {
      console.log(`› Found existing ${name} — leaving untouched.`);
      return;
    }
  }
  const dest = path.join(cwd, 'index.watchos.tsx');
  fs.copyFileSync(path.join(TEMPLATES, 'index.watchos.tsx'), dest);
  console.log(`› Wrote ${path.relative(cwd, dest)}`);
}

/**
 * @param {unknown} entry
 * @param {string} name
 */
const isEntry = (entry, name) =>
  Array.isArray(entry) ? entry[0] === name : entry === name;

/**
 * @param {string} cwd
 */
function stripOurPluginFromAppJson(cwd) {
  const p = path.join(cwd, 'app.json');
  if (!fs.existsSync(p)) return;

  /** @type {{ expo?: { plugins?: Array<unknown> } }} */
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  const plugins =
    json && json.expo && Array.isArray(json.expo.plugins)
      ? json.expo.plugins
      : null;
  if (!plugins) return;

  let removed = 0;
  for (let i = plugins.length - 1; i >= 0; i--) {
    if (isEntry(plugins[i], '@appsent-co/react-native-watchos')) {
      plugins.splice(i, 1);
      removed++;
    }
  }
  if (removed) {
    fs.writeFileSync(p, JSON.stringify(json, null, 2) + '\n');
    console.log(
      `› Removed pre-existing @appsent-co/react-native-watchos entry from ${path.relative(cwd, p)} (will reinsert in correct position).`
    );
  }
}

/**
 * @param {string} cwd
 * @param {string} targetName
 */
function patchAppJson(cwd, targetName) {
  const p = path.join(cwd, 'app.json');
  if (!fs.existsSync(p)) {
    console.warn('');
    console.warn('! app.json not found. If you use app.config.{js,ts}, add:');
    console.warn(
      `    ["@appsent-co/react-native-watchos", { "targetName": "${targetName}" }]`
    );
    console.warn('  to plugins, after "@bacons/apple-targets".');
    return;
  }

  const raw = fs.readFileSync(p, 'utf8');
  /** @type {{ expo?: { plugins?: Array<unknown> } }} */
  const json = JSON.parse(raw);
  const expo = (json.expo = json.expo || {});
  const plugins = (expo.plugins = expo.plugins || []);

  // `npx expo install` auto-adds the plugin as a bare string in the wrong
  // position (before @bacons/apple-targets) and with no targetName. Strip
  // any existing entry so we can reinsert it in the correct position.
  const removed = [];
  for (let i = plugins.length - 1; i >= 0; i--) {
    if (isEntry(plugins[i], '@appsent-co/react-native-watchos')) {
      removed.push(plugins[i]);
      plugins.splice(i, 1);
    }
  }

  const entry = ['@appsent-co/react-native-watchos', { targetName }];
  const baconIdx = plugins.findIndex(
    /** @param {unknown} e */ (e) => isEntry(e, '@bacons/apple-targets')
  );
  if (baconIdx >= 0) plugins.splice(baconIdx + 1, 0, entry);
  else plugins.push(entry);

  fs.writeFileSync(p, JSON.stringify(json, null, 2) + '\n');
  if (removed.length) {
    console.log(
      `› Replaced existing @appsent-co/react-native-watchos entry in ${path.relative(cwd, p)}`
    );
  } else {
    console.log(`› Patched ${path.relative(cwd, p)}`);
  }
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @returns {Promise<void>}
 */
function spawnInherit(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))
    );
  });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
