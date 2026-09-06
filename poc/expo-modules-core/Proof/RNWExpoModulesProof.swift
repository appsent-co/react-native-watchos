import Foundation
import ExpoModulesCore

private final class ProofRejection: Exception, @unchecked Sendable {
  override var reason: String { "expected rejection" }
  override var code: String { "ERR_RNW_PROOF" }
}

/// A native test module for the eventual watch-host integration. This source is
/// intentionally outside RNWExpoModulesCore: it proves that an ordinary Expo
/// module can import the unmodified `ExpoModulesCore` API and use its real DSL.
public final class RNWExpoModulesProof: Module {
  public func definition() -> ModuleDefinition {
    Name("RNWExpoModulesProof")

    Events("changed", "slowStarted")

    Function("double") { (value: Int) -> Int in
      value * 2
    }

    // This is the standard (non-macro) Expo AsyncFunction implementation. On
    // a host with the RNW scheduler adapter it executes on Expo's background
    // queue and resolves its Promise by scheduling back to the Hermes queue.
    AsyncFunction("delayedDouble") { [weak self] (value: Int) -> Int in
      Thread.sleep(forTimeInterval: 0.01)
      self?.sendEvent("changed", ["value": value * 2])
      return value * 2
    }

    AsyncFunction("reject") { () -> Void in
      throw ProofRejection()
    }

    // Used to tear the host down while authentic Expo async work is pending.
    AsyncFunction("slowDouble") { [weak self] (value: Int) -> Int in
      self?.sendEvent("slowStarted", [:])
      Thread.sleep(forTimeInterval: 0.3)
      return value * 2
    }

    OnCreate {
      RNWExpoModulesProofLifecycle.recordCreate()
    }

    // ModuleHolder invokes this from its real deinitializer. The host teardown
    // test checks that it occurs exactly once after the runtime releases the
    // native state that owns the AppContext.
    OnDestroy {
      RNWExpoModulesProofLifecycle.recordDestroy()
    }
  }
}

/// Thread-safe native-only assertions for lifecycle integration tests. It is
/// separate from the module so OnDestroy does not capture the module itself.
public enum RNWExpoModulesProofLifecycle {
  private static let lock = NSLock()
  nonisolated(unsafe) private static var creates = 0
  nonisolated(unsafe) private static var destroys = 0

  public static func reset() {
    lock.lock()
    creates = 0
    destroys = 0
    lock.unlock()
  }

  public static func snapshot() -> (creates: Int, destroys: Int) {
    lock.lock()
    defer { lock.unlock() }
    return (creates, destroys)
  }

  fileprivate static func recordCreate() {
    lock.lock()
    creates += 1
    lock.unlock()
  }

  fileprivate static func recordDestroy() {
    lock.lock()
    destroys += 1
    lock.unlock()
  }
}

public final class RNWExpoModulesProofProvider: ModulesProvider {
  public override func getModuleClasses() -> [ExpoModuleTupleType] {
    [(module: RNWExpoModulesProof.self, name: nil)]
  }
}
