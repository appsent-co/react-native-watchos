import SwiftUI

/// SwiftUI `.sheet(isPresented:onDismiss:content:)`. Presents the resolved
/// `content` slot modally when `isPresented` is true.
///
/// The presentation flag is bound bidirectionally with the same optimistic
/// pattern as `ToggleView`: JS owns the source of truth (`isPresented`),
/// but a local `@State` mirror flips instantly so an interactive
/// (swipe-down) dismiss closes the sheet without waiting for the JS
/// round-trip and fires the handler with the new value. The next snapshot
/// from JS converges the local state via `.onChange(of:)`.
enum RNWSheetModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("sheet") { view, params, ctx in
            let body = ctx.content(params.string("content"))
            return AnyView(view.modifier(RNWSheetViewModifier(
                remotePresented: params.bool("isPresented") ?? false,
                handlerId: params.int("handler"),
                bus: ctx.bus,
                sheetBody: body
            )))
        }
    }
}

private struct RNWSheetViewModifier: ViewModifier {
    let remotePresented: Bool
    let handlerId: Int?
    let bus: RNWEventBus
    let sheetBody: AnyView?

    @State private var localPresented: Bool

    init(remotePresented: Bool, handlerId: Int?, bus: RNWEventBus, sheetBody: AnyView?) {
        self.remotePresented = remotePresented
        self.handlerId = handlerId
        self.bus = bus
        self.sheetBody = sheetBody
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

        return content
            .sheet(isPresented: binding) {
                sheetBody ?? AnyView(EmptyView())
            }
            .onChange(of: remotePresented) { newRemote in
                if newRemote != localPresented {
                    localPresented = newRemote
                }
            }
    }
}
