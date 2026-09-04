# @appsent-co/react-native-watchos example

Demonstrates the watchOS Hermes pipeline end-to-end: an Expo phone app with a
`@bacons/apple-targets` watchOS extension that loads JS from the same Expo /
Metro dev server the phone uses, but bundled with `?platform=watchos`.

`metro.config.js` here wraps Expo's default config with `withWatchosMetro`
from [`@appsent-co/react-native-watchos/metro-config`](../metro-config.js), which is what
teaches Metro to resolve `*.watchos.{ts,tsx,js,jsx}` for that platform query.

## What runs

1. The Watch app's `ContentView` instantiates `ReactNativeWatchOSHost`
   (from the local Swift Package at the repo root).
2. On view appear, it calls
   `URLSession.shared.data(from: ReactNativeWatchOSHost.metroBundleURL(entry: "example/index.watchos"))`,
   which resolves to
   `http://127.0.0.1:8081/example/index.watchos.bundle?platform=watchos&dev=true&minify=false`.
   The `example/` prefix is needed because this repo is a pnpm workspace —
   Expo serves bundles under `/<package>/…`. The `.watchos` suffix is
   required because Metro's entry-point resolution is literal; the
   `.watchos.*` extension only applies to in-graph `require`s, not the
   entry path. Without it, Metro would resolve `example/index` to
   `example/index.js`. A standalone Expo app would just use the default
   `metroBundleURL()` (no `entry:`) — the default is `"index.watchos"`.
3. Metro builds [`index.watchos.tsx`](index.watchos.tsx) and streams the
   bundle back.
4. The downloaded text is passed to `RNWHermesHost.evaluate(...)`, which
   feeds it to `hermes::makeHermesRuntime()->evaluateJavaScript(...)`.
5. The bundle calls `console.log/warn/error/info`. Each call hits a JSI
   `HostFunction` that stringifies args and forwards them to a Swift block.
6. The Swift facade appends each entry to an `@Published` array — the
   SwiftUI `List` renders it.

## Running

### 1. Build the XCFrameworks (one-time)

From the repo root:

```sh
./scripts/build-xcframework.sh
```

Produces `build/xcframework/Hermes.xcframework` and
`build/xcframework/ReactNativeWatchOSCxx.xcframework`. First run is slow
(~10 min) because it clones Hermes and builds it from source.

### 2. Start Metro

From this directory:

```sh
npx expo start
```

Leave it running. Sanity-check the watchOS bundle resolves:

```sh
curl -s 'http://127.0.0.1:8081/example/index.watchos.bundle?platform=watchos&dev=true&minify=false' | head -20
```

You should see Metro's wrapper plus the `console.*` calls from
`index.watchos.tsx`.

> **pnpm workspace note:** if you're following this example as a template
> outside of a workspace, drop the `example/` prefix from both the curl
> command above and the `entry:` argument in `ContentView.swift` — your
> bundle will be served at `/index.watchos.bundle` instead.

### 3. Wire the local Swift Package into Xcode (one-time)

The Watch target needs to know about `apple/Package.swift`. This has to be
done once via the Xcode UI — the pbxproj edits aren't worth hand-crafting.

1. Open `ios/WatchosExample.xcworkspace` in Xcode.
2. `File` → `Add Package Dependencies…` → `Add Local…`.
3. Navigate to the `apple/` directory (which contains `Package.swift`),
   click **Add Package**.
4. In the product picker, add `ReactNativeWatchOS` to the
   `WatchApp Watch App` target only.
5. Verify the Watch target's **General** → **Frameworks, Libraries, and
   Embedded Content** lists `ReactNativeWatchOS` and that
   `Hermes.xcframework` is set to **Embed & Sign**.
6. Commit the resulting pbxproj diff.

### 4. Run the watch app

1. Scheme: `WatchApp Watch App`.
2. Destination: an Apple Watch simulator (any modern one — arm64 only
   currently).
3. Build & run.

### 5. Expected output

The bundle loads automatically on view appear. Four entries appear in the
SwiftUI list, status flips to `ok`:

```
log     hello from hermes on the watch
warn    this is a warning
error   this is an error
info    platform: 2 {"ok":true,"list":[1,2,3]}
```

Edit `index.watchos.ts` and tap the reload button in the corner — the
watch re-fetches and re-evaluates without rebuilding the native app.

## Dev-server endpoint (host / port)

`ContentView.swift` calls `ReactNativeWatchOSHost.defaultBundleURL(entry:)`
with no `host:`/`port:`. In DEBUG the host reads the `RNWDevServerHost` /
`RNWDevServerPort` keys from the watch target's `Info.plist`, where they
expand from the `RNW_DEV_SERVER_HOST` / `RNW_DEV_SERVER_PORT` build
settings (unset ⇒ `127.0.0.1:8081`). Nothing in this example hand-maintains
those keys: the package's config plugin
([`plugin/src/withWatchInfoPlist.js`](../plugin/src/withWatchInfoPlist.js))
adds them — plus the `NSAllowsLocalNetworking` ATS exception — to
[`targets/watch/Info.plist`](targets/watch/Info.plist) whenever they are
missing, on every `expo prebuild` (and `npx react-native-watchos init`
writes them up front), so any app scaffolded with this package gets the
same mechanism. The endpoint is therefore an `xcodebuild` argument (or an
xcconfig line), never a Swift edit:

```sh
# 8081 already held by another Metro (e.g. a second Expo app on this Mac)
npx expo start --port 8082
xcodebuild ... RNW_DEV_SERVER_PORT=8082

# physical watch: reach the Mac over the LAN (plain http — allowed by the
# NSAllowsLocalNetworking ATS exception in targets/watch/Info.plist)
xcodebuild ... RNW_DEV_SERVER_HOST=192.168.1.42
```

`console.*` output from the watch is POSTed back to the same (host, port)
the bundle was fetched from, so it shows up in that Metro's terminal as
`watchOS LOG ...`. Explicit `host:`/`port:` arguments to `defaultBundleURL`
still take precedence over the plist.

## Troubleshooting

- **`err: Could not connect to the server.`** — `npx expo start` isn't
  running, it is on a different port (another Metro already holds 8081 —
  build with `RNW_DEV_SERVER_PORT=<port>`, see
  [Dev-server endpoint](#dev-server-endpoint-host--port)), or you're on a
  real device and `127.0.0.1` isn't reachable — build with
  `RNW_DEV_SERVER_HOST=<Mac LAN IP>` or pass `host:` to `defaultBundleURL`.
- **`err: The resource could not be loaded because the App Transport
Security policy requires the use of a secure connection.`** — the DEBUG
  bundle URL is plain `http://` to a non-loopback host (a physical watch
  talking to the Mac's LAN IP), and App Transport Security refuses it.
  `targets/watch/Info.plist` carries
  `NSAppTransportSecurity → NSAllowsLocalNetworking = true` for exactly
  this (the config plugin adds it when missing, so a scaffolded app has
  it too; it only opens RFC1918 / `.local` hosts). This is *not* an
  `INFOPLIST_FILE` problem —
  the generated pbxproj sets both `GENERATE_INFOPLIST_FILE = YES` and
  `INFOPLIST_FILE = ../targets/watch/Info.plist`, and the source plist is
  merged into the product (check with
  `plutil -p <DerivedData>/Build/Products/Debug-watchos/watch.app/Info.plist`).
- **Bundle response includes `ReferenceError: Property 'React' doesn't
exist`** — your `index.watchos.ts` (or something it imports) is reaching
  into React / RN. The watch runtime is bare Hermes; keep watch code
  Hermes-only or guard imports behind `*.watchos.*` files.
- **`No such module 'ReactNativeWatchOS'`** at build time — the local SPM
  package isn't added to the target, or the XCFramework wasn't built yet
  (run `scripts/build-xcframework.sh` first).
- **Linker errors mentioning `_hermes_makeHermesRuntime` or similar** — the
  Watch target isn't embedding `Hermes.xcframework`. Set it to Embed & Sign.

## What this example does NOT prove

- The cxxreact bridge (we're not registering native modules)
- TurboModules
- Fabric / any UI rendering on the JS side
- Bytecode bundle loading (HBC) — Metro serves plain JS in dev

Those land in follow-up steps once the pipeline is confirmed working.

## Firefly demo (FireflyDB Stage 1 record)

`src/demos/FireflyDemo.tsx` is the Stage 1 gate of the FireflyDB watch
proof of concept: it opens an op-sqlite **file** database, calls
`db.loadExtension(getLibraryPath(), getEntryPoint())` against the
`Firefly.framework` shipped in `@fireflydb/op-sqlite-driver`'s
`ios/Firefly.xcframework` (watch slices since 1.0.18), and runs
`SELECT count(*) AS n FROM pragma_function_list WHERE name LIKE 'firefly%'`.
It mounts at app launch like every gallery demo, so the result shows up in
Metro without navigating:

```
watchOS LOG  [FireflyDemo] canary=33 driverEntry=<probe> path=.../watch.app/Frameworks/Firefly.framework/Firefly
```

Status as of the last run (Apple Watch Series 11 42mm simulator, watchOS
26.4): **canary = 33 on the simulator; the device (watchOS SDK) build links
and embeds `Firefly.framework` for both `arm64_32` and `arm64`.** No
watchOS *device* slice of libfirefly has executed yet — see the physical
watch notes below.

### Recipe

```sh
# repo root
pnpm install
cd example
npx expo prebuild -p ios --clean      # --clean is mandatory once the watch target exists (see below)
npx expo start --port 8082            # any port; 8081 is often held by another Metro
cd ios
xcodebuild -workspace watchosexample.xcworkspace -scheme watch -configuration Debug \
  -destination 'platform=watchOS Simulator,id=<watch UDID>' \
  -derivedDataPath /tmp/dd CODE_SIGNING_ALLOWED=NO RNW_DEV_SERVER_PORT=8082 build
xcrun simctl install <watch UDID> /tmp/dd/Build/Products/Debug-watchsimulator/watch.app
xcrun simctl launch  <watch UDID> com.appsent.watchosexample.watch
```

Caveats that cost time the first time round:

- **Port.** The Stage 1 runs on the reference Mac used `--port 8082` and
  `RNW_DEV_SERVER_PORT=8082` because 8081 was held by another app's Metro.
  The endpoint comes from the Info.plist keys described in
  [Dev-server endpoint](#dev-server-endpoint-host--port); nothing in Swift
  changes between ports.
- **`expo prebuild` must be `--clean`** once `ios/` already has the watch
  target: a non-clean prebuild dies inside `@bacons/apple-targets` 4.0.7
  (`withIosXcodeProjectBeta2BaseMod: Cannot read properties of undefined
  (reading 'removeFromProject')` in the "Target watch already exists"
  path). The example's own `prebuild` script already passes `--clean`.
- **`react-native-get-random-values` is a declared dependency here on
  purpose.** It is a non-optional peer of `@fireflydb/op-sqlite-driver`
  (needed by the driver's *iOS* entry), so pnpm auto-installs it anyway;
  declaring it pins 2.0.0 and keeps the native graph the same under
  package managers that do not auto-install peers. It autolinks as an
  iOS-only CocoaPod (`s.platforms` has no `:watchos`), so it is absent from
  `Pods-watch` and plays no part in the watch build.
- **The `watch` scheme builds the iOS host app too** (Xcode's auto-scheme
  for an embedded watch app), so a Debug watch build also compiles the
  iPhone target. React Native's `[RNDeps] Replace React Native Core` phase
  swaps `Pods/React-Core-prebuilt` *in place* whenever the configuration
  differs from `Pods/React-Core-prebuilt/.last_build_configuration`. Two
  concurrent `xcodebuild`s with different configurations against the same
  `ios/Pods` (e.g. a Release device build started while a Debug simulator
  build is compiling) therefore break the running one with
  `cannot open file '.../React-Core-prebuilt/yoga/Yoga.h'` — re-run after
  the other build finishes. A single build on cold DerivedData after a
  fresh `pod install` (no `.last_build_configuration`) succeeds first time.
- **Driver package entry on the watch.** The demo also `require`s
  `@fireflydb/op-sqlite-driver` itself (guarded) and reports the outcome as
  `driverEntry=`. Metro does resolve it to the driver's
  `src/index.watchos.ts` (the served bundle contains `index.watchos.ts` and
  neither `src/index.ts` nor `src/polyfill.ts`), but that entry pulls in
  `@fireflydb/core`, which constructs `TextDecoder`/`TextEncoder` at module
  scope, and this runtime has no `TextDecoder` — so evaluation currently
  fails with `Property 'TextDecoder' doesn't exist` (plan gap G7, Stage 2).
  Until the runtime provides it, the canary falls back to the TurboModule
  spec (`src/NativeFireflyClient`) for `getLibraryPath`/`getEntryPoint`.
- **`getLibraryPath` / `getEntryPoint` are not yet a published driver
  API.** `@fireflydb/op-sqlite-driver@1.0.18` (fireflydb `develop`
  `c01c37b`, the exact release) only exposes them through the TurboModule
  spec. This workspace re-exports them from `src/FireflyClientModule.ts`
  and `src/client.ts` via a pnpm patch
  (`patches/@fireflydb__op-sqlite-driver@1.0.18.patch`, registered in
  `pnpm-workspace.yaml`), which is a *consumer-side* stopgap: the same
  diff applies cleanly to `fireflydb/sdk/typescript/packages/op-sqlite`
  (`git apply --check` passes) and is the change to land there as 1.0.19.
  Two consequences to keep in mind: (1) on the watch the patched entry
  cannot evaluate until G7 above is fixed, so today the demo still ends
  up on the deep import (`driverEntry=eval failed: Property 'TextDecoder'
  doesn't exist`) and the patch buys nothing at runtime yet; (2) a
  consumer on yarn 1.22 (sweepy) has no `patchedDependencies` — see the
  Stage 4 checklist below.

### Stage 4 checklist (what a consumer app such as sweepy must carry)

These are the things this example needed that do **not** arrive
automatically with `npx react-native-watchos init` + `expo prebuild`:

1. **`expo.ios.appleTeamId` in `app.json`** (here `36V463PDAY`, the team of
   the only valid `Apple Development` identity on the reference Mac).
   `@bacons/apple-targets` stamps it as `DEVELOPMENT_TEAM` on every
   target and warns on each prebuild / Metro start without it. Setting the
   team in Xcode's UI does *not* survive `expo prebuild --clean` (mandatory
   here, see above), and without a team a physical-watch install fails at
   signing. The CocoaPods `Pods-watch-frameworks.sh` re-sign of
   `Firefly.framework` also only runs in a signed build.
2. **`react-native-get-random-values`** as an explicit dependency (yarn
   1.22 does not auto-install the driver's peers). iOS-only pod; absent
   from the watch target.
3. **The driver re-exports.** Either wait for `@fireflydb/op-sqlite-driver`
   ≥ 1.0.19 carrying the diff in
   `patches/@fireflydb__op-sqlite-driver@1.0.18.patch`, apply the same
   patch with `patch-package` (yarn has no `patchedDependencies`), or keep
   deep-importing `@fireflydb/op-sqlite-driver/src/NativeFireflyClient`
   for `getLibraryPath` / `getEntryPoint`. None of the three matters until
   G7 lets `src/index.watchos.ts` evaluate on the watch.
4. **G7** (`TextDecoder` / `TextEncoder` on the watch runtime) — owned by
   `@appsent-co/react-native-watchos`, Stage 2.
5. **`@appsent-co/react-native-watchos` at a version whose config plugin
   writes the Info.plist keys** (`RNWDevServerHost` / `RNWDevServerPort`,
   `NSAllowsLocalNetworking`). Older versions leave the scaffolded watch
   target on a hard-coded `127.0.0.1:8081` and refuse the LAN bundle fetch.

### Device build (watchOS SDK)

Two flavours. The **signed** one is what a physical watch actually
installs and is the one to trust; the **unsigned** one is a link check
only (it skips the CocoaPods framework re-sign step, so it proves the
watch binary links `Firefly.framework` and that the framework is embedded
fat, nothing more).

**Signed** — needs `expo.ios.appleTeamId` in `app.json` (see the Stage 4
checklist) and an Xcode account for that team; `-allowProvisioningUpdates`
lets `xcodebuild` create/refresh the App IDs and profiles without opening
Xcode:

```sh
xcodebuild -workspace watchosexample.xcworkspace -scheme watch -configuration Debug \
  -destination 'generic/platform=watchOS' -derivedDataPath /tmp/dd-signed \
  -allowProvisioningUpdates build
codesign -dvv /tmp/dd-signed/Build/Products/Debug-watchos/watch.app 2>&1 | grep -E 'Authority|TeamIdentifier'
codesign -dvv /tmp/dd-signed/Build/Products/Debug-watchos/watch.app/Frameworks/Firefly.framework 2>&1 | grep TeamIdentifier
codesign --verify --deep --strict -v /tmp/dd-signed/Build/Products/Debug-watchos/watch.app
```

On the reference Mac this succeeds first time on cold DerivedData:
`watch.app` and the embedded `Firefly.framework` are both signed by the
team's `Apple Development` identity (`Pods-watch-frameworks.sh`'s
`code_sign_if_enabled` re-sign runs — it is skipped in the unsigned
flavour), `codesign --verify --deep --strict` passes, and Xcode picked the
team's wildcard *iOS Team Provisioning Profile* (`<TEAM>.*`) for the watch
target — watch apps are provisioned by iOS-platform profiles, there is no
separate watchOS profile type, so the absence of a profile "mentioning
watchOS" is not a problem. What a real install still needs is the watch's
UDID in that profile, which Xcode registers on first run from the UI (or
via `-allowProvisioningUpdates` once the watch is paired).

**Unsigned link check** — the three `CODE_SIGNING_*` overrides are exactly
what `code_sign_if_enabled` tests, so no re-sign happens:

```sh
xcodebuild -workspace watchosexample.xcworkspace -scheme watch -configuration Debug \
  -destination 'generic/platform=watchOS' -derivedDataPath /tmp/dd-dev \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" build
lipo -info /tmp/dd-dev/Build/Products/Debug-watchos/watch.app/Frameworks/Firefly.framework/Firefly   # arm64_32 arm64
otool -L  /tmp/dd-dev/Build/Products/Debug-watchos/watch.app/watch.debug.dylib | grep Firefly
```

To force the ILP32 slice (what every pre-watchOS-26 / pre-Series-9 watch
loads), scope `ARCHS` to the watch SDK through an xcconfig — a bare
`ARCHS=arm64_32` on the command line also hits the iOS host target and
fails, and `'ARCHS[sdk=watchos*]=arm64_32'` is not parsed as a conditional
on the command line:

```sh
printf 'ARCHS[sdk=watchos*] = arm64_32\nONLY_ACTIVE_ARCH = NO\n' > /tmp/arm64_32.xcconfig
xcodebuild ... -destination 'generic/platform=watchOS' -xcconfig /tmp/arm64_32.xcconfig build
# watch.debug.dylib is then arm64_32-only; Firefly.framework stays fat, dyld picks the slice.
```

### Physical watch (not yet run — no watch is paired with the reference Mac)

1. Pair the watch. `expo.ios.appleTeamId` is already in `app.json` (so it
   survives the mandatory `expo prebuild --clean`; a team picked in Xcode's
   UI does not). Either open `ios/watchosexample.xcworkspace`, select the
   `watch` scheme and the watch as destination and run — Xcode registers
   the watch's UDID and refreshes the profile on first run — or build from
   the command line with the signed recipe above plus
   `-destination 'platform=watchOS,id=<watch UDID>' -allowProvisioningUpdates`
   and install with `xcrun devicectl device install app`.
2. Debug over Metro: `npx expo start --port 8082` and build with
   `RNW_DEV_SERVER_HOST=<Mac LAN IP> RNW_DEV_SERVER_PORT=8082`. The
   `NSAllowsLocalNetworking` exception in `targets/watch/Info.plist` is what
   lets the plain-http bundle fetch through ATS on a device.
   Alternatively use a Release build, which embeds `main.jsbundle` and needs
   no dev server (the canary line then only shows on screen in the Firefly
   gallery entry, not in Metro).
3. Run twice: once as-is (a Series 9+ on watchOS 26 loads the `arm64`
   slice) and once with the `arm64_32` xcconfig above so the ILP32 slice is
   also exercised. Record both `canary=` values; libfirefly's `arm64_32`
   build is a tier-3 Rust target and is the more likely one to misbehave.
