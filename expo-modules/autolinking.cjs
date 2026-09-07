#!/usr/bin/env node
'use strict';

// Expo SDK 57 can search configs for literal watchos support, but it has no
// watchOS linker or provider generator. This owns the narrow watch-only layer.
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { resolveCompatibility } = require('./compatibility.cjs');

const SWIFT_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SWIFT_RESERVED_IDENTIFIERS = new Set([
  'actor',
  'Any',
  'as',
  'associatedtype',
  'associativity',
  'async',
  'await',
  'borrowing',
  'break',
  'case',
  'catch',
  'class',
  'consuming',
  'continue',
  'convenience',
  'default',
  'defer',
  'deinit',
  'didSet',
  'distributed',
  'do',
  'dynamic',
  'each',
  'else',
  'enum',
  'extension',
  'fallthrough',
  'false',
  'fileprivate',
  'final',
  'for',
  'func',
  'get',
  'guard',
  'if',
  'import',
  'in',
  'indirect',
  'infix',
  'init',
  'inout',
  'internal',
  'is',
  'isolated',
  'lazy',
  'left',
  'let',
  'macro',
  'mutating',
  'nil',
  'none',
  'nonisolated',
  'nonmutating',
  'open',
  'operator',
  'optional',
  'override',
  'package',
  'postfix',
  'precedence',
  'precedencegroup',
  'prefix',
  'private',
  'protocol',
  'public',
  'repeat',
  'required',
  'rethrows',
  'return',
  'right',
  'self',
  'Self',
  'sending',
  'set',
  'some',
  'static',
  'struct',
  'subscript',
  'super',
  'switch',
  'throw',
  'throws',
  'true',
  'try',
  'typealias',
  'unowned',
  'var',
  'weak',
  'where',
  'while',
  'willSet',
]);
const WATCHOS_KEYS = new Set(['modules', 'podspecPath', 'swiftModuleName']);

function fail(message) {
  throw new Error('[RNW Expo autolinking] ' + message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function realDirectory(directory, label) {
  try {
    const resolved = fs.realpathSync(directory);
    if (!fs.statSync(resolved).isDirectory()) {
      fail(label + ' is not a directory: ' + directory);
    }
    return resolved;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('[RNW Expo autolinking]')
    ) {
      throw error;
    }
    fail(label + ' does not exist: ' + directory);
  }
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative === '' ||
    (!relative.startsWith('..' + path.sep) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

function swiftIdentifier(value, label) {
  if (
    typeof value !== 'string' ||
    !SWIFT_IDENTIFIER.test(value) ||
    SWIFT_RESERVED_IDENTIFIERS.has(value)
  ) {
    fail(label + ' must be a non-reserved simple Swift identifier');
  }
  return value;
}

function resolveAutolinker() {
  // This package owns the search tool version. The app may upgrade its Expo
  // tooling independently; its dependency graph and exclusions still apply.
  const manifestPath = require.resolve('expo-modules-autolinking/package.json');
  const cli = path.join(
    path.dirname(manifestPath),
    'bin',
    'expo-modules-autolinking.js'
  );
  if (!fs.existsSync(cli))
    fail('The packaged Expo autolinker is missing: ' + cli);
  return cli;
}

function search(projectRoot, cli) {
  const result = childProcess.spawnSync(
    process.execPath,
    [
      cli,
      'search',
      '--platform',
      'watchos',
      '--project-root',
      projectRoot,
      '--json',
    ],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  if (result.error)
    fail('Expo SDK 57 search could not start: ' + result.error.message);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    fail(
      'Expo SDK 57 search failed' +
        (detail ? ': ' + detail : ' (exit ' + String(result.status) + ')')
    );
  }
  try {
    const parsed = JSON.parse(result.stdout);
    if (!isRecord(parsed))
      fail('Expo SDK 57 search returned a non-object JSON result');
    return parsed;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('[RNW Expo autolinking]')
    ) {
      throw error;
    }
    fail('Expo SDK 57 search returned invalid JSON: ' + error.message);
  }
}

function validateRevision(name, packagePath, revision) {
  if (!isRecord(revision)) fail(name + ' search result is invalid');
  if (revision.name !== undefined && revision.name !== name) {
    fail(name + ' search result has a mismatched package name');
  }
  if (typeof revision.version !== 'string' || revision.version.length === 0) {
    fail(name + ' has no package version');
  }
  if (Array.isArray(revision.duplicates) && revision.duplicates.length > 0) {
    const paths = revision.duplicates
      .map((item) =>
        isRecord(item) && typeof item.path === 'string' ? item.path : 'unknown'
      )
      .join(', ');
    fail(
      name +
        ' was resolved more than once (' +
        paths +
        '); make its package path unambiguous'
    );
  }
  if (
    revision.duplicates !== undefined &&
    !Array.isArray(revision.duplicates)
  ) {
    fail(name + ' search result has invalid duplicates metadata');
  }

  const config = revision.config;
  if (
    !isRecord(config) ||
    !Array.isArray(config.platforms) ||
    !config.platforms.includes('watchos')
  ) {
    fail(
      name +
        ' must explicitly list "watchos" in expo-module.config.json#platforms'
    );
  }
  if (!isRecord(config.watchos)) {
    fail(name + ' must provide an expo-module.config.json#watchos object');
  }
  const unknown = Object.keys(config.watchos).filter(
    (key) => !WATCHOS_KEYS.has(key)
  );
  if (unknown.length > 0) {
    fail(
      name +
        ' watchos config contains unsupported keys: ' +
        unknown.sort().join(', ') +
        '; UI, delegate, and worklet integration is not supported'
    );
  }

  const classes = config.watchos.modules;
  if (!Array.isArray(classes) || classes.length === 0) {
    fail(
      name +
        ' watchos.modules must be a non-empty array of simple Swift class names'
    );
  }
  const localClasses = new Set();
  for (const className of classes) {
    swiftIdentifier(className, name + ' watchos.modules');
    if (localClasses.has(className)) {
      fail(name + ' watchos.modules lists ' + className + ' more than once');
    }
    localClasses.add(className);
  }

  const swiftModuleName = swiftIdentifier(
    config.watchos.swiftModuleName,
    name + ' watchos.swiftModuleName'
  );
  const rawPodspec = config.watchos.podspecPath;
  if (
    typeof rawPodspec !== 'string' ||
    rawPodspec.length === 0 ||
    path.isAbsolute(rawPodspec) ||
    !rawPodspec.endsWith('.podspec')
  ) {
    fail(name + ' watchos.podspecPath must be a relative .podspec path');
  }
  const untrustedPodspec = path.resolve(packagePath, rawPodspec);
  if (!isInside(packagePath, untrustedPodspec)) {
    fail(
      name + ' watchos.podspecPath must remain inside its package directory'
    );
  }
  if (!fs.existsSync(untrustedPodspec)) {
    fail(name + ' watchos.podspecPath does not exist: ' + rawPodspec);
  }
  const podspecPath = fs.realpathSync(untrustedPodspec);
  if (!isInside(packagePath, podspecPath)) {
    fail(name + ' watchos.podspecPath resolves outside its package directory');
  }

  return {
    name,
    version: revision.version,
    path: packagePath,
    podspecPath,
    swiftModuleName,
    modules: [...classes],
  };
}

function discoverModules(projectRoot) {
  const appRoot = realDirectory(projectRoot, 'project root');
  resolveCompatibility(appRoot);
  const results = search(appRoot, resolveAutolinker());
  const modules = Object.entries(results).map(([name, revision]) => {
    if (!isRecord(revision) || typeof revision.path !== 'string') {
      fail(name + ' search result has no package path');
    }
    return validateRevision(
      name,
      realDirectory(revision.path, name + ' package path'),
      revision
    );
  });
  modules.sort((left, right) => left.name.localeCompare(right.name));

  const classes = new Set();
  const swiftModules = new Map();
  for (const module of modules) {
    const firstPackage = swiftModules.get(module.swiftModuleName);
    if (firstPackage !== undefined) {
      fail(
        'packages ' +
          firstPackage +
          ' and ' +
          module.name +
          ' declare the same Swift module name: ' +
          module.swiftModuleName
      );
    }
    swiftModules.set(module.swiftModuleName, module.name);
    for (const className of module.modules) {
      const qualified = module.swiftModuleName + '.' + className;
      if (classes.has(qualified)) {
        fail(
          'multiple packages register the same Swift module class: ' + qualified
        );
      }
      classes.add(qualified);
    }
  }
  return modules;
}

function renderProvider(modules) {
  if (!Array.isArray(modules)) fail('provider modules must be an array');
  const swiftModules = new Set();
  const classes = modules
    .flatMap((module) => {
      if (!isRecord(module) || !Array.isArray(module.modules)) {
        fail('provider module is invalid');
      }
      const swiftModuleName = swiftIdentifier(
        module.swiftModuleName,
        'provider swiftModuleName'
      );
      if (swiftModules.has(swiftModuleName)) {
        fail(
          'provider includes more than one package for Swift module ' +
            swiftModuleName
        );
      }
      swiftModules.add(swiftModuleName);
      return module.modules.map((className) => ({
        swiftModuleName,
        className: swiftIdentifier(className, 'provider module class'),
      }));
    })
    .sort((left, right) =>
      (left.swiftModuleName + '.' + left.className).localeCompare(
        right.swiftModuleName + '.' + right.className
      )
    );
  const seen = new Set();
  for (const item of classes) {
    const qualified = item.swiftModuleName + '.' + item.className;
    if (seen.has(qualified))
      fail('provider includes ' + qualified + ' more than once');
    seen.add(qualified);
  }
  const imports = [
    ...new Set(classes.map((item) => item.swiftModuleName)),
  ].sort();
  const body = classes.map((item, index) => {
    return (
      '      (module: ' +
      item.swiftModuleName +
      '.' +
      item.className +
      '.self, name: nil)' +
      (index + 1 < classes.length ? ',' : '')
    );
  });
  return [
    '// Generated by @appsent-co/react-native-watchos. Do not edit.',
    'import ExpoModulesCore',
    ...imports.map((name) => 'import ' + name),
    '',
    '@objc(RNWExpoModulesProvider)',
    'public class RNWExpoModulesProvider: ModulesProvider {',
    '  public override func getModuleClasses() -> [ExpoModuleTupleType] {',
    ...(body.length > 0
      ? ['    return [', ...body, '    ]']
      : ['    return []']),
    '  }',
    '}',
    '',
  ].join('\n');
}

function writeProvider(projectRoot, outputFile) {
  if (typeof outputFile !== 'string' || outputFile.length === 0) {
    fail('provider output path is required');
  }
  const modules = discoverModules(projectRoot);
  const destination = path.resolve(projectRoot, outputFile);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = path.join(
    path.dirname(destination),
    '.' +
      path.basename(destination) +
      '.' +
      process.pid +
      '.' +
      Date.now() +
      '.tmp'
  );
  try {
    fs.writeFileSync(temporary, renderProvider(modules), 'utf8');
    fs.renameSync(temporary, destination);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  return modules;
}

function parseArgs(argv) {
  let projectRoot;
  let provider;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== '--project-root' && argument !== '--provider') {
      fail('unknown argument: ' + argument);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) fail(argument + ' requires a value');
    if (argument === '--project-root') projectRoot = value;
    else provider = value;
    index += 1;
  }
  if (!projectRoot) fail('--project-root is required');
  return { projectRoot, provider };
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const modules = options.provider
      ? writeProvider(options.projectRoot, options.provider)
      : discoverModules(options.projectRoot);
    process.stdout.write(JSON.stringify({ modules }) + '\n');
  } catch (error) {
    process.stderr.write(
      (error instanceof Error ? error.message : String(error)) + '\n'
    );
    process.exitCode = 1;
  }
}

module.exports = { discoverModules, renderProvider, writeProvider };
