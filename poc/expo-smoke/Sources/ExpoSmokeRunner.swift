import Foundation
import Combine
import ReactNativeWatchOSCxx

/// Emits machine-readable assertions; the tiny view only keeps the watch app
/// alive. Each pass uses a fresh, real RNWHermesHost and Expo AppContext.
@MainActor
final class ExpoSmokeRunner: ObservableObject {
  private var host: RNWHermesHost?
  private var started = false
  private var generation = 0
  private var checks: [String] = []
  private var completed = false

  func start() {
    guard !started else { return }
    started = true
    RNWExpoModulesProofLifecycle.reset()
    runGeneration()
    DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
      self?.fail("Timed out waiting for Expo native assertions")
    }
  }

  private func runGeneration() {
    generation += 1
    let current = generation
    let binding = ExpoRuntimeBinding()
    let host = RNWHermesHost(runtimeBinding: binding)
    self.host = host
    guard binding.installedOnCorrectQueue, binding.rejectsOffQueueAccess() else {
      fail("Expo runtime isolation did not distinguish its JS queue from the main queue")
      return
    }
    host.onConsoleLog = { [weak self] _, message in
      guard let self, !self.completed else { return }
      if message.hasPrefix("EXPO_SMOKE_FAIL:") {
        self.fail(message)
      } else if message.hasPrefix("EXPO_SMOKE_PASS:") {
        guard current == self.generation else {
          self.fail("Callback from an old runtime reached the current host")
          return
        }
        self.checks.append("generation \(current): \(message)")
        // This callback is dispatched to main by RNW; it never retains host.
        // Releasing it exercises real Hermes destruction with async work pending.
        self.host = nil
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
          self?.afterTeardown()
        }
      } else if message == "EXPO_SMOKE_LATE_CALLBACK" {
        self.fail("A pending Promise resolved after runtime teardown")
      }
    }
    do {
      let url = Bundle.main.url(forResource: "smoke", withExtension: "js")!
      let data = try Data(contentsOf: url)
      host.evaluate(data, url: url.absoluteString) { [weak self] error in
        if let error { self?.fail(error.localizedDescription) }
      }
    } catch {
      fail(error.localizedDescription)
    }
  }

  private func afterTeardown() {
    guard !completed else { return }
    let lifecycle = RNWExpoModulesProofLifecycle.snapshot()
    guard lifecycle.creates == generation, lifecycle.destroys == generation else {
      fail("Lifecycle mismatch after generation \(generation): \(lifecycle)")
      return
    }
    checks.append("generation \(generation): OnCreate and OnDestroy exactly once")
    if generation < 3 {
      runGeneration()
    } else {
      finish(success: true, error: nil)
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
    let lifecycle = RNWExpoModulesProofLifecycle.snapshot()
    var result: [String: Any] = [
      "success": success,
      "checks": checks,
      "lifecycle": ["creates": lifecycle.creates, "destroys": lifecycle.destroys],
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
