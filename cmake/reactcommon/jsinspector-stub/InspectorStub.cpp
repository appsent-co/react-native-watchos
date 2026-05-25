// Stub implementation of jsinspector-modern symbols referenced by cxxreact.
//
// On watchOS we don't ship the Chrome DevTools / CDP integration:
//   - The real implementation depends on WebSocketInterfaces / NetworkIOAgent
//     and a JS package server, none of which are appropriate for a watch app.
//   - Binary size budget is the main constraint — pulling in inspector adds
//     ~megabytes of code that's never useful at runtime on the watch.
//
// cxxreact only references a small surface of jsinspector_modern at link time
// (a handful of constructors / destructors / virtual table entries). This file
// provides weak no-op definitions for that surface.
//
// TODO(spm-skeleton): enumerate the exact symbols cxxreact's .cpp files
// reference once we attempt a real build, and provide stubs for each. The list
// below is the starting point based on grep'ing #include lines:
//
//   - jsinspector_modern::HostTarget
//   - jsinspector_modern::InstanceTarget
//   - jsinspector_modern::RuntimeTarget
//   - jsinspector_modern::getInspectorInstance() / IInspector
//
// For the first compile attempt the stubs may be empty — the compile errors
// will tell us exactly which symbols cxxreact is grabbing.

namespace facebook::react::jsinspector_modern {

// Intentionally empty: this file exists so the build system has a real
// translation unit to compile for the jsinspector_modern_stub target. Symbol
// stubs will be added here once the first link attempt reveals which ones
// cxxreact actually references.

} // namespace facebook::react::jsinspector_modern
