import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const overlay = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(overlay, '../..');
const require = createRequire(path.join(root, 'package.json'));
const expoRequire = createRequire(require.resolve('expo/package.json'));
const coreRequire = createRequire(
  expoRequire.resolve('expo-modules-core/package.json')
);
const packagePath = coreRequire.resolve('expo-modules-jsi/package.json');
const upstream = path.dirname(packagePath);
const packageJSON = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const rn = path.dirname(require.resolve('react-native/package.json'));
const rnVersion = JSON.parse(
  fs.readFileSync(path.join(rn, 'package.json'), 'utf8')
).version;
if (packageJSON.version !== '57.0.8' || rnVersion !== '0.86.3') {
  throw new Error(
    `This PoC requires expo-modules-jsi 57.0.8 and react-native 0.86.3; found ${packageJSON.version} / ${rnVersion}`
  );
}
const hermesRef = fs
  .readFileSync(path.join(rn, 'sdks/.hermesv1version'), 'utf8')
  .trim();
if (hermesRef !== 'hermes-v250829098.0.17')
  throw new Error(`Unexpected Hermes V1 ref: ${hermesRef}`);
const buildRoot = path.join(root, 'build/poc/expo-modules-jsi');
const generated = path.join(buildRoot, 'apple');
const headerRoot = path.join(
  root,
  'build/xcframework/ReactNativeWatchOSCxx.xcframework/watchos-arm64_arm64_32/Headers'
);
if (!fs.existsSync(path.join(headerRoot, 'jsi/jsi.h'))) {
  throw new Error(
    'Build the watch runtime first: ./scripts/build-xcframework.sh'
  );
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content)
    fs.writeFileSync(file, content);
}
function replaceOnce(source, before, after, label) {
  if (source.split(before).length !== 2)
    throw new Error(`Upstream ${label} changed; review the watchOS overlay`);
  return source.replace(before, after);
}
for (const directory of [
  'Sources',
  'APINotes',
  'Tests',
  'Benchmarks',
  'scripts',
]) {
  fs.cpSync(
    path.join(upstream, 'apple', directory),
    path.join(generated, directory),
    { recursive: true }
  );
}
// React Native normally uses a dedicated JS pthread; RNW uses a serial GCD
// queue whose physical thread may change. Match the host's current-runtime
// queue identity instead of capturing the pthread used during construction.
const runtimeFile = 'Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift';
let runtimeSource = fs.readFileSync(
  path.join(upstream, 'apple', runtimeFile),
  'utf8'
);
runtimeSource = replaceOnce(
  runtimeSource,
  `  /// Thread ID of the JavaScript thread, captured at construction time. Used by \`isOnJavaScriptThread()\`
  /// for a fast integer comparison instead of \`Thread.current.name == "..."\`.
  /// Assumes runtime initializers always run on the JS thread.
  private let jsThreadID: UInt64 = {
    var id: UInt64 = 0
    pthread_threadid_np(nil, &id)
    return id
  }()

`,
  '',
  'JavaScriptRuntime captured pthread identity'
);
runtimeSource = replaceOnce(
  runtimeSource,
  `  /// Checks whether the function is called on the JavaScript thread.
  @inline(__always)
  public final func isOnJavaScriptThread() -> Bool {
    var current: UInt64 = 0
    pthread_threadid_np(nil, &current)
    return current == jsThreadID
  }`,
  `  /// Checks whether the caller is on this runtime's RNW serial JavaScript queue.
  /// Off-queue calls are never accepted, even on the constructor's pthread.
  @inline(__always)
  public final func isOnJavaScriptThread() -> Bool {
    let expected = Unmanaged<facebook.jsi.Runtime>.passUnretained(runtimePointee).toOpaque()
    return rnwCurrentJavaScriptRuntime() == expected
  }`,
  'JavaScriptRuntime queue identity check'
);
write(path.join(generated, runtimeFile), runtimeSource);

const actorFile = 'Sources/ExpoModulesJSI/Runtime/JavaScriptActor.swift';
let actorSource = fs.readFileSync(
  path.join(upstream, 'apple', actorFile),
  'utf8'
);
actorSource = replaceOnce(
  actorSource,
  'import Foundation\n',
  `import Foundation

// Provided by the RNW host. This reads current-queue state without retaining a host.
@usableFromInline
@_silgen_name("RNWCurrentJavaScriptRuntime")
internal func rnwCurrentJavaScriptRuntime() -> UnsafeMutableRawPointer?
`,
  'JavaScriptActor host queue identity declaration'
);
actorSource = replaceOnce(
  actorSource,
  `    // Using \`assert\` instead of \`precondition\` because this check is a heuristic based on
    // thread name, not a precise isolation guarantee. Worklet runtimes legitimately run on
    // the UI thread, which would cause a false-positive crash with \`precondition\`.
    assert(
      // JavaScript thread name copied from \`RCTJSThreadManager.mm\`.
      Thread.current.name == "com.facebook.react.runtime.JavaScript" || !Thread.isMultiThreaded()
        || ProcessInfo.processInfo.processName == "xctest",
      "JavaScriptActor operations must be run on the JavaScript thread"
    )`,
  `    // This global actor only checks RNW queue membership. JavaScriptRuntime
    // additionally compares the exact runtime pointer before running work inline.
    assert(
      rnwCurrentJavaScriptRuntime() != nil,
      "JavaScriptActor operations must be run on an RNW JavaScript queue"
    )`,
  'JavaScriptActor queue isolation assertion'
);
write(path.join(generated, actorFile), actorSource);

write(
  path.join(buildRoot, 'package.json'),
  JSON.stringify(packageJSON, null, 2)
);
let manifest = fs.readFileSync(
  path.join(upstream, 'apple/Package.swift'),
  'utf8'
);
const searchStart = manifest.indexOf('let headerSearchPaths = [');
const searchEnd = manifest.indexOf('\n]\n', searchStart) + 3;
if (searchStart < 0 || searchEnd < searchStart)
  throw new Error('Upstream header-path configuration changed');
manifest =
  manifest.slice(0, searchStart) +
  `let rnwRoot = ${JSON.stringify(root)}
let rnwPlatform = ProcessInfo.processInfo.environment["RNW_PLATFORM"] ?? "watchsimulator"
let rnwHermesFrameworks = "\\(rnwRoot)/build/hermes/build/" + (rnwPlatform == "watchos" ? "output-dev" : "output-sim")
let headerSearchPaths = [
  ${JSON.stringify(headerRoot)},
  ${JSON.stringify(path.join(rn, 'ReactCommon'))},
]
` +
  manifest.slice(searchEnd);
manifest = replaceOnce(
  manifest,
  'let cxxIncludeFlags = headerSearchPaths.map({ "-I\\($0)" })',
  'let cxxIncludeFlags = headerSearchPaths.map({ "-I\\($0)" }) + ["-F\\(rnwHermesFrameworks)"]',
  'C++ flags'
);
manifest = replaceOnce(
  manifest,
  '    .iOS("16.4"),',
  '    .watchOS("9.4"),\n    .iOS("16.4"),',
  'platform declarations'
);
write(path.join(generated, 'Package.swift'), manifest);

let build = fs.readFileSync(
  path.join(upstream, 'apple/scripts/build-xcframework.sh'),
  'utf8'
);
build = replaceOnce(
  build,
  '    iphoneos)         echo "iOS" ;;',
  '    watchos)          echo "watchOS" ;;\n    watchsimulator)   echo "watchOS Simulator" ;;\n    iphoneos)         echo "iOS" ;;',
  'destination mapping'
);
build = replaceOnce(
  build,
  '    iphoneos)         echo "ios-arm64" ;;',
  '    watchos)          echo "watchos-arm64_arm64_32" ;;\n    watchsimulator)   echo "watchos-arm64-simulator" ;;\n    iphoneos)         echo "ios-arm64" ;;',
  'slice mapping'
);
build = replaceOnce(
  build,
  '  local env_args=(PATH="$PATH" HOME="$HOME" PODS_ROOT="$PODS_ROOT" RN_ROOT="$RN_ROOT")',
  '  local archs="arm64"\n  [[ "$platform" == "watchos" ]] && archs="arm64 arm64_32"\n  local env_args=(PATH="$PATH" HOME="$HOME" PODS_ROOT="$PODS_ROOT" RN_ROOT="$RN_ROOT" RNW_PLATFORM="$platform")',
  'nested build environment'
);
build = replaceOnce(
  build,
  '    BUILD_LIBRARY_FOR_DISTRIBUTION=YES \\',
  '    ARCHS="$archs" \\\n    ONLY_ACTIVE_ARCH=NO \\\n    CODE_SIGNING_ALLOWED=NO \\\n    WATCHOS_DEPLOYMENT_TARGET=9.4 \\\n    BUILD_LIBRARY_FOR_DISTRIBUTION=YES \\',
  'watch build settings'
);
build = replaceOnce(
  build,
  '  PLATFORMS=("iphoneos" "iphonesimulator")',
  '  PLATFORMS=("watchsimulator" "watchos")',
  'default platforms'
);
write(path.join(generated, 'scripts/build-xcframework.sh'), build);

let helpers = fs.readFileSync(
  path.join(upstream, 'apple/scripts/xcframework-helpers.sh'),
  'utf8'
);
helpers = replaceOnce(
  helpers,
  'EXPO_MODULES_JSI_KNOWN_SLICES=(\n',
  'EXPO_MODULES_JSI_KNOWN_SLICES=(\n  "watchos-arm64_arm64_32|watchos||arm64 arm64_32"\n  "watchos-arm64-simulator|watchos|simulator|arm64"\n',
  'slice metadata'
);
write(path.join(generated, 'scripts/xcframework-helpers.sh'), helpers);

// Upstream's module-map generator must see the exact JSI headers used by the
// watch runtime, rather than React Native's separate JSI source checkout.
const podsRoot = path.join(buildRoot, 'headers-pods');
const publicRoot = path.join(podsRoot, 'Headers/Public');
fs.mkdirSync(publicRoot, { recursive: true });
const jsiLink = path.join(publicRoot, 'React-jsi');
if (!fs.existsSync(jsiLink)) fs.symlinkSync(headerRoot, jsiLink, 'dir');
write(
  path.join(buildRoot, 'provenance.json'),
  JSON.stringify(
    {
      expoModulesJSI: packageJSON.version,
      reactNative: rnVersion,
      hermesRef,
      upstream,
      sourceChanges: [
        {
          file: runtimeFile,
          reason:
            'Use exact RNW runtime queue identity instead of a captured pthread',
        },
        {
          file: actorFile,
          reason:
            'Check RNW queue membership instead of the React Native pthread name',
        },
      ],
      configurationChanges: [
        'watchOS platform and architectures',
        'watch runtime header/framework paths',
        'watch XCFramework slice metadata',
      ],
    },
    null,
    2
  ) + '\n'
);
// CocoaPods discovers vendored frameworks within the pod root. A local symlink
// keeps its file traversal inside this pod while the real artifact stays in build/.
const podBuild = path.join(overlay, 'build');
const frameworkLink = path.join(podBuild, 'ExpoModulesJSI.xcframework');
const frameworkTarget = path.relative(
  podBuild,
  path.join(generated, 'Products/ExpoModulesJSI.xcframework')
);
fs.mkdirSync(podBuild, { recursive: true });
const existingFrameworkLink = fs.lstatSync(frameworkLink, {
  throwIfNoEntry: false,
});
if (existingFrameworkLink) {
  if (
    !existingFrameworkLink.isSymbolicLink() ||
    fs.readlinkSync(frameworkLink) !== frameworkTarget
  ) {
    throw new Error(
      `Unexpected file at ${frameworkLink}; move it aside before regenerating`
    );
  }
} else {
  fs.symlinkSync(frameworkTarget, frameworkLink, 'dir');
}
console.log(generated);
