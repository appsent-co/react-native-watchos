import SwiftUI

/// SwiftUI `.confirmationDialog(_:isPresented:titleVisibility:actions:message:)`.
/// Presents an action-sheet-style dialog titled `title` when `isPresented`
/// is true; the `actions` slot supplies the buttons and the optional
/// `message` slot the descriptive body. `titleVisibility` is parsed via the
/// shared `RNWVisibilityParser` (automatic/visible/hidden). Available on
/// watchOS 9.0+ (the deployment target).
///
/// The presentation flag is bound bidirectionally with the same optimistic
/// pattern as `ToggleView`: a local `@State` mirror flips instantly when an
/// action button or the system dismisses the dialog and fires the handler
/// with the new value, then converges to the next JS snapshot via
/// `.onChange(of:)`.
enum RNWConfirmationDialogModifier {
    @MainActor
    static func register(into r: RNWModifierRegistry) {
        r.register("confirmationDialog") { view, params, ctx in
            let actions = ctx.content(params.string("actions"))
            let message = ctx.content(params.string("message"))
            return AnyView(view.modifier(RNWConfirmationDialogViewModifier(
                title: params.string("title") ?? "",
                remotePresented: params.bool("isPresented") ?? false,
                titleVisibility: RNWVisibilityParser.parse(params.string("titleVisibility")),
                handlerId: params.int("handler"),
                bus: ctx.bus,
                actionsBody: actions,
                messageBody: message
            )))
        }
    }
}

private struct RNWConfirmationDialogViewModifier: ViewModifier {
    let title: String
    let remotePresented: Bool
    let titleVisibility: Visibility
    let handlerId: Int?
    let bus: RNWEventBus
    let actionsBody: AnyView?
    let messageBody: AnyView?

    @State private var localPresented: Bool

    init(
        title: String,
        remotePresented: Bool,
        titleVisibility: Visibility,
        handlerId: Int?,
        bus: RNWEventBus,
        actionsBody: AnyView?,
        messageBody: AnyView?
    ) {
        self.title = title
        self.remotePresented = remotePresented
        self.titleVisibility = titleVisibility
        self.handlerId = handlerId
        self.bus = bus
        self.actionsBody = actionsBody
        self.messageBody = messageBody
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
            .confirmationDialog(
                title,
                isPresented: binding,
                titleVisibility: titleVisibility
            ) {
                actionsBody ?? AnyView(EmptyView())
            } message: {
                messageBody ?? AnyView(EmptyView())
            }
            .onChange(of: remotePresented) { newRemote in
                if newRemote != localPresented {
                    localPresented = newRemote
                }
            }
    }
}
