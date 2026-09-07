import Foundation
import Combine
import ReactNativeWatchOS
import ReactNativeWatchOSCxx
import RNWExpoModulesProofFixture

/// Uses the shipped Swift host, automatic provider discovery, and real Metro
/// output. A second host remains alive while the primary host reloads twice.
@MainActor
final class ExpoSmokeRunner: ObservableObject {
  private var host: ReactNativeWatchOSHost?
  private var companion: ReactNativeWatchOSHost?
  private var started = false
  private var generation = 0
  private var explicitFactoryCalls = 0
  private var checks: [String] = []
  private var consoleLogs: [String] = []
  private var completed = false

  func start() {
    guard !started else { return }
    started = true
    RNWExpoModulesProofLifecycle.reset()
    guard Bundle.main.object(forInfoDictionaryKey: ReactNativeWatchOSHost.runtimeBindingFactoryInfoKey) as? String == "RNWExpoRuntimeBindingFactory" else {
      fail("The built app Info.plist is missing its runtime binding factory")
      return
    }
    // This one uses the generic Info.plist factory, as generated consumer apps do.
    host = ReactNativeWatchOSHost()
    host?.onConsoleLog = { [weak self] level, message in
      self?.captureLog(level: level, message: message, source: "primary")
    }
    // Explicit factory injection remains supported and coexists with the default.
    guard let factory = NSClassFromString("RNWExpoRuntimeBindingFactory") as? RNWRuntimeBindingFactory.Type else {
      fail("The optional pod's factory was not retained for Objective-C discovery")
      return
    }
    companion = ReactNativeWatchOSHost(runtimeBindingFactory: { [weak self] in
      self?.explicitFactoryCalls += 1
      return factory.makeRuntimeBinding()
    })
    companion?.onConsoleLog = { [weak self] level, message in
      self?.captureLog(level: level, message: message, source: "companion")
    }
    Task { [weak self] in
      guard let self else { return }
      do {
        try await self.companion?.evaluate(source: "globalThis.__RNW_EXPO_SMOKE_COMPANION = true", url: "<smoke-mode>")
        try await self.companion?.loadBundle(from: self.bundleURL)
      } catch { self.fail(error.localizedDescription) }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 25) { [weak self] in
      self?.fail("Timed out waiting for Expo native assertions")
    }
  }

  private var bundleURL: URL {
    guard let url = Bundle.main.url(forResource: "smoke", withExtension: "jsbundle") else {
      preconditionFailure("Metro smoke.jsbundle is missing from the smoke app")
    }
    return url
  }

  private func runGeneration() {
    guard !completed else { return }
    generation += 1
    Task { [weak self] in
      guard let self else { return }
      do {
        // The same public host object recreates Hermes and its binding on calls 2/3.
        try await self.host?.loadBundle(from: self.bundleURL)
      } catch { self.fail(error.localizedDescription) }
    }
  }

  private func captureLog(level: RNWLogLevel, message: String, source: String) {
    guard !completed else { return }
    let entry = "[\(source)][\(level.rawValue)] \(message)"
    consoleLogs.append(entry)
    print("EXPO_SMOKE_LOG: \(entry)")
    if level == .error {
      fail(entry)
    } else if source == "primary" {
      primaryLog(message)
    } else {
      companionLog(message)
    }
  }

  private func primaryLog(_ message: String) {
    guard !completed else { return }
    if message.hasPrefix("EXPO_SMOKE_FAIL:") || message == "EXPO_SMOKE_LATE_CALLBACK" {
      fail(message)
    } else if message.hasPrefix("EXPO_SMOKE_PASS:") {
      guard generation >= 1 && generation <= 3,
            !checks.contains(where: { $0.hasPrefix("generation \(generation):") }) else {
        fail("Duplicate or unexpected primary runtime completion")
        return
      }
      checks.append("generation \(generation): \(message)")
      if generation < 3 {
        // Reload immediately, while the native slow function is still running.
        runGeneration()
      } else {
        host = nil
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
          self?.verifyCompanion()
        }
      }
    }
  }

  private func verifyCompanion() {
    guard !completed else { return }
    let lifecycle = RNWExpoModulesProofLifecycle.snapshot()
    guard lifecycle.creates == 4, lifecycle.destroys == 3, explicitFactoryCalls == 1 else {
      fail("Primary reload lifecycle mismatch with companion still alive: \(lifecycle)")
      return
    }
    checks.append("public host reload: 3 primary instances destroyed while companion stays alive")
    Task { [weak self] in
      guard let self else { return }
      do {
        try await self.companion?.evaluate(source: "globalThis.__RNW_EXPO_COMPANION_VERIFY()", url: "<smoke-isolation>")
      } catch { self.fail(error.localizedDescription) }
    }
  }

  private func companionLog(_ message: String) {
    guard !completed else { return }
    if message.hasPrefix("EXPO_SMOKE_FAIL:") || message == "EXPO_SMOKE_LATE_CALLBACK" {
      fail(message)
    } else if message == "EXPO_SMOKE_COMPANION_READY" {
      guard generation == 0 else { fail("Companion initialized more than once"); return }
      runGeneration()
    } else if message.hasPrefix("EXPO_SMOKE_COMPANION_PASS:") {
      checks.append(message)
      companion = nil
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
        guard let self, !self.completed else { return }
        guard RNWExpoModulesProofLifecycle.allInstancesDestroyedExactlyOnce() else {
          self.fail("Each of the four native module instances must be created and destroyed exactly once")
          return
        }
        self.checks.append("lifecycle: all 4 unique module instances created and destroyed exactly once")
        self.finish(success: true, error: nil)
      }
    }
  }

  private func fail(_ message: String) {
    guard !completed else { return }
    finish(success: false, error: message)
  }

  private func finish(success: Bool, error: String?) {
    guard !completed else { return }
    completed = true
    host = nil
    companion = nil
    let lifecycle = RNWExpoModulesProofLifecycle.snapshot()
    var result: [String: Any] = [
      "success": success,
      "checks": checks,
      "console": consoleLogs,
      "lifecycle": ["creates": lifecycle.creates, "destroys": lifecycle.destroys],
      "primaryGenerations": generation, "simultaneousHosts": 2, "explicitFactoryCalls": explicitFactoryCalls,
      "expo": "57.0.20", "expoModulesCore": "57.0.16", "expoModulesJSI": "57.0.8"
    ]
    if let error { result["error"] = error }
    do {
      let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("expo-smoke-result.json")
      let data = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys])
      try data.write(to: url, options: .atomic)
      print("EXPO_SMOKE_RESULT: \(String(decoding: data, as: UTF8.self))")
    } catch {
      print("EXPO_SMOKE_RESULT_WRITE_FAILED: \(error)")
    }
  }
}
