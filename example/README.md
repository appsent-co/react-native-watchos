# @appsent-co/react-native-watchos example

Demonstrates the watchOS Hermes pipeline end-to-end: an Expo phone app with a
`@bacons/apple-targets` watchOS extension that loads JS from the same Expo /
Metro dev server the phone uses, but bundled with `?platform=watchos`.

`metro.config.js` here wraps Expo's default config with `withWatchosMetro`
from [`@appsent-co/react-native-watchos/metro-config`](../metro-config.js), which is what
teaches Metro to resolve `*.watchos.{ts,tsx,js,jsx}` for that platform query.

## Running

Build the native frameworks and generate the iPhone/watch project from the repo root:

```sh
pnpm build:xcframework
pnpm build:expo-modules
pnpm --dir example exec expo prebuild -p ios --no-install
(cd example/ios && pod install)
```

Start Metro with `pnpm --dir example start`, open
`example/ios/watchosexample.xcworkspace`, and run the `watch` scheme on a watch
simulator. Release builds embed the JavaScript bundle and run without Metro.

## Expo Modules example

Open **Demos → Expo Modules** on the watch. It displays **Hello from Expo Modules!**
by calling a synchronous Swift `Function` and an `AsyncFunction` through
`requireNativeModule`.

The local module is in [`modules/expo-example`](modules/expo-example). Expo discovers
it automatically from `example/modules`; its config declares both Apple and watchOS
support. The podspec uses stock Expo Core on iOS and RNWExpoModulesCore on watchOS.
The Swift implementation is shared by both targets.

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
  -derivedDataPath /tmp/dd RNW_DEV_SERVER_PORT=8082 build
xcrun simctl install <watch UDID> /tmp/dd/Build/Products/Debug-watchsimulator/watch.app
xcrun simctl launch  <watch UDID> com.appsent.watchosexample.watch
```

Caveats that cost time the first time round:

- **A relaunch may serve a stale evaluation.** `simctl terminate` +
  `launch` normally re-fetches the bundle, but once a relaunch was observed
  running the previous one. `simctl uninstall` + `install` + `launch`
  always forces a fresh fetch — do that before concluding anything about a
  JS-only edit.

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
  declaring Expo SDK 57's supported `~1.11.0` version keeps the native
  graph the same under
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
  `driverEntry=`. Metro resolves it to the driver's `src/index.watchos.ts`
  (the served bundle contains `index.watchos.ts` and neither `src/index.ts`
  nor `src/polyfill.ts`), and that entry pulls in `@fireflydb/core`, which
  constructs `TextDecoder`s at module scope. Before Stage 2 the runtime had
  no `TextDecoder`, so evaluation failed with `Property 'TextDecoder'
  doesn't exist` and the canary fell back to the TurboModule spec
  (`src/NativeFireflyClient`) for `getLibraryPath`/`getEntryPoint`. The
  runtime now installs it (see the runtime probe below) and the line reads
  `driverEntry=ok (index.watchos.ts)` — the `.watchos.ts` entry is
  identified by its `crypto.getRandomValues` guard, which the demo makes
  observable by hiding the global for the duration of one call.
- **`getLibraryPath` / `getEntryPoint` are not yet a published driver
  API.** `@fireflydb/op-sqlite-driver@1.0.18` (fireflydb `develop`
  `c01c37b`, the exact release) only exposes them through the TurboModule
  spec. This workspace re-exports them from `src/FireflyClientModule.ts`
  and `src/client.ts` via a pnpm patch
  (`patches/@fireflydb__op-sqlite-driver@1.0.18.patch`, registered in
  `pnpm-workspace.yaml`), which is a *consumer-side* stopgap: the same
  diff applies cleanly to `fireflydb/sdk/typescript/packages/op-sqlite`
  (`git apply --check` passes) and is the change to land there as 1.0.19.
  Two consequences to keep in mind: (1) the patched entry now evaluates
  on the watch (Stage 2), so the demo takes `getLibraryPath` /
  `getEntryPoint` from the package entry and the deep import is only the
  fallback; (2) a consumer on yarn 1.22 (sweepy) has no
  `patchedDependencies` — see the Stage 4 checklist below.

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
   for `getLibraryPath` / `getEntryPoint`.
4. **`@appsent-co/react-native-watchos` at a version whose runtime carries
   the Stage 2 globals** (`crypto.getRandomValues`, `TextDecoder`,
   `Symbol.asyncIterator`, `queueMicrotask`, the rewritten `WebSocket`) —
   the runtime APIs `@fireflydb/core` needs, listed
   in [`docs/docs/runtime-globals.md`](../docs/docs/runtime-globals.md) and
   asserted by the runtime probe below. `@fireflydb/core` constructs its
   `TextDecoder`s at module scope, so a watch entry that imports the SDK
   before `/renderer` or `/dev-support` should import
   `@appsent-co/react-native-watchos/polyfills` first.
5. **`@appsent-co/react-native-watchos` at a version whose config plugin
   writes the Info.plist keys** (`RNWDevServerHost` / `RNWDevServerPort`,
   `NSAllowsLocalNetworking`). Older versions leave the scaffolded watch
   target on a hard-coded `127.0.0.1:8081` and refuse the LAN bundle fetch.
6. **An in-memory device-key store.** The runtime probe passes the SDK's
   `InMemorySecureStorage` to `createFireflyClient`. Reinitializing a client
   with the same store keeps its identity for that run. A fresh store or
   app relaunch creates a new identity; this example needs no persistent
   secret storage.

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

## WebSocket conformance demo (FireflyDB Stage 2)

`src/demos/WebSocketDemo.tsx` is the acceptance test for the watch runtime's
`WebSocket` global (`apple/Sources/ReactNativeWatchOSCxx/RNWWebSocket.mm`,
documented in [`docs/docs/runtime-globals.md`](../docs/docs/runtime-globals.md)).
It is written against exactly the surface `@fireflydb/core`'s `DomWsConn` /
`awaitWsOpen` / `RNWebSocketDriver` and `@fireflydb/web`'s
`WebWebSocketDriver` touch, and its `sdk-*` checks (`sdk-domwsconn`,
`sdk-rnwebsocketdriver`, `sdk-wsCloseError`, `sdk-backoff-4013`) run a
verbatim copy of `DomWsConn` + `WsRecvQueue` + `RNWebSocketDriver`, so a
green run means both SDK drivers work on the watch unchanged —
`RNWebSocketDriver` is the one `@fireflydb/op-sqlite-driver` composes by
default on its watch entry, and it carries the JWT in React Native's
`new WebSocket(url, protocols, { headers })` argument. It mounts at app
launch like every gallery demo, so the result shows up in Metro without
navigating.

`scripts/ws-echo-server.js` is the fixture it drives (Node `ws`, an example
devDependency). Paths: `/echo` (text + binary echo, selects the **first**
offered subprotocol, the relay's rule), `/noproto` (selects none),
`/headers` (selects the first offer, then sends the upgrade request's
headers back as one binary JSON frame — what the server actually saw),
`/close1013` and `/close?code=&reason=&delay=` (server-initiated closes),
`/drop` (TCP destroyed with no close frame → unclean 1006), `/reject` (401 on
the upgrade). Over plain HTTP it serves `GET /` (the ArrayBuffer check) and
`POST /log` (the demo's transcript).

```sh
cd example
node scripts/ws-echo-server.js            # port 8099, leave running
npx expo start --port 8092 > /tmp/metro.log 2>&1 &
cd ios && xcodebuild -workspace watchosexample.xcworkspace -scheme watch \
  -configuration Debug -destination 'platform=watchOS Simulator,id=<watch UDID>' \
  -derivedDataPath /tmp/dd CODE_SIGNING_ALLOWED=NO RNW_DEV_SERVER_PORT=8092 build
xcrun simctl install <watch UDID> /tmp/dd/Build/Products/Debug-watchsimulator/watch.app
xcrun simctl launch  <watch UDID> com.appsent.watchosexample.watch
grep 'WebSocketDemo' /tmp/metro.log   # or the echo server's own stdout
```

Each check prints one greppable line — `[WebSocketDemo] PASS|FAIL <name>:
<detail>` — followed by `[WebSocketDemo] DONE pass=<n> fail=<m>`. A check
that needs the public internet (`tls-public`, against
`wss://echo.websocket.org`) reports `WARN` instead of `FAIL` when it cannot
connect and is left out of the gate. The demo reports through two channels
because the `console.*` pipe only reaches the Metro that served the bundle
(a Release build, a physical watch, or a Metro restarted under a running app
loses it), and Metro prints the lines in arrival order rather than emission
order: the fixture server's stdout (`watch | …` lines, from one `POST /log`
at the end) always has the ordered transcript.

Touching `RNWWebSocket.mm` means rebuilding the prebuilt
`ReactNativeWatchOSCxx.xcframework` (`pnpm build:xcframework` at the repo
root — or, with the Hermes / JSI / reactcommon slices already in `build/`,
just steps 3–5 of `scripts/build-xcframework.sh`) before the app build picks
it up; the `[CP] Copy XCFrameworks` phase copies it on every build.

Status on the rewritten shim (Apple Watch Series 11 42mm simulator, watchOS
26.4): **`DONE pass=38 fail=0`** — every WebSocket check passes, including
the four SDK checks, `binary-echo-8mib`, `close-1006-drop` /
`close-follows-error` (a `close` after every transport failure),
`microtask-drain` (`event,micro,timer`), `runtime-queueMicrotask` (it
reported `pass=30 fail=1` before `polyfills` installed `queueMicrotask`),
and the checks added after review: `headers-forwarded` /
`headers-with-protocols` / `headers-invalid` (React Native's `{ headers }`
argument reaches the upgrade request, `Authorization` included, the
handshake fields URLSession owns are dropped, CRLF and non-token names are
refused), `sdk-rnwebsocketdriver` (the SDK's default RN driver, verbatim,
sees its bearer on the server side), `text-echo-nul` (a text frame with an
embedded U+0000 is byte-exact — the receive path used to stop at the first
NUL) and `close-1013` / `close-1012-1014` / `sdk-wsCloseError` (see
below). Baseline on the pre-rewrite shim was `pass=7 fail=22`.

One close-code subtlety is worth knowing because the relay depends on it.
`URLSessionWebSocketTask.CloseCode` has no case for 1012–1014, and 1013 is
`WS_CLOSE_TRY_AGAIN_LATER`, the relay's back-off signal. URLSession reports
those three as 1005 — but hands the *raw close-frame payload* (the two-byte
code, then the reason) over as the reason: measured on macOS and on the
watch, `1013 "slow down"` arrives as `03 f5 73 6c 6f 77 20 64 6f 77 6e`,
while a genuine no-code close arrives as 1005 with an empty reason and every
code in the enum arrives with its reason only. Since RFC 6455 only ever
puts a reason after a code, "1005 with bytes" is unambiguous and the shim
decodes the real code and reason back. `close-1013`, `close-1012-1014`
(1012, 1014, a 1013 with no reason and one with a NUL in the reason) and
`sdk-wsCloseError` (a 1013 through the SDK's own `DomWsConn`, rejecting
`recv()` with `WsCloseError(1013, 'slow down')`, which is exactly what
`isTryAgainLater` tests) pin this; `close-1011-reason` and
`sdk-backoff-4013` cover the ordinary path. An earlier version of the shim
decoded the reason through an `NSString` round trip, which returned nil on
the `0xf5` byte — so the same close read as `1005 reason=""` and was
recorded as a deviation. It is not one.

## Runtime probe (FireflyDB Stage 2 regression check)

`src/demos/RuntimeProbeDemo.tsx` asserts every global the FireflyDB JS SDK
needs from the watch runtime, in the exact shape the SDK uses it (each
check names the `@fireflydb/core` source line it protects). It mounts at
launch like every gallery demo and prints one line per check:

```
[RuntimeProbe] PASS <name>: <detail>
[RuntimeProbe] FAIL <name>: <detail>
[RuntimeProbe] DONE pass=<n> fail=<m>
```

Groups: `crypto` (`getRandomValues` fills in place and returns the same
object, honours `byteOffset`, fills `Uint32Array` / `BigInt64Array`, the
65536-byte quota and the `TypeMismatchError` / `QuotaExceededError` names,
entropy across draws, v4 `randomUUID`); base64 (`atob` / `btoa` over the
SDK's 0x8000-chunk fallback at 32773 bytes, invalid input, the 43-char
base64url peer id, which `base64.ts` branch is live); text (`TextEncoder`
bytes, `TextDecoder` constructed with `{fatal: true}` as the SDK does at
module scope, astral round trip, five invalid sequences under `fatal`,
WHATWG maximal-subpart replacement under lossy, BOM, every input type,
label normalisation, `{stream: true}`); binary / numeric (`DataView`
BigInt64 round trip, BigInt exactness above 2^53); scheduling (timers,
`queueMicrotask` ordering, `setImmediate` staying a macrotask,
`Symbol.asyncIterator`, `for await` over the SDK's `WsRecvQueue` shape,
the unhandled-rejection tracker); and platform (`WebSocket` presence,
with conformance checked by the WebSocket demo).

The final checks load `@fireflydb/op-sqlite-driver` and `@fireflydb/core`
and run `loadOrCreateDeviceKey` over the SDK's `InMemorySecureStorage`.
They verify that the same store returns the same identity and a fresh
store gets a new one.

`client-init` composes `createFireflyClient(...)` over an app-owned
op-sqlite handle, an in-memory store, a developer public key and one
bundled signed migration. It calls `await client.init()` offline and
checks that `client.peerID` derives from the in-memory seed,
`_firefly_config.developer_pubkey` is pinned, the migration chain head is
1 and the migration's table exists. A second client uses the same handle
and store to verify reinitialization without changing identity or
reapplying the migration.

The SDK only consumes signed envelopes, so the probe packs and signs its
own one-envelope chain (`FMIG` header + `signDeviceProof`) under a fixed
developer key. The DB file is deleted at the end, and the store is
released with the probe. Device keys are ephemeral: nothing is retained
across app launches. `@fireflydb/core` is an explicit dependency because
an unresolvable `require` breaks the bundle at build time.

Fast Refresh full reloads with sockets in flight were also exercised on
this build (and repeated after the native hosts learned to release their
JSI handles on the JS queue only — see [Runtime globals →
Scheduling](../docs/docs/runtime-globals.md#scheduling)): six fresh
launches each force-reloaded 3–6 s in (touching the
bundle entry, which has no root boundary, so Metro's update ends in
`performFullRefresh` → `__RNW_RELOAD` → a new `RNWHermesHost` while the
old one — HMR socket, demo sockets, XHR, timers — is torn down on a
utility queue), twelve full reloads in all, every process surviving with
its PID and no crash report. The runtime pointer every native host copies
now lives in a shared cell the host clears on the JS queue ahead of
destroying the runtime, so a callback queued behind the teardown no-ops
instead of draining microtasks on freed memory. The one `watchOS ERR` a
reload does print is `Failed to install op-sqlite … JSI bindings`: op-sqlite
refuses to install on a second runtime in the same process (the plan's
dev-only gap G12), so the demos do not remount after a reload — relaunch
the app when touching DB code.

Touching `RNWCrypto.mm`, `RNWTextDecoder.mm` or `RNWHermesHost.mm` means
rebuilding the prebuilt `ReactNativeWatchOSCxx.xcframework` (see the
WebSocket section). Run the probe on a paired physical watch as well to
verify device behavior, including the `grv-entropy` check for
`SecRandomCopyBytes`.

