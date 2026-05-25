// @ts-check
const fs = require('fs');
const path = require('path');
const { withFinalizedMod } = require('@expo/config-plugins');

const SPM_PRODUCT_NAME = 'ReactNativeWatchOS';

/**
 * Adds a local Swift Package Manager reference to the consumer's iOS Xcode
 * project pointing at the npm-installed `@appsent-co/react-native-watchos` package, and
 * wires its `ReactNativeWatchOS` library product as a dependency of the named
 * watchOS target.
 *
 * Implementation note: registered as a `finalized` mod so it runs AFTER
 * @bacons/apple-targets has finished creating the watch target in the
 * pbxproj. The finalized mod doesn't provide a parsed pbxproj, so we read /
 * parse / mutate / write the file directly using the `xcode` library that
 * Expo ships as a transitive dep.
 *
 * @typedef {object} Opts
 * @property {string} targetName - Name of the watch target in pbxproj.
 *   Defaults to `"watch"`.
 *
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @param {Opts} opts
 */
const withSPMPackage = (config, { targetName }) => {
  return withFinalizedMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const pbxprojPath = findPbxproj(platformRoot);

      const xcode = require('xcode');
      const project = xcode.project(pbxprojPath);
      await new Promise((resolve, reject) => {
        project.parse((err) => (err ? reject(err) : resolve()));
      });

      const objects = project.hash.project.objects;

      // -------------------------------------------------------------
      // Resolve npm package path relative to <project>/ios
      // -------------------------------------------------------------
      let pkgJsonPath;
      try {
        pkgJsonPath = require.resolve(
          '@appsent-co/react-native-watchos/package.json',
          {
            paths: [projectRoot],
          }
        );
      } catch (_) {
        throw new Error(
          `[@appsent-co/react-native-watchos] Could not resolve '@appsent-co/react-native-watchos' ` +
            `from ${projectRoot}. Did you run \`npm install\`?`
        );
      }
      // Package.swift lives in <pkgDir>/apple — point SPM at that subdir,
      // not the npm package root.
      const pkgDir = path.dirname(pkgJsonPath);
      const swiftPackageDir = path.join(pkgDir, 'apple');
      const relPath = path.relative(platformRoot, swiftPackageDir);

      // -------------------------------------------------------------
      // Find the watch target by name
      // -------------------------------------------------------------
      const nativeTargets = objects.PBXNativeTarget || {};
      let targetKey = null;
      for (const key of Object.keys(nativeTargets)) {
        if (key.endsWith('_comment')) continue;
        const t = nativeTargets[key];
        if (stripQuotes(t.name) === targetName) {
          targetKey = key;
          break;
        }
      }
      if (!targetKey) {
        const available = Object.keys(nativeTargets)
          .filter((k) => !k.endsWith('_comment'))
          .map((k) => stripQuotes(nativeTargets[k].name));
        throw new Error(
          `[@appsent-co/react-native-watchos] Target "${targetName}" not found in pbxproj. ` +
            `Available: [${available.join(', ')}]. ` +
            `Make sure @bacons/apple-targets is configured and listed before ` +
            `@appsent-co/react-native-watchos in app.json plugins.`
        );
      }
      const target = nativeTargets[targetKey];

      // Locate the PBXProject node (single one expected)
      const pbxProjectKey = Object.keys(objects.PBXProject || {}).find(
        (k) => !k.endsWith('_comment')
      );
      if (!pbxProjectKey) {
        throw new Error(
          '[@appsent-co/react-native-watchos] No PBXProject found in pbxproj'
        );
      }
      const pbxProject = objects.PBXProject[pbxProjectKey];

      // -------------------------------------------------------------
      // 1. XCLocalSwiftPackageReference + attach to PBXProject
      // -------------------------------------------------------------
      const packageRefId = project.generateUuid();
      const packageRefComment = `XCLocalSwiftPackageReference "${relPath}"`;
      objects.XCLocalSwiftPackageReference =
        objects.XCLocalSwiftPackageReference || {};
      objects.XCLocalSwiftPackageReference[packageRefId] = {
        isa: 'XCLocalSwiftPackageReference',
        relativePath: `"${relPath}"`,
      };
      objects.XCLocalSwiftPackageReference[`${packageRefId}_comment`] =
        packageRefComment;

      pbxProject.packageReferences = pbxProject.packageReferences || [];
      pbxProject.packageReferences.push({
        value: packageRefId,
        comment: packageRefComment,
      });

      // -------------------------------------------------------------
      // 2. XCSwiftPackageProductDependency + attach to target
      // -------------------------------------------------------------
      const productDepId = project.generateUuid();
      objects.XCSwiftPackageProductDependency =
        objects.XCSwiftPackageProductDependency || {};
      objects.XCSwiftPackageProductDependency[productDepId] = {
        isa: 'XCSwiftPackageProductDependency',
        package: packageRefId,
        package_comment: packageRefComment,
        productName: SPM_PRODUCT_NAME,
      };
      objects.XCSwiftPackageProductDependency[`${productDepId}_comment`] =
        SPM_PRODUCT_NAME;

      target.packageProductDependencies =
        target.packageProductDependencies || [];
      target.packageProductDependencies.push({
        value: productDepId,
        comment: SPM_PRODUCT_NAME,
      });

      // -------------------------------------------------------------
      // 3. PBXBuildFile referencing the product + Frameworks build phase
      // -------------------------------------------------------------
      const buildFileId = project.generateUuid();
      const buildFileComment = `${SPM_PRODUCT_NAME} in Frameworks`;
      objects.PBXBuildFile = objects.PBXBuildFile || {};
      objects.PBXBuildFile[buildFileId] = {
        isa: 'PBXBuildFile',
        productRef: productDepId,
        productRef_comment: SPM_PRODUCT_NAME,
      };
      objects.PBXBuildFile[`${buildFileId}_comment`] = buildFileComment;

      let frameworksPhaseKey = null;
      for (const phaseRef of target.buildPhases || []) {
        const k = phaseRef.value;
        if (
          objects.PBXFrameworksBuildPhase &&
          objects.PBXFrameworksBuildPhase[k]
        ) {
          frameworksPhaseKey = k;
          break;
        }
      }
      // apple-targets doesn't create a Frameworks build phase for a watch
      // target by default — it only adds Sources + Resources. Create one
      // and attach it to the target so we have somewhere to put the SPM
      // product reference.
      if (!frameworksPhaseKey) {
        frameworksPhaseKey = project.generateUuid();
        objects.PBXFrameworksBuildPhase = objects.PBXFrameworksBuildPhase || {};
        objects.PBXFrameworksBuildPhase[frameworksPhaseKey] = {
          isa: 'PBXFrameworksBuildPhase',
          buildActionMask: 2147483647,
          files: [],
          runOnlyForDeploymentPostprocessing: 0,
        };
        objects.PBXFrameworksBuildPhase[`${frameworksPhaseKey}_comment`] =
          'Frameworks';
        target.buildPhases = target.buildPhases || [];
        target.buildPhases.push({
          value: frameworksPhaseKey,
          comment: 'Frameworks',
        });
      }
      const frameworksPhase =
        objects.PBXFrameworksBuildPhase[frameworksPhaseKey];
      frameworksPhase.files = frameworksPhase.files || [];
      frameworksPhase.files.push({
        value: buildFileId,
        comment: buildFileComment,
      });

      // -------------------------------------------------------------
      // 4. Apply build settings to the watch target's configs:
      //    - EXCLUDED_ARCHS[sdk=watchsimulator*] = x86_64
      //      @appsent-co/react-native-watchos ships XCFramework slices for arm64 only
      //      (Apple Silicon Macs). Without the exclusion, Xcode tries to
      //      link an x86_64 watch.dylib and can't find RNWHermesHost.
      //    - OTHER_LDFLAGS += -lc++
      //      ReactNativeWatchOSCxx is a static archive containing JSI
      //      (C++). The Swift consumer target alone doesn't pull in
      //      libc++, so the watch target's dylib link fails with hundreds
      //      of std::__1::* undefined symbols. SPM's linkerSettings on
      //      our Swift target don't reliably propagate into an
      //      apple-targets-managed target, so we set it here.
      //    - OTHER_LDFLAGS += -ObjC
      //      TurboModules auto-register at image load via the `+load`
      //      synthesized by `RCT_EXPORT_MODULE` (watch fork) and
      //      `RNW_EXPORT_CXX_MODULE`. The linker dead-strips ObjC classes
      //      from static libraries unless explicitly referenced; `-ObjC`
      //      forces every class to be loaded so `+load` fires and the
      //      module is registered before JS calls `__turboModuleProxy`.
      //      Same convention upstream RN's iOS Podfile relies on.
      // -------------------------------------------------------------
      const targetBuildConfigListId = /** @type {any} */ (target)
        .buildConfigurationList;
      const configList = /** @type {any} */ (
        objects.XCConfigurationList[targetBuildConfigListId]
      );
      for (const ref of configList.buildConfigurations || []) {
        const cfg = /** @type {any} */ (
          objects.XCBuildConfiguration[ref.value]
        );
        cfg.buildSettings = cfg.buildSettings || {};
        cfg.buildSettings['"EXCLUDED_ARCHS[sdk=watchsimulator*]"'] = 'x86_64';
        let ldflags = cfg.buildSettings['OTHER_LDFLAGS'];
        ldflags = mergeLdflags(ldflags, '-lc++');
        ldflags = mergeLdflags(ldflags, '-ObjC');
        cfg.buildSettings['OTHER_LDFLAGS'] = ldflags;
      }

      // -------------------------------------------------------------
      // Write the modified pbxproj back to disk
      // -------------------------------------------------------------
      fs.writeFileSync(pbxprojPath, project.writeSync());

      return cfg;
    },
  ]);
};

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

/**
 * Append `flag` to an existing OTHER_LDFLAGS value (string or array, possibly
 * quoted, possibly containing $(inherited)) without producing duplicates.
 *
 * @param {unknown} existing
 * @param {string} flag
 */
function mergeLdflags(existing, flag) {
  if (existing == null) {
    return `"$(inherited) ${flag}"`;
  }
  if (Array.isArray(existing)) {
    if (existing.some((v) => stripQuotes(v) === flag)) return existing;
    return [...existing, `"${flag}"`];
  }
  const unquoted = stripQuotes(existing);
  if (unquoted.split(/\s+/).includes(flag)) return existing;
  return `"${unquoted} ${flag}"`;
}

function stripQuotes(s) {
  if (typeof s !== 'string') return s;
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s;
}

module.exports = withSPMPackage;
