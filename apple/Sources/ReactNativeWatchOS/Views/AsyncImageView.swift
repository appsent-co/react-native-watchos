import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI `AsyncImage`. Two render shapes:
///
///   1. *Bare* (no phase children) — uses `AsyncImage(url:scale:)` and
///      gets SwiftUI's default spinner + broken-image glyph at intrinsic
///      image size.
///   2. *Phase-driven* — when any of `AsyncImagePhaseEmpty`,
///      `AsyncImagePhaseSuccess`, `AsyncImagePhaseFailure` is present as
///      a direct child, we switch to the closure form
///      `AsyncImage(url:scale:) { phase in … }`. The matching slot is
///      rendered for each phase. Inside the `Success` subtree, the
///      `AsyncImageImage` sentinel resolves to the loaded `Image` via
///      `EnvironmentValues.rnwAsyncImagePhaseImage` — that's how we hand
///      the SwiftUI Image value across the snapshot/closure boundary
///      without breaking the React shadow tree's data flow.
enum RNWAsyncImageView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("AsyncImage") { snapshot, _, bus in
            guard let urlString = snapshot.props?.string("url"),
                  let url = URL(string: urlString) else {
                return AnyView(EmptyView())
            }
            let scale = snapshot.props?.cgFloat("scale") ?? 1.0

            var emptyChild: RNWShadowNodeSnapshot?
            var successChild: RNWShadowNodeSnapshot?
            var failureChild: RNWShadowNodeSnapshot?
            for child in snapshot.children {
                switch child.viewName {
                case "AsyncImagePhaseEmpty":   emptyChild = child
                case "AsyncImagePhaseSuccess": successChild = child
                case "AsyncImagePhaseFailure": failureChild = child
                default: break
                }
            }

            let hasPhaseChildren = emptyChild != nil
                || successChild != nil
                || failureChild != nil

            if !hasPhaseChildren {
                return AnyView(AsyncImage(url: url, scale: scale))
            }

            return AnyView(
                AsyncImage(url: url, scale: scale) { phase in
                    switch phase {
                    case .empty:
                        if let node = emptyChild {
                            RNWNodeRenderer.render(node, bus: bus)
                        } else {
                            EmptyView()
                        }
                    case .success(let image):
                        if let node = successChild {
                            RNWNodeRenderer.render(node, bus: bus)
                                .environment(\.rnwAsyncImagePhaseImage, image)
                        } else {
                            // No Success slot: fall back to the bare image so
                            // the load isn't silently discarded.
                            image
                        }
                    case .failure:
                        if let node = failureChild {
                            RNWNodeRenderer.render(node, bus: bus)
                        } else {
                            EmptyView()
                        }
                    @unknown default:
                        EmptyView()
                    }
                }
            )
        }
    }
}

/// Sentinel child of `<AsyncImage.Success>` — pulls the loaded SwiftUI
/// `Image` out of the environment and applies image-only modifiers
/// before erasing to `AnyView` (so subsequent generic modifiers flow
/// through the standard outer pipeline). Outside a `Success` closure
/// the environment value is `nil` and this renders nothing.
enum RNWAsyncImageImageView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("AsyncImageImage") { snapshot, _, _ in
            // Pre-filter to image-only modifier dicts so the bridge view
            // doesn't have to do registry lookups in its body.
            let imageMods: [[String: Any]] = snapshot.modifiers.compactMap { mod in
                guard let dict = mod as? [String: Any],
                      let type = dict["$type"] as? String,
                      RNWImageModifierRegistry.shared.contains(type) else {
                    return nil
                }
                return dict
            }
            return AnyView(RNWAsyncImageImageBridge(imageModifiers: imageMods))
        }
    }
}

/// Internal bridge that reads the loaded `Image` from the environment and
/// applies image-only modifiers in source order. Exists so the registry
/// builder (which can't be a `View`) can still participate in SwiftUI's
/// per-render environment lookup.
private struct RNWAsyncImageImageBridge: View {
    @Environment(\.rnwAsyncImagePhaseImage) private var loaded
    let imageModifiers: [[String: Any]]

    var body: some View {
        if let loaded {
            styled(loaded)
        } else {
            EmptyView()
        }
    }

    private func styled(_ image: Image) -> Image {
        imageModifiers.reduce(image) { acc, dict in
            RNWImageModifierRegistry.shared.apply(dict, to: acc)
        }
    }
}

// MARK: - Empty slot leaves
//
// `AsyncImagePhaseEmpty/Success/Failure` are walked by the parent
// `AsyncImage` builder, but they still need a builder entry so
// `RNWNodeRenderer.render` produces a sensible value when called on
// them directly (during the per-phase render). Each just renders its
// children inline — the slot semantics live in the parent.

enum RNWAsyncImagePhaseEmptyView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("AsyncImagePhaseEmpty") { _, children, _ in AnyView(children) }
    }
}

enum RNWAsyncImagePhaseSuccessView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("AsyncImagePhaseSuccess") { _, children, _ in AnyView(children) }
    }
}

enum RNWAsyncImagePhaseFailureView {
    @MainActor
    static func register(into r: RNWViewRegistry) {
        r.register("AsyncImagePhaseFailure") { _, children, _ in AnyView(children) }
    }
}

// MARK: - Environment plumbing for the loaded Image

private struct RNWAsyncImagePhaseImageKey: EnvironmentKey {
    static let defaultValue: Image? = nil
}

extension EnvironmentValues {
    fileprivate var rnwAsyncImagePhaseImage: Image? {
        get { self[RNWAsyncImagePhaseImageKey.self] }
        set { self[RNWAsyncImagePhaseImageKey.self] = newValue }
    }
}
