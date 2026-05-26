import Foundation
import ReactNativeWatchOSCxx

public struct LogEntry: Identifiable, Sendable, Equatable {
    public let id = UUID()
    public let level: String
    public let message: String
    public let timestamp: Date
}

/// Public Swift facade for the watchOS Hermes runtime.
@MainActor
public final class ReactNativeWatchOSHost: ObservableObject {
    /// Timestamp of the most recent `error`-level log. Drives the error
    /// toast. Resets on the next successful bundle reload; otherwise
    /// persists so a dismissed toast re-triggers on the next error.
    @Published public internal(set) var lastErrorAt: Date?

    /// Latest committed shadow tree. Empty until the first `completeRoot()`.
    @Published public private(set) var root: [RNWShadowNodeSnapshot] = []

    /// Swift → JS event dispatcher. Forwards to `RNWHermesHost.fireEvent`.
    public let eventBus: RNWEventBus

    /// Fires when JS invokes `globalThis.__RNW_RELOAD()` (Fast Refresh
    /// full-reload path). The view wires this to its `load()` task.
    public var onReloadRequest: (() -> Void)?

    // Swapped out on every reload so the previous bundle's JS heap (modules,
    // fibers, timers, websockets) and the native UIManager registry get
    // fully torn down. See `recreateHost`.
    private var host: RNWHermesHost
    // Indirection box so the public `eventBus` closure can be built once
    // and still reach the *current* host after a reload swap. The closure
    // fires from SwiftUI action closures (any thread), so it can't read
    // the @MainActor `host` property directly.
    private let hostRef = HostRef()
    private var notificationObservers: [NSObjectProtocol] = []
    private var hasLoadedOnce = false

    public init() {
        let host = RNWHermesHost()
        self.host = host
        self.hostRef.current = host

        let hostRef = self.hostRef
        self.eventBus = RNWEventBus { handlerId, payload in
            // `fireEvent` hops to the JS queue internally — safe from main.
            hostRef.current?.fireEvent(withHandlerId: handlerId, payload: payload)
        }
        wireHost()
    }

    deinit {
        for observer in notificationObservers {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    /// Install the per-host callbacks (console / commit / reload) and the
    /// `RNWEventEmitterFireEvent` observer. Called from `init` and again
    /// from `recreateHost` after a reload swaps the runtime.
    private func wireHost() {
        // Drop the previous observer first — its block routes through
        // `hostRef` so it would still target the right host, but every
        // reload would otherwise add another fan-out subscriber.
        for observer in notificationObservers {
            NotificationCenter.default.removeObserver(observer)
        }
        notificationObservers.removeAll()

        // RCTEventEmitter posts here from `sendEventWithName:body:`.
        // Forward into `globalThis.__RNW_EVENTS.dispatchEvent`.
        let hostRef = self.hostRef
        let observer = NotificationCenter.default.addObserver(
            forName: NSNotification.Name("RNWEventEmitterFireEvent"),
            object: nil,
            queue: nil
        ) { notification in
            guard let info = notification.userInfo,
                  let eventName = info["eventName"] as? String else { return }
            let payload = info["payload"]
            let body: Any? = (payload is NSNull) ? nil : payload
            hostRef.current?.fireEvent(byName: eventName, payload: body)
        }
        notificationObservers.append(observer)

        host.onConsoleLog = { [weak self] level, message in
        // TODO: Prod build error reporting
        self?.lastErrorAt = Date()
        #if DEBUG
            Self.reportToMetro(level: Self.levelName(level), message: message)
#endif
        }
        host.onCommit = { [weak self] snapshot in
            let next = snapshot ?? []
            Task { @MainActor [weak self] in
                self?.root = next
            }
        }
        host.onReloadRequest = { [weak self] in
            Task { @MainActor [weak self] in
                self?.onReloadRequest?()
            }
        }
    }

    /// Tear down the current Hermes runtime and stand up a fresh one. Without
    /// this, reload would re-evaluate the new bundle on top of the old: old
    /// fibers never unmount, old `setInterval` callbacks keep firing, the
    /// native UIManager registry accumulates dead shadow nodes, and the HMR
    /// WebSocket churns. The old JS heap only goes away when its
    /// `RNWHermesHost` is released.
    private func recreateHost() {
        // Hand the old host off so its dealloc — which `dispatch_sync`s
        // onto its JS queue to drop the runtime — doesn't stall main
        // mid-reload. The new host runs on its own private queue, so
        // there's no ordering dependency.
        let old = host
        let next = RNWHermesHost()
        host = next
        hostRef.current = next
        // Drop the prior bundle's tree so it doesn't linger on screen
        // until the new bundle's first `completeRoot` lands.
        root = []
        wireHost()
        DispatchQueue.global(qos: .utility).async {
            _ = old
        }
    }

    public static func metroBundleURL(
        host: String = "127.0.0.1",
        port: Int = 8081,
        entry: String = "index",
        dev: Bool = true
    ) -> URL {
        var components = URLComponents()
        components.scheme = "http"
        components.host = host
        components.port = port
        components.path = "/\(entry).bundle"
        components.queryItems = [
            URLQueryItem(name: "platform", value: "watchos"),
            URLQueryItem(name: "dev", value: dev ? "true" : "false"),
            URLQueryItem(name: "minify", value: dev ? "false" : "true"),
        ]
        return components.url!
    }

    public static func releaseBundleURL(name: String = "main") -> URL? {
        Bundle.main.url(forResource: name, withExtension: "jsbundle")
    }

    /// - Parameter entry: Metro entry path (no extension). Defaults to
    ///   `"index.watchos"` so the request becomes `/index.watchos.bundle`,
    ///   which Metro resolves to the literal `index.watchos.{tsx,ts,jsx,js}`
    ///   on disk. A bare `"index"` would resolve to `index.ts` (the
    ///   iOS/Android entry from package.json `main`) — Metro applies the
    ///   `.watchos.*` extension to in-graph `require`s, not to the entry
    ///   path itself. Monorepo callers can override with e.g.
    ///   `entry: "my-app/index.watchos"`.
    public static func defaultBundleURL(
        entry: String = "index.watchos",
        host: String = "127.0.0.1",
        port: Int = 8081,
        name: String = "main"
    ) -> URL {
#if DEBUG
        return metroBundleURL(host: host, port: port, entry: entry, dev: true)
#else
        guard let url = releaseBundleURL(name: name) else {
            fatalError(
                "[@appsent-co/react-native-watchos] \(name).jsbundle missing from app " +
                "bundle. Did the Expo plugin's Run Script fire?"
            )
        }
        return url
#endif
    }

    /// Fetch a JS bundle (HTTP(S) or file://) and evaluate it in Hermes.
    /// On every call past the first, the Hermes runtime is recreated so
    /// the previous bundle's state (modules, fibers, timers, sockets,
    /// shadow nodes) is dropped before the new bundle evaluates.
    public func loadBundle(from url: URL) async throws {
        if hasLoadedOnce {
            recreateHost()
        }
        hasLoadedOnce = true
        let data: Data
        if url.isFileURL {
            data = try Data(contentsOf: url, options: .mappedIfSafe)
        } else {
            (data, _) = try await URLSession.shared.data(from: url)
        }
        guard let source = String(data: data, encoding: .utf8) else {
            throw NSError(
                domain: "ReactNativeWatchOS",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey:
                    "Bundle response was not valid UTF-8"]
            )
        }
        // Inject `__RNW_DEV_SERVER` before the bundle so dev-support can
        // set up Fast Refresh + HMR. Skipped for file:// / non-dev.
        if let injection = Self.devServerInjection(for: url) {
            try await evaluate(source: injection, url: "<rnw-dev-server>")
        }
        try await evaluate(source: source, url: url.absoluteString)
    }

    /// Returns nil for non-dev-server URLs — dev-support no-ops when the
    /// global is absent.
    private static func devServerInjection(for url: URL) -> String? {
        guard let scheme = url.scheme,
              scheme == "http" || scheme == "https",
              let host = url.host else { return nil }
        guard let comps = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return nil
        }
        let isDev = comps.queryItems?.contains(where: {
            $0.name == "dev" && $0.value == "true"
        }) ?? false
        guard isDev else { return nil }

        let port = url.port ?? (scheme == "https" ? 443 : 8081)
        // /path/to/index.bundle → "path/to/index"
        var entry = url.path
        if entry.hasPrefix("/") { entry.removeFirst() }
        if entry.hasSuffix(".bundle") {
            entry.removeLast(".bundle".count)
        }
        let payload: [String: Any] = [
            "host": host,
            "port": port,
            "entry": entry,
            "scheme": scheme,
        ]
        guard let json = try? JSONSerialization.data(withJSONObject: payload),
              let jsonStr = String(data: json, encoding: .utf8) else {
            return nil
        }
        return "globalThis.__RNW_DEV_SERVER = \(jsonStr);"
    }

    /// POST to Metro's `/__watchos_log` (installed by `withWatchosMetro`).
    /// Fire-and-forget — dev-time only, failures are dropped silently.
    public static func reportToMetro(
        level: String,
        message: String,
        stack: String? = nil,
        serverHost: String = "127.0.0.1",
        port: Int = 8081
    ) {
        guard let url = URL(string: "http://\(serverHost):\(port)/__watchos_log") else { return }
        var payload: [String: String] = ["level": level, "message": message]
        if let stack, !stack.isEmpty { payload["stack"] = stack }
        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.httpBody = body
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        URLSession.shared.dataTask(with: req).resume()
    }

    /// Evaluate JS source on the host's JS queue. Suspends the caller but
    /// doesn't block main.
    public func evaluate(source: String, url: String) async throws {
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            host.evaluate(source, url: url) { error in
                if let error {
                    cont.resume(throwing: error)
                } else {
                    cont.resume()
                }
            }
        }
    }

    private static func levelName(_ level: RNWLogLevel) -> String {
        switch level {
        case .log:   return "log"
        case .warn:  return "warn"
        case .error: return "error"
        case .info:  return "info"
        @unknown default: return "log"
        }
    }
}

/// Mutable holder for the current `RNWHermesHost`. Captured by event-
/// dispatch closures whose lifetime exceeds any single runtime — they need
/// to fan out to whichever host is live now, not the one that was current
/// when they were created. `RNWHermesHost.fireEvent` is thread-safe.
private final class HostRef: @unchecked Sendable {
    var current: RNWHermesHost?
}
