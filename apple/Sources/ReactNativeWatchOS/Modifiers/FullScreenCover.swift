import SwiftUI

/// SwiftUI `.fullScreenCover(isPresented:content:)`.
///
/// LIMITATION: `.fullScreenCover` does NOT exist on watchOS (it is
/// iOS/tvOS-only). This falls back to `.sheet(isPresented:){ body }`. On a
/// watch a sheet already occupies (nearly) the full screen, so the visual
/// result is close; the practical difference is that the fallback sheet
/// stays interactively dismissable. The `$type` is kept distinct from
/// `sheet` so the JS surface can express intent and so a future watchOS
/// release that adds the API can upgrade this applier in place.
///
/// The presentation flag uses the same optimistic-local-state +
/// converge-on-`onChange` binding as `RNWSheetModifier`.
enum RNWFullScreenCoverModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("fullScreenCover") { view, params, ctx in
            let body = ctx.content(params.string("content"))
            return AnyView(view.modifier(RNWFullScreenCoverViewModifier(
                remotePresented: params.bool("isPresented") ?? false,
                handlerId: params.int("handler"),
                bus: ctx.bus,
                coverBody: body
            )))
        }
    }
}

private struct RNWFullScreenCoverViewModifier: ViewModifier {
    let remotePresented: Bool
    let handlerId: Int?
    let bus: RNWEventBus
    let coverBody: AnyView?

    @State private var localPresented: Bool

    init(remotePresented: Bool, handlerId: Int?, bus: RNWEventBus, coverBody: AnyView?) {
        self.remotePresented = remotePresented
        self.handlerId = handlerId
        self.bus = bus
        self.coverBody = coverBody
        _localPresented = State(initialValue: remotePresented)
    }

    func body(content: Content) -> some View {
        let binding = Binding<Bool>(
            get: { localPresented },
            set: { newValue in
                localPresented = newValue
                if let handlerId {
                    bus.fire(handlerId, payload: newValue)
                }
            }
        )

        // watchOS has no `.fullScreenCover` — fall back to `.sheet`.
        return content
            .sheet(isPresented: binding) {
                coverBody ?? AnyView(EmptyView())
            }
            .onChange(of: remotePresented) { newRemote in
                if newRemote != localPresented {
                    localPresented = newRemote
                }
            }
    }
}
