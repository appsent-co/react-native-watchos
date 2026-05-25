import SwiftUI

/// SwiftUI `.navigationDestination(isPresented:destination:)`. Pushes the
/// resolved `content` slot onto the enclosing `NavigationStack` when
/// `isPresented` is true. Available on watchOS 9.0+ (the deployment
/// target), so no availability gate is required.
///
/// The presentation flag is bound bidirectionally with the same optimistic
/// pattern as `ToggleView`: a local `@State` mirror flips instantly so a
/// back-button pop updates immediately and fires the handler with the new
/// value, then converges to the next JS snapshot via `.onChange(of:)`.
enum RNWNavigationDestinationModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("navigationDestination") { view, params, ctx in
            let body = ctx.content(params.string("content"))
            return AnyView(view.modifier(RNWNavigationDestinationViewModifier(
                remotePresented: params.bool("isPresented") ?? false,
                handlerId: params.int("handler"),
                bus: ctx.bus,
                destinationBody: body
            )))
        }
    }
}

private struct RNWNavigationDestinationViewModifier: ViewModifier {
    let remotePresented: Bool
    let handlerId: Int?
    let bus: RNWEventBus
    let destinationBody: AnyView?

    @State private var localPresented: Bool

    init(remotePresented: Bool, handlerId: Int?, bus: RNWEventBus, destinationBody: AnyView?) {
        self.remotePresented = remotePresented
        self.handlerId = handlerId
        self.bus = bus
        self.destinationBody = destinationBody
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
            .navigationDestination(isPresented: binding) {
                destinationBody ?? AnyView(EmptyView())
            }
            .onChange(of: remotePresented) { newRemote in
                if newRemote != localPresented {
                    localPresented = newRemote
                }
            }
    }
}
