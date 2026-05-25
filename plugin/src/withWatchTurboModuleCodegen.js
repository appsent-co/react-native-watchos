// @ts-check
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { withFinalizedMod } = require('@expo/config-plugins');

// Stable marker we stash on every PBX file ref / build file we inject, so
// re-running `expo prebuild` (without --clean) can find and remove our
// previous run's entries before adding fresh ones. Plain `.endsWith` over
// the comment is enough — apple-targets / Pods never use this prefix.
const MARKER = '[RNW-CODEGEN]';

/**
 * Adds a prebuild-time codegen step that turns the consumer's
 * `Native<Foo>.ts` TurboModule specs into the ObjC++/C++ files RN's
 * codegen normally emits at CocoaPods install time, and injects them
 * into the watch target's `PBXSourcesBuildPhase` so they compile
 * alongside the maintainer's `.mm` files.
 *
 * Lookup order for `codegenConfig`:
 *   - `<projectRoot>/package.json#codegenConfig`
 *
 * Walking the full dependency tree (for libraries that ship their own
 * specs) is a follow-up — for v1, only the consumer app's specs are
 * picked up. This matches RN's `pod install` behavior for the
 * "host-app codegen" path, just shifted to the Expo prebuild lifecycle.
 *
 * @typedef {object} Opts
 * @property {string} targetName - Watch target name in pbxproj.
 *
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @param {Opts} opts
 */
const withWatchTurboModuleCodegen = (config, { targetName }) => {
  return withFinalizedMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const codegenJobs = collectCodegenJobs(projectRoot);
      if (codegenJobs.length === 0) {
        return cfg;
      }

      const xcode = require('xcode');
      const pbxprojPath = findPbxproj(platformRoot);
      const project = xcode.project(pbxprojPath);
      await new Promise((resolve, reject) => {
        project.parse((err) => (err ? reject(err) : resolve()));
      });

      // Sweep previously-injected codegen entries ONCE before re-adding
      // for every job. Otherwise the second job's "remove ours then add"
      // pass would delete the first job's entries.
      clearPreviouslyInjected({ project });

      for (const job of codegenJobs) {
        runCodegen({
          projectRoot: job.cwd,
          specFiles: job.specFiles,
          outputDir: job.outputDir,
          libraryName: job.libraryName,
        });
        const sources = collectGeneratedSources(job.outputDir);
        injectIntoTarget({
          project,
          platformRoot,
          targetName,
          outputDir: job.outputDir,
          sources,
        });
      }

      fs.writeFileSync(pbxprojPath, project.writeSync());
      return cfg;
    },
  ]);
};

// ----------------------------------------------------------------------------

/**
 * Builds the list of codegen "jobs" to run for this prebuild — one for
 * the consumer app's own specs (if any) plus one per library in
 * `node_modules` that ships a `codegenConfig`. Each job produces its
 * own umbrella header (`<libraryName>.h`) under its own output dir, so
 * library impl `.mm` files can `#import` a stable path independent of
 * the consumer's `codegenConfig.name`.
 *
 * Mirrors what standard RN iOS codegen does at `pod install` time —
 * just shifted to prebuild for the watch target.
 *
 * @returns {{ cwd: string, specFiles: string[], outputDir: string, libraryName: string }[]}
 */
function collectCodegenJobs(projectRoot) {
  const jobs = [];

  // Job 1: consumer app's own codegenConfig.
  const consumer = readCodegenConfigFrom(projectRoot);
  if (consumer) {
    const jsSrcsDir = path.resolve(projectRoot, consumer.jsSrcsDir);
    if (fs.existsSync(jsSrcsDir)) {
      const specFiles = findSpecFiles(jsSrcsDir);
      if (specFiles.length > 0) {
        jobs.push({
          cwd: projectRoot,
          specFiles,
          outputDir: path.resolve(
            projectRoot,
            consumer.outputDir?.ios || 'ios/build/generated/watchos-codegen'
          ),
          libraryName: consumer.name || 'AppSpecs',
        });
      }
    } else {
      console.warn(
        `[@appsent-co/react-native-watchos] codegenConfig.jsSrcsDir not found: ${jsSrcsDir}. Skipping consumer codegen.`
      );
    }
  }

  // Jobs 2..N: every dependency declaring its own `codegenConfig`. Each
  // gets its own output dir so umbrella headers don't collide.
  const nodeModules = path.join(projectRoot, 'node_modules');
  if (fs.existsSync(nodeModules)) {
    for (const pkgDir of enumeratePackages(nodeModules)) {
      const libConfig = readCodegenConfigFrom(pkgDir);
      if (!libConfig) continue;
      const jsSrcsDir = path.resolve(pkgDir, libConfig.jsSrcsDir);
      if (!fs.existsSync(jsSrcsDir)) continue;
      const specFiles = findSpecFiles(jsSrcsDir);
      if (specFiles.length === 0) continue;
      const libraryName = libConfig.name || path.basename(pkgDir);
      jobs.push({
        cwd: pkgDir,
        specFiles,
        outputDir: path.resolve(
          projectRoot,
          'ios/build/generated/watchos-codegen-libs',
          libraryName
        ),
        libraryName,
      });
    }
  }

  return jobs;
}

function enumeratePackages(nodeModules) {
  const out = [];
  for (const entry of fs.readdirSync(nodeModules)) {
    if (entry.startsWith('.')) continue;
    const abs = path.join(nodeModules, entry);
    let st;
    try {
      st = fs.statSync(abs);
    } catch (_e) {
      continue;
    }
    if (!st.isDirectory()) continue;
    if (entry.startsWith('@')) {
      for (const sub of fs.readdirSync(abs)) {
        if (sub.startsWith('.')) continue;
        out.push(path.join(abs, sub));
      }
    } else {
      out.push(abs);
    }
  }
  return out;
}

function readCodegenConfigFrom(pkgDir) {
  const pkgPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (_e) {
    return null;
  }
  if (!pkg.codegenConfig) return null;
  if (!pkg.codegenConfig.jsSrcsDir) return null;
  return pkg.codegenConfig;
}

/**
 * Strip every PBX entry previously injected by this plugin so the next
 * pass can re-add fresh entries idempotently. Called ONCE per prebuild,
 * before any `injectIntoTarget` call.
 */
function clearPreviouslyInjected({ project }) {
  const objects = project.hash.project.objects;
  const fileRefs = objects.PBXFileReference || {};
  const buildFiles = objects.PBXBuildFile || {};
  const ourFileRefIds = new Set();
  for (const key of Object.keys(fileRefs)) {
    if (key.endsWith('_comment')) continue;
    const comment = fileRefs[`${key}_comment`];
    if (typeof comment === 'string' && comment.startsWith(MARKER)) {
      ourFileRefIds.add(key);
    }
  }
  const ourBuildFileIds = new Set();
  for (const key of Object.keys(buildFiles)) {
    if (key.endsWith('_comment')) continue;
    const comment = buildFiles[`${key}_comment`];
    if (typeof comment === 'string' && comment.startsWith(MARKER)) {
      ourBuildFileIds.add(key);
    }
  }
  for (const id of ourFileRefIds) {
    delete fileRefs[id];
    delete fileRefs[`${id}_comment`];
  }
  for (const id of ourBuildFileIds) {
    delete buildFiles[id];
    delete buildFiles[`${id}_comment`];
  }
  const sourcesPhases = objects.PBXSourcesBuildPhase || {};
  for (const key of Object.keys(sourcesPhases)) {
    if (key.endsWith('_comment')) continue;
    const phase = sourcesPhases[key];
    if (phase && Array.isArray(phase.files)) {
      phase.files = phase.files.filter(
        (entry) => !ourBuildFileIds.has(entry.value)
      );
    }
  }
}

function findSpecFiles(dir) {
  // RN convention: spec filenames start with `Native` and end in
  // `.ts`/`.tsx`/`.js`. We deliberately walk only one level deep —
  // codegenConfig is for spec files, not for arbitrary subtree scanning.
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.startsWith('Native')) continue;
    const full = path.join(dir, entry);
    const st = fs.statSync(full);
    if (!st.isFile()) continue;
    if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function runCodegen({ projectRoot, specFiles, outputDir, libraryName }) {
  // Resolve RN's codegen scripts from the consumer's node_modules so a
  // pinned `react-native` version drives the format. Both scripts live
  // in the `react-native` package itself (not `@react-native/codegen`,
  // which has the combine helper).
  const combineCli = require.resolve(
    '@react-native/codegen/lib/cli/combine/combine-js-to-schema-cli.js',
    { paths: [projectRoot] }
  );
  const generateCli = require.resolve(
    'react-native/scripts/generate-specs-cli.js',
    { paths: [projectRoot] }
  );

  fs.mkdirSync(outputDir, { recursive: true });
  const schemaPath = path.join(outputDir, 'schema.json');

  // Step 1: combine TS specs into a single schema JSON.
  run('node', [combineCli, '--platform', 'ios', schemaPath, ...specFiles], {
    cwd: projectRoot,
  });

  // Step 2: emit the C++/ObjC sources. We pass `--platform ios` even on
  // watchOS — the codegen output is platform-agnostic at source level,
  // and our forked `<React/RCTBridgeModule.h>` /
  // `<ReactCommon/RCTTurboModule.h>` headers (shipped in the xcframework)
  // satisfy the iOS-flavored `#import`s on watchOS.
  run(
    'node',
    [
      generateCli,
      '--platform',
      'ios',
      '--schemaPath',
      schemaPath,
      '--outputDir',
      outputDir,
      '--libraryName',
      libraryName,
      '--libraryType',
      'modules',
    ],
    { cwd: projectRoot }
  );
}

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    throw new Error(
      `[@appsent-co/react-native-watchos] codegen step failed: ${cmd} ${args.join(' ')}`
    );
  }
}

function collectGeneratedSources(outputDir) {
  // codegen emits two parallel paths:
  //   - Top-level   `<Lib>JSI.h` + `<Lib>JSI-generated.cpp`  (C++ path)
  //   - `<Lib>/     <Lib>.h` + `<Lib>-generated.mm`           (ObjC path)
  //
  // v1 only compiles the ObjC path. The C++ path's `JSI-generated.cpp`
  // pulls `react/bridging/Dynamic.h` → `folly/dynamic.h`, which isn't
  // on the watch target's header search path (folly is bundled inside
  // our xcframework's .a but not exposed as a header). Maintainers
  // writing pure-C++ TurboModules can still use the C++ path by
  // registering through `RNWTurboModuleRegistry+Cxx.h` directly — same
  // path as Phase A's `NativeMath`.
  /** @type {{ compile: string[], header: string[] }} */
  const out = { compile: [], header: [] };
  walk(outputDir, (abs) => {
    if (abs.endsWith('JSI-generated.cpp')) {
      // Skip the C++ path's impl — see note above.
      return;
    }
    if (/\.(mm|cc)$/i.test(abs)) {
      out.compile.push(abs);
    } else if (/\.(h|hpp)$/i.test(abs)) {
      out.header.push(abs);
    }
  });
  return out;
}

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir)) {
    const abs = path.join(dir, entry);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, visit);
    else visit(abs);
  }
}

function injectIntoTarget({
  project,
  platformRoot,
  targetName,
  outputDir,
  sources,
}) {
  const objects = project.hash.project.objects;

  // ---- Locate the watch target ----
  const nativeTargets = objects.PBXNativeTarget || {};
  let targetKey = null;
  for (const key of Object.keys(nativeTargets)) {
    if (key.endsWith('_comment')) continue;
    if (stripQuotes(nativeTargets[key].name) === targetName) {
      targetKey = key;
      break;
    }
  }
  if (!targetKey) {
    throw new Error(
      `[@appsent-co/react-native-watchos] codegen: watch target "${targetName}" not found in pbxproj.`
    );
  }
  const target = nativeTargets[targetKey];

  // ---- Locate the watch target's Sources build phase ----
  const sourcesPhases = objects.PBXSourcesBuildPhase || {};
  let sourcesPhaseKey = null;
  for (const phaseRef of target.buildPhases || []) {
    if (sourcesPhases[phaseRef.value]) {
      sourcesPhaseKey = phaseRef.value;
      break;
    }
  }
  if (!sourcesPhaseKey) {
    throw new Error(
      `[@appsent-co/react-native-watchos] codegen: PBXSourcesBuildPhase not found on target "${targetName}".`
    );
  }
  const sourcesPhase = sourcesPhases[sourcesPhaseKey];

  // Idempotency is handled once-per-prebuild by `clearPreviouslyInjected`
  // before any job runs — see the dispatcher in `withFinalizedMod`.
  const fileRefs = objects.PBXFileReference || {};
  const buildFiles = objects.PBXBuildFile || {};

  // ---- Add header-search-path entries so consumer .mm files can
  // `#import "NativeWatchInfoSpec.h"` (the codegen output uses
  // quote-include, not framework-include) ----
  // Build configs live under XCConfigurationList → XCBuildConfiguration.
  const configList = objects.XCConfigurationList[target.buildConfigurationList];
  const buildConfigs = objects.XCBuildConfiguration || {};
  const headerPath = path.relative(platformRoot, outputDir);
  for (const ref of configList.buildConfigurations) {
    const cfg = buildConfigs[ref.value];
    if (!cfg) continue;
    const settings = cfg.buildSettings || (cfg.buildSettings = {});
    const existing = settings.HEADER_SEARCH_PATHS;
    const entry = `"$(SRCROOT)/${headerPath}"`;
    const recursiveEntry = `"$(SRCROOT)/${headerPath}/**"`;
    if (Array.isArray(existing)) {
      if (!existing.includes(entry)) existing.push(entry);
      if (!existing.includes(recursiveEntry)) existing.push(recursiveEntry);
    } else if (typeof existing === 'string') {
      settings.HEADER_SEARCH_PATHS = [existing, entry, recursiveEntry];
    } else {
      settings.HEADER_SEARCH_PATHS = ['"$(inherited)"', entry, recursiveEntry];
    }
  }

  // ---- Add each generated .mm/.cpp as a PBXFileReference + PBXBuildFile
  // and append to Sources phase ----
  objects.PBXFileReference = fileRefs;
  objects.PBXBuildFile = buildFiles;
  for (const abs of sources.compile) {
    const rel = path.relative(platformRoot, abs);
    const basename = path.basename(abs);
    const fileType = abs.endsWith('.mm')
      ? 'sourcecode.cpp.objcpp'
      : 'sourcecode.cpp.cpp';

    const fileRefId = project.generateUuid();
    fileRefs[fileRefId] = {
      isa: 'PBXFileReference',
      lastKnownFileType: fileType,
      name: `"${basename}"`,
      path: `"${rel}"`,
      sourceTree: 'SOURCE_ROOT',
    };
    fileRefs[`${fileRefId}_comment`] = `${MARKER} ${basename}`;

    const buildFileId = project.generateUuid();
    buildFiles[buildFileId] = {
      isa: 'PBXBuildFile',
      fileRef: fileRefId,
      fileRef_comment: `${MARKER} ${basename}`,
    };
    buildFiles[`${buildFileId}_comment`] = `${MARKER} ${basename} in Sources`;

    sourcesPhase.files.push({
      value: buildFileId,
      comment: `${MARKER} ${basename} in Sources`,
    });
  }
}

function findPbxproj(platformRoot) {
  const xcodeproj = fs
    .readdirSync(platformRoot)
    .find((name) => name.endsWith('.xcodeproj'));
  if (!xcodeproj) {
    throw new Error(
      `[@appsent-co/react-native-watchos] No .xcodeproj found in ${platformRoot}`
    );
  }
  return path.join(platformRoot, xcodeproj, 'project.pbxproj');
}

function stripQuotes(s) {
  if (typeof s !== 'string') return s;
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s;
}

module.exports = withWatchTurboModuleCodegen;
