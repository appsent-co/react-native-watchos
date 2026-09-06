import Foundation
import ExpoModulesCore

private final class ProofRejection: Exception, @unchecked Sendable {
  override var reason: String { "expected rejection" }
  override var code: String { "ERR_RNW_PROOF" }
}

private struct ProofRecord: Record {
  @Field var count: Int = 0
  @Field var label: String = ""
}

private enum ProofMode: String, Enumerable {
  case small
  case large
}

private final class ProofSharedCounter: SharedObject {
  var value: Int

  init(_ value: Int) {
    self.value = value
    super.init()
  }
}

/// An ordinary native module compiled only into the smoke app. This source is
/// intentionally outside RNWExpoModulesCore: it proves that an ordinary Expo
/// module can import the unmodified `ExpoModulesCore` API and use its real DSL.
public final class RNWExpoModulesProof: Module {
  private let instanceID = UUID().uuidString
  private var state = 0

  public func definition() -> ModuleDefinition {
    let instanceID = self.instanceID
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

    Function("runtimeIsolation") { [weak self] () -> Bool in
      guard let context = self?.appContext, let runtime = try? context.runtime else { return false }
      guard runtime.isOnJavaScriptThread() else { return false }
      // Only the queue-identity predicate is read off queue; no JSI value is used.
      return DispatchQueue.main.sync { !runtime.isOnJavaScriptThread() }
    }

    Function("getState") { [weak self] () -> Int in self?.state ?? -1 }
    Function("setState") { [weak self] (value: Int) -> Void in self?.state = value }

    Function("transformRecord") { (record: ProofRecord) -> ProofRecord in
      var result = record
      result.count += 1
      result.label += "!"
      return result
    }

    Function("enumValue") { (mode: ProofMode) -> String in mode.rawValue }

    Class("SharedCounter", ProofSharedCounter.self) {
      Constructor { (value: Int) in ProofSharedCounter(value) }
      Property("value") { (counter: ProofSharedCounter) in counter.value }
      Function("increment") { (counter: ProofSharedCounter, amount: Int) -> Int in
        counter.value += amount
        return counter.value
      }
    }

    Function("readShared") { (counter: ProofSharedCounter) -> Int in counter.value }

    OnCreate {
      RNWExpoModulesProofLifecycle.recordCreate(instanceID)
    }

    // ModuleHolder invokes this from its real deinitializer. The host teardown
    // test checks that it occurs exactly once after the runtime releases the
    // native state that owns the AppContext.
    OnDestroy {
      RNWExpoModulesProofLifecycle.recordDestroy(instanceID)
    }
  }
}

/// Thread-safe native-only assertions for lifecycle integration tests. It is
/// separate from the module so OnDestroy does not capture the module itself.
public enum RNWExpoModulesProofLifecycle {
  private static let lock = NSLock()
  nonisolated(unsafe) private static var creates = 0
  nonisolated(unsafe) private static var destroys = 0
  nonisolated(unsafe) private static var createdIDs: [String] = []
  nonisolated(unsafe) private static var destroyedIDs: [String] = []

  public static func reset() {
    lock.lock()
    creates = 0
    destroys = 0
    createdIDs = []
    destroyedIDs = []
    lock.unlock()
  }

  public static func snapshot() -> (creates: Int, destroys: Int) {
    lock.lock()
    defer { lock.unlock() }
    return (creates, destroys)
  }

  public static func allInstancesDestroyedExactlyOnce() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    return createdIDs.count == 4 && Set(createdIDs).count == 4
      && createdIDs.sorted() == destroyedIDs.sorted()
  }

  fileprivate static func recordCreate(_ id: String) {
    lock.lock()
    createdIDs.append(id)
    creates += 1
    lock.unlock()
  }

  fileprivate static func recordDestroy(_ id: String) {
    lock.lock()
    destroyedIDs.append(id)
    destroys += 1
    lock.unlock()
  }
}
