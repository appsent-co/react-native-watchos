# Running tests

Install the workspace dependencies with `pnpm install --frozen-lockfile`, then
run `pnpm lint` and `pnpm test`. Tests require Node from `.nvmrc`, Ruby on `PATH`,
CMake, a C++17 compiler, and ICU (`libicu-dev` on Ubuntu; included with macOS).
The Ruby autolinking test also loads CocoaPods Core:

```sh
gem install --user-install cocoapods-core --version 1.16.2 --no-document
```

The Xcode project under `fixtures/watch-project.xcodeproj` is a minimal parser
fixture with iOS and watch targets. It is committed so the plugin tests run from
a fresh checkout without Expo prebuild, CocoaPods installation, or generated
`example/ios` files. Native build and runtime coverage lives in the separate
Expo modules release workflow.
