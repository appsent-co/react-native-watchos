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

// A fake requester exercises the actual Expo permission service without asking
// for a system permission or presenting UI. Each AppContext owns its requester.
private final class ProofPermissionRequester: NSObject, EXPermissionsRequester {
  private let lock = NSLock()
  private var granted = false

  static func permissionType() -> String { "rnw-proof" }

  func getPermissions() -> [AnyHashable: Any] {
    lock.lock()
    defer { lock.unlock() }
    return ["status": granted ? EXPermissionStatusGranted.rawValue : EXPermissionStatusUndetermined.rawValue]
  }

  func requestPermissions(resolver resolve: EXPromiseResolveBlock, rejecter reject: EXPromiseRejectBlock) {
    lock.lock()
    granted = true
    lock.unlock()
    resolve(getPermissions())
  }
}

@objc(RNWProofLegacyServiceInterface)
private protocol ProofLegacyServiceInterface {
  var value: Int { get set }
}

private final class ProofLegacyService: NSObject, EXInternalModule, EXModuleRegistryConsumer, ProofLegacyServiceInterface {
  var value = 0
  weak var registry: EXModuleRegistry?
  func setModuleRegistry(_ registry: EXModuleRegistry) { self.registry = registry }
  static func exportedInterfaces() -> [Protocol] {
    [NSProtocolFromString("RNWProofLegacyServiceInterface")!]
  }
}

/// An ordinary native module compiled only into the smoke app. This source is
/// intentionally outside RNWExpoModulesCore: it proves that an ordinary Expo
/// module can import the unmodified `ExpoModulesCore` API and use its real DSL.
public final class RNWExpoModulesProof: Module {
  private let instanceID = UUID().uuidString
  private var state = 0

  private func checkLegacyFileSystem() throws -> Bool {
    guard let context = appContext, let fileSystem = context.fileSystem else { return false }
    let resolved: FileSystemManager? = context.legacyModule(implementing: NSProtocolFromString("EXFileSystemInterface")!)
    guard resolved === fileSystem else { return false }
    let directory = URL(fileURLWithPath: fileSystem.cachesDirectory).appendingPathComponent("rnw-proof-" + UUID().uuidString)
    guard fileSystem.ensureDirExists(withPath: directory.path) else { return false }
    defer { try? FileManager.default.removeItem(at: directory) }
    let file = URL(fileURLWithPath: fileSystem.generatePath(inDirectory: directory.path, withExtension: "txt"))
    try Data("legacy-file".utf8).write(to: file)
    let permissions = fileSystem.permissions(forURI: file)
    let contents = try String(contentsOf: file, encoding: .utf8)
    return permissions.contains(.read) && permissions.contains(.write)
      && FileSystemUtilities.isReadableFile(context, file)
      && contents == "legacy-file"
  }

  private func checkLegacyState(_ next: Int?) -> Int {
    let service: ProofLegacyService? = appContext?.legacyModule(implementing: NSProtocolFromString("RNWProofLegacyServiceInterface")!)
    guard let service, let registry = appContext?.legacyModuleRegistry,
      service.registry === registry else { return -1 }
    if let next { service.value = next }
    return service.value
  }

  private func checkLegacyPermission(_ ask: Bool, promise: Promise) {
    if ask {
      EXPermissionsMethodsDelegate.askForPermission(withPermissionsManager: appContext?.permissions,
        withRequester: ProofPermissionRequester.self, resolve: promise.legacyResolver, reject: promise.legacyRejecter)
    } else {
      EXPermissionsMethodsDelegate.getPermissionWithPermissionsManager(appContext?.permissions,
        withRequester: ProofPermissionRequester.self, resolve: promise.legacyResolver, reject: promise.legacyRejecter)
    }
  }

  private func checkMissingPermission(_ promise: Promise) {
    EXPermissionsMethodsDelegate.getPermissionWithPermissionsManager(appContext?.permissions,
      withRequester: NSObject.self, resolve: promise.legacyResolver, reject: promise.legacyRejecter)
  }

  private func checkNilPermissionService(_ promise: Promise) {
    EXPermissionsMethodsDelegate.getPermissionWithPermissionsManager(nil,
      withRequester: ProofPermissionRequester.self, resolve: promise.legacyResolver, reject: promise.legacyRejecter)
  }

  private func checkPersistentLog() async throws -> Bool {
    let category = "rnw-proof-" + UUID().uuidString
    let fileLog = PersistentFileLog(category: category)
    createPersistentFileLogHandler(category: category).log(type: .info, "handler")
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      fileLog.appendEntry(entry: "direct") { error in
        if let error { continuation.resume(throwing: error) } else { continuation.resume() }
      }
    }
    let reopened = PersistentFileLog(category: category)
    let persisted = reopened.readEntries() == ["handler", "direct"]
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      reopened.clearEntries { error in
        if let error { continuation.resume(throwing: error) } else { continuation.resume() }
      }
    }
    return persisted && reopened.readEntries().isEmpty
  }

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

    AsyncFunction("awaitDouble") { (value: Int) async throws -> Int in
      try await Task.sleep(nanoseconds: 10_000_000)
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
      // Only the thread-identity predicate is read off thread; no JSI value is used.
      return DispatchQueue.main.sync { !runtime.isOnJavaScriptThread() }
    }

    Function("legacyFileSystem") { [weak self] () throws -> Bool in
      try self?.checkLegacyFileSystem() ?? false
    }

    Function("legacyState") { [weak self] (next: Int?) -> Int in
      self?.checkLegacyState(next) ?? -1
    }

    AsyncFunction("legacyPermission") { [weak self] (ask: Bool, promise: Promise) -> Void in
      self?.checkLegacyPermission(ask, promise: promise)
    }

    AsyncFunction("legacyMissingPermission") { [weak self] (promise: Promise) -> Void in
      self?.checkMissingPermission(promise)
    }

    AsyncFunction("legacyNilPermissionService") { [weak self] (promise: Promise) -> Void in
      self?.checkNilPermissionService(promise)
    }

    AsyncFunction("persistentLog") { [weak self] () async throws -> Bool in
      try await self?.checkPersistentLog() ?? false
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

    OnCreate { [weak self] in
      if let context = self?.appContext, let registry = context.legacyModuleRegistry {
        registry.register(ProofLegacyService())
        registry.initialize()
        context.permissions?.register([ProofPermissionRequester()])
        RNWExpoModulesProofLifecycle.recordRegistry(registry)
      }
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
  nonisolated(unsafe) private static var registries = NSHashTable<EXModuleRegistry>.weakObjects()
  nonisolated(unsafe) private static var createdIDs: [String] = []
  nonisolated(unsafe) private static var destroyedIDs: [String] = []

  public static func reset() {
    lock.lock()
    creates = 0
    destroys = 0
    registries.removeAllObjects()
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
      && registries.allObjects.isEmpty
  }

  fileprivate static func recordRegistry(_ registry: EXModuleRegistry) {
    lock.lock()
    registries.add(registry)
    lock.unlock()
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
