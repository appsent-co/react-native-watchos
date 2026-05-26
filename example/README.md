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

## Troubleshooting

- **`err: Could not connect to the server.`** — `npx expo start` isn't
  running, or you're on a real device and `127.0.0.1` isn't reachable.
  Construct the URL with the Mac's LAN IP:
  `ReactNativeWatchOSHost.metroBundleURL(host: "192.168.1.42")`.
- **`err: The resource could not be loaded because the App Transport
Security policy requires the use of a secure connection.`** — the Watch
  target's `Info.plist` isn't set as `INFOPLIST_FILE` (check pbxproj has
  `GENERATE_INFOPLIST_FILE = NO` for the Watch target).
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
