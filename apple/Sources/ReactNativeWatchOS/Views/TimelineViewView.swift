import SwiftUI
import ReactNativeWatchOSCxx

enum RNWTimelineViewView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("TimelineView") { snapshot, children, _ in
            guard
                let schedule = snapshot.props?["schedule"] as? [String: Any],
                let kind = schedule.string("kind")
            else {
                return AnyView(children)
            }

            // TODO: TimelineView's content closure receives a `Context` with
            // the current tick date; we don't bridge it back to JS yet
            // because that would require rebuilding the children subtree
            // on every tick. Wire this once we have a per-tick prop path.
            switch kind {
            case "everyMinute":
                return AnyView(TimelineView(.everyMinute) { _ in children })
            case "periodic":
                let by = schedule.double("by") ?? 1
                let from = schedule.double("from").map { Date(timeIntervalSince1970: $0 / 1000) } ?? .now
                return AnyView(TimelineView(.periodic(from: from, by: by)) { _ in children })
            case "animation":
                let minimumInterval = schedule.double("minimumInterval")
                let paused = schedule.bool("paused") ?? false
                return AnyView(
                    TimelineView(.animation(minimumInterval: minimumInterval, paused: paused)) { _ in children }
                )
            case "explicit":
                let dates = (schedule["dates"] as? [NSNumber] ?? []).map {
                    Date(timeIntervalSince1970: $0.doubleValue / 1000)
                }
                return AnyView(TimelineView(.explicit(dates)) { _ in children })
            default:
                return AnyView(children)
            }
        }
    }
}
