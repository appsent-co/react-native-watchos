import Foundation
import ExpoModulesCore
import ReactNativeWatchOSCxx

/// App-owned adapter: the watch host has no dependency on Expo.
final class ExpoRuntimeBinding: NSObject, RNWRuntimeBinding {
  private var context: AppContext?
  private(set) var installedOnCorrectQueue = false

  func install(runtime: UnsafeMutableRawPointer, schedule: @escaping RNWJavaScriptScheduler) {
    let scheduler = RNWExpoScheduler(schedule: schedule)
    let context = AppContext()
    context.useModulesProvider(RNWExpoModulesProofProvider())
    self.context = context
    context.setRuntime(runtime, scheduler: scheduler.handle,
                       dispatch: RNWExpoScheduler.dispatchPointer(), schedulerOwner: scheduler)
    installedOnCorrectQueue = RNWCurrentJavaScriptRuntime() == runtime
      && (try? context.runtime.isOnJavaScriptThread()) == true
  }

  // Read immediately after synchronous host construction, before any bundle
  // runs. Even if dispatch_sync used main's OS thread, main is not the JS queue.
  func rejectsOffQueueAccess() -> Bool {
    guard let context, let runtime = try? context.runtime else { return false }
    return RNWCurrentJavaScriptRuntime() == nil && !runtime.isOnJavaScriptThread()
  }

  func invalidate() {
    // The host calls this on its JS queue before destroying Hermes. Expo's
    // authentic global NativeState then finishes releasing module holders.
    context?.destroy()
    context = nil
  }
}
