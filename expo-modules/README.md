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

The watch build also compiles Expo's legacy module registry, promise callbacks,
file-system helpers, and permission-requester service. Each host owns its service
instances. Persistent file logging uses throwing Foundation file operations,
removing its dependency on the UI-coupled `EXUtilities` exception wrapper. The
permission service's unused UI utility imports are removed as well.

These are local compatibility patches, not yet accepted upstream. Updating their
pinned source packages requires reviewing and testing the diffs against the new
release. No copied upstream implementation is checked into this repository.

## Build and validate

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build:xcframework
pnpm build:expo-modules
pnpm --dir example exec expo prebuild -p ios --no-install
(cd example/ios && pod install)
pnpm verify:package
```

`prepare.cjs` copies the pinned npm sources into ignored build directories and
runs `git apply --check` followed by `git apply`. It never edits the installed
packages. Rebuilding starts from the original sources again; no regex generator
or source fingerprint inventory is involved. Copyright and license files remain
with the prepared sources. Published packages include the patched Core sources
and the built JSI framework, so consumer prebuilds need no patching step.

`versions.json` pins native build inputs. The package's Expo peer dependency
records the supported app range. Validate the example before widening it.

The [example app](../example/README.md) contains a local Swift Expo module and a
watch demo. Native CI builds that app with stock iOS Expo and the watch integration,
including both watch device architectures. Focused unit tests cover the runtime
thread, autolinking, Metro, config plugin, and patch preparation.

See [the integration guide](../docs/docs/native/expo-modules.md) for the supported
API, automatic Expo detection, and module authoring requirements.
