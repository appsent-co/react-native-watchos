# Non-UI Expo Modules

The watch host uses one dedicated JavaScript thread per Hermes runtime. That
matches Expo's thread checks, so **all Expo Modules JSI runtime sources compile
unchanged**. The host binding retains the scheduler handle on Expo's runtime
wrapper with an Objective-C associated object, without changing Expo's API.

Only two ordinary unified patches are maintained:

- `patches/expo-modules-core+57.0.16.patch` adds the
  `EXPO_MODULES_CORE_HEADLESS` compilation condition around UI, React, and legacy
  integration references in shared files. Other platforms retain their existing
  implementations. Our watch podspec excludes the UI-only files entirely.
- `patches/expo-modules-jsi+57.0.8.patch` adds watchOS architectures and build
  settings to Expo's SwiftPM package and framework builder. It changes no runtime
  implementation files.

These are local compatibility patches, not yet accepted upstream. Updating their
pinned source packages requires reviewing and testing the diffs against the new
release. No copied upstream implementation is checked into this repository.

## Build and validate

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build:xcframework
pnpm build:expo-modules
./poc/expo-smoke/run.sh app
./poc/expo-smoke/run.sh run
./poc/expo-smoke/run.sh device
node scripts/test-expo-consumer.cjs all
node scripts/test-expo-consumer.cjs all --expo-version 57.0.19 --workdir build/test-expo-consumer-57.0.19
```

`prepare.cjs` copies the pinned npm sources into ignored build directories and
runs `git apply --check` followed by `git apply`. It never edits the installed
packages. Rebuilding starts from the original sources again; no regex generator
or source fingerprint inventory is involved. Copyright and license files remain
with the prepared sources. Published packages include the patched Core sources
and the built JSI framework, so consumer prebuilds need no patching step.

`versions.json` pins native build inputs. `consumer-compatibility.json` separately
records the tested app Expo range. To support another Expo patch, test an actual
packed consumer app before widening that range and the peer dependency.

The runtime smoke fixture checks functions, promises, events, shared objects,
reloads, and simultaneous hosts. Thread tests cover affinity, reentrancy, nested
run-loop continuations, and concurrent shutdown. The consumer gate builds stock
iOS Expo alongside the watch integration and runs the watch module fixture.
Device architectures are compiled; physical-watch execution is separate.

See [the integration guide](../docs/docs/native/expo-modules.md) for the supported
API, automatic Expo detection, and module authoring requirements.
