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
    // Dev server (host, port) of the last HTTP bundle URL passed to
    // `loadBundle(from:)`. Console logs are POSTed to this server's
    // `/__watchos_log` so they land in the Metro that served the bundle,
    // even when it isn't on the default 127.0.0.1:8081. nil for file://.
    private var devServer: (host: String, port: Int)?

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
        // Only error-level logs drive the toast (see `lastErrorAt`);
        // a plain console.log must not raise it.
        if level == .error {
            self?.lastErrorAt = Date()
        }
        #if DEBUG
            let server = self?.devServer
            Self.reportToMetro(
                level: Self.levelName(level),
                message: message,
                serverHost: server?.host ?? "127.0.0.1",
                port: server?.port ?? 8081
            )
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

    /// Info.plist keys that override the DEBUG dev-server endpoint used by
    /// `defaultBundleURL` when the caller passes no explicit `host:`/`port:`.
    /// `npx react-native-watchos init` and the config plugin
    /// (`plugin/src/withWatchInfoPlist.js`) write them into the watch
    /// target's Info.plist as `$(RNW_DEV_SERVER_HOST)` /
    /// `$(RNW_DEV_SERVER_PORT)`, so the endpoint becomes an xcodebuild
    /// argument (`xcodebuild ... RNW_DEV_SERVER_PORT=8082`) or an xcconfig
    /// line — no Swift edit needed when 8081 is taken by another Metro or
    /// when a physical watch must reach the Mac's LAN IP. Empty / missing
    /// values fall back to `127.0.0.1:8081`.
    public static let devServerHostInfoKey = "RNWDevServerHost"
    public static let devServerPortInfoKey = "RNWDevServerPort"

    /// Dev-server (host, port) declared in the app's Info.plist via
    /// `RNWDevServerHost` / `RNWDevServerPort`, or nil for each value that is
    /// absent or empty (an unset `$(RNW_DEV_SERVER_*)` build setting expands
    /// to the empty string).
    public static func infoPlistDevServer(
        bundle: Bundle = .main
    ) -> (host: String?, port: Int?) {
        let info = bundle.infoDictionary ?? [:]
        let host = (info[devServerHostInfoKey] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let rawPort = info[devServerPortInfoKey]
        let port: Int?
        if let n = rawPort as? Int {
            port = n
        } else if let s = rawPort as? String {
            port = Int(s.trimmingCharacters(in: .whitespacesAndNewlines))
        } else {
            port = nil
        }
        return (host?.isEmpty == false ? host : nil, port)
    }

    /// - Parameter entry: Metro entry path (no extension). Defaults to
    ///   `"index.watchos"` so the request becomes `/index.watchos.bundle`,
    ///   which Metro resolves to the literal `index.watchos.{tsx,ts,jsx,js}`
    ///   on disk. A bare `"index"` would resolve to `index.ts` (the
    ///   iOS/Android entry from package.json `main`) — Metro applies the
    ///   `.watchos.*` extension to in-graph `require`s, not to the entry
    ///   path itself. Monorepo callers can override with e.g.
    ///   `entry: "my-app/index.watchos"`.
    /// - Parameters host, port: DEBUG dev-server endpoint. `nil` (the
    ///   default) reads `RNWDevServerHost` / `RNWDevServerPort` from
    ///   Info.plist (see `infoPlistDevServer`) and falls back to
    ///   `127.0.0.1:8081`. An explicit argument always wins.
    public static func defaultBundleURL(
        entry: String = "index.watchos",
        host: String? = nil,
        port: Int? = nil,
        name: String = "main"
    ) -> URL {
#if DEBUG
        let plist = infoPlistDevServer()
        return metroBundleURL(
            host: host ?? plist.host ?? "127.0.0.1",
            port: port ?? plist.port ?? 8081,
            entry: entry,
            dev: true
        )
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
    ///
    /// The bundle bytes are passed to Hermes verbatim — UTF-8 source from
    /// the dev server and pre-compiled `.hbc` bytecode from the Release
    /// build phase both work, because Hermes auto-detects bytecode via
    /// its magic header.
    public func loadBundle(from url: URL) async throws {
        if hasLoadedOnce {
            recreateHost()
        }
        hasLoadedOnce = true
        devServer = Self.devServer(for: url)
        let data: Data
        if url.isFileURL {
            data = try Data(contentsOf: url, options: .mappedIfSafe)
        } else {
            (data, _) = try await URLSession.shared.data(from: url)
        }
        // Inject `__RNW_DEV_SERVER` before the bundle so dev-support can
        // set up Fast Refresh + HMR. Skipped for file:// / non-dev — and
        // it's always source JS, so UTF-8 encode inline.
        if let injection = Self.devServerInjection(for: url) {
            try await evaluate(data: Data(injection.utf8), url: "<rnw-dev-server>")
        }
        try await evaluate(data: data, url: url.absoluteString)
    }

    /// (host, port) of an HTTP(S) bundle URL; nil for file:// URLs.
    static func devServer(for url: URL) -> (host: String, port: Int)? {
        guard let scheme = url.scheme,
              scheme == "http" || scheme == "https",
              let host = url.host else { return nil }
        return (host, url.port ?? (scheme == "https" ? 443 : 8081))
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

    /// Evaluate JS on the host's JS queue. `data` may hold UTF-8 source or
    /// pre-compiled Hermes bytecode — Hermes detects which via the buffer's
    /// magic header. Suspends the caller but doesn't block main.
    public func evaluate(data: Data, url: String) async throws {
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            host.evaluate(data, url: url) { error in
                if let error {
                    cont.resume(throwing: error)
                } else {
                    cont.resume()
                }
            }
        }
    }

    /// Convenience for ad-hoc JS source — UTF-8 encodes and forwards to
    /// `evaluate(data:url:)`. Use the Data variant for pre-compiled bytecode.
    public func evaluate(source: String, url: String) async throws {
        try await evaluate(data: Data(source.utf8), url: url)
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
