import SwiftUI
import ReactNativeWatchOSCxx

/// Drop-in view that owns a `ReactNativeWatchOSHost`, loads JS from the
/// given URL, renders it, and surfaces load errors. In DEBUG builds a
/// shake gesture (~2.3g) opens a dev menu with Reload.
///
/// For production / advanced setups (custom error UX, statically-bundled
/// JS, an externally-owned host), use `RNWRootView(host:)` directly and
/// assemble your own surrounding view.
public struct ReactNativeWatchOSView: View {
    @StateObject private var host: ReactNativeWatchOSHost
    @State private var hasError: Bool = false

    private let bundleURL: URL

    public init(bundleURL: URL) {
        self.bundleURL = bundleURL
        _host = StateObject(wrappedValue: ReactNativeWatchOSHost())
    }

    public var body: some View {
        RNWRootView(host: host)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .overlay(alignment: .bottom) {
                if hasError {
                    RNWErrorToast { hasError = false }
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.easeInOut(duration: 0.2), value: hasError)
            // Runtime JS errors (uncaught throws, promise rejections,
            // setTimeout callback throws) get stamped via console.error →
            // lastErrorAt. Bundle-load failures still go through load().
            .onChange(of: host.lastErrorAt) { newValue in
                if newValue != nil {
                    hasError = true
                }
            }
            .task {
                // Wire JS-driven reload before first load() so a parse
                // error in the initial bundle can still trigger reload
                // once dev-support is injected.
                host.onReloadRequest = { Task { await load() } }
                await load()
            }
            .modifier(RNWDevMenuModifier(reload: { Task { await load() } }))
    }

    private func load() async {
        hasError = false
        // Clear so a previous error doesn't re-trigger the toast.
        host.lastErrorAt = nil
        do {
            try await host.loadBundle(from: bundleURL)
        } catch {
            // Forward the JS stack (in userInfo["stack"]) to Metro so the
            // Expo CLI terminal shows the full trace.
            let ns = error as NSError
            let stack = ns.userInfo["stack"] as? String ?? ""
            ReactNativeWatchOSHost.reportToMetro(
                level: "error",
                message: error.localizedDescription,
                stack: stack
            )
            hasError = true
        }
    }
}

// MARK: - Dev menu

#if DEBUG
/// Shake → confirmation dialog with Reload. Release builds use the no-op
/// variant below — no motion overhead, no `NSMotionUsageDescription`.
private struct RNWDevMenuModifier: ViewModifier {
    @StateObject private var shake = ShakeDetector()
    @State private var showDevMenu: Bool = false
    let reload: () -> Void

    func body(content: Content) -> some View {
        content
            .onAppear { shake.start() }
            .onChange(of: shake.shakeCount) { _ in showDevMenu = true }
            .confirmationDialog(
                "Dev Menu",
                isPresented: $showDevMenu,
                titleVisibility: .visible
            ) {
                Button("Reload", action: reload)
                Button("Cancel", role: .cancel) { }
            }
    }
}
#else
private struct RNWDevMenuModifier: ViewModifier {
    let reload: () -> Void
    func body(content: Content) -> some View { content }
}
#endif
