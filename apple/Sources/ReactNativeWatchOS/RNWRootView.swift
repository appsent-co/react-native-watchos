import SwiftUI
import ReactNativeWatchOSCxx

/// SwiftUI renderer over `ReactNativeWatchOSHost.root`. Per-view-type
/// dispatch lives in `RNWNodeRenderer` + the view/modifier registries.
public struct RNWRootView: View {
    @ObservedObject private var host: ReactNativeWatchOSHost

    public init(host: ReactNativeWatchOSHost) {
        Self.bootstrap()
        self.host = host
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(host.root, id: \.tag) { node in
                RNWNodeRenderer.render(node, bus: host.eventBus)
            }
        }
    }

    // MARK: - One-shot built-in registration
    //
    // Lazy (not `+load`) so consumers can pre-register their own builders
    // before the built-ins land. `static let` gives dispatch-once for free.

    private static let bootstrapOnce: Void = {
        RNWTextView.register(into: .shared)
        RNWVStackView.register(into: .shared)
        RNWHStackView.register(into: .shared)
        RNWLazyVStackView.register(into: .shared)
        RNWLazyHStackView.register(into: .shared)
        RNWZStackView.register(into: .shared)
        RNWGroupView.register(into: .shared)
        RNWSpacerView.register(into: .shared)
        RNWDividerView.register(into: .shared)
        RNWRectangleView.register(into: .shared)
        RNWRoundedRectangleView.register(into: .shared)
        RNWCircleView.register(into: .shared)
        RNWEllipseView.register(into: .shared)
        RNWCapsuleView.register(into: .shared)
        RNWColorView.register(into: .shared)
        RNWScrollViewView.register(into: .shared)
        RNWScrollViewReaderView.register(into: .shared)
        RNWViewThatFitsView.register(into: .shared)
        RNWGeometryReaderView.register(into: .shared)
        RNWButtonView.register(into: .shared)
        RNWToggleView.register(into: .shared)
        RNWSliderView.register(into: .shared)
        RNWStepperView.register(into: .shared)
        RNWPickerView.register(into: .shared)
        RNWDatePickerView.register(into: .shared)
        RNWTextFieldView.register(into: .shared)
        RNWSecureFieldView.register(into: .shared)
        RNWImageView.register(into: .shared)
        RNWAsyncImageView.register(into: .shared)
        RNWAsyncImageImageView.register(into: .shared)
        RNWAsyncImagePhaseEmptyView.register(into: .shared)
        RNWAsyncImagePhaseSuccessView.register(into: .shared)
        RNWAsyncImagePhaseFailureView.register(into: .shared)
        RNWLabelView.register(into: .shared)
        RNWListView.register(into: .shared)
        RNWSectionView.register(into: .shared)
        RNWSectionHeaderView.register(into: .shared)
        RNWSectionFooterView.register(into: .shared)
        RNWFormView.register(into: .shared)
        RNWTabViewView.register(into: .shared)
        RNWNavigationStackView.register(into: .shared)
        RNWNavigationLinkView.register(into: .shared)
        RNWNavigationLinkLabelView.register(into: .shared)
        RNWNavigationLinkDestinationView.register(into: .shared)
        RNWProgressViewView.register(into: .shared)
        RNWGaugeView.register(into: .shared)
        RNWEmptyViewView.register(into: .shared)
        RNWLazyVGridView.register(into: .shared)
        RNWLazyHGridView.register(into: .shared)
        RNWGridView.register(into: .shared)
        RNWGridRowView.register(into: .shared)
        RNWLabeledContentView.register(into: .shared)
        RNWLabeledContentLabelView.register(into: .shared)
        RNWLabeledContentContentView.register(into: .shared)
        RNWContentUnavailableView.register(into: .shared)
        RNWContentUnavailableLabelView.register(into: .shared)
        RNWContentUnavailableDescriptionView.register(into: .shared)
        RNWContentUnavailableActionsView.register(into: .shared)
        RNWLinkView.register(into: .shared)
        RNWShareLinkView.register(into: .shared)
        RNWTimelineViewView.register(into: .shared)
        RNWLinearGradientView.register(into: .shared)
        RNWRadialGradientView.register(into: .shared)
        RNWAngularGradientView.register(into: .shared)
        // Hosts sheet/overlay/toolbar bodies.
        RNWModifierContentView.register(into: .shared)

        RNWPaddingModifier.register(into: .shared)
        RNWBackgroundModifier.register(into: .shared)
        RNWForegroundColorModifier.register(into: .shared)
        RNWFontModifier.register(into: .shared)
        RNWAspectRatioModifier.register(into: .shared)
        RNWFrameModifier.register(into: .shared)
        RNWAnimationModifier.register(into: .shared)
        RNWNavigationTitleModifier.register(into: .shared)

        // Image-specific — kept on the Image-typed chain so subsequent
        // Image-only modifiers stay applicable.
        RNWResizableModifier.register(into: .shared)
        RNWRenderingModeModifier.register(into: .shared)
        RNWInterpolationModifier.register(into: .shared)
        RNWAntialiasedModifier.register(into: .shared)

        RNWLayoutModifiers.registerAll()
        RNWStylingModifiers.registerAll()
        RNWTextModifiers.registerAll()
        RNWInteractionModifiers.registerAll()
        RNWWatchModifiers.registerAll()
        RNWNavigationModifiers.registerAll()
        RNWListsModifiers.registerAll()
        RNWComponentStylesModifiers.registerAll()
        RNWInputModifiers.registerAll()
        RNWImageSymbolModifiers.registerAll()
        RNWAccessibilityModifiers.registerAll()
        RNWFiltersModifiers.registerAll()
        RNWTransformsModifiers.registerAll()
        RNWScrollModifiers.registerAll()
        RNWToolbarModifiers.registerAll()
        RNWPresentationModifiers.registerAll()
        RNWContainerGridModifiers.registerAll()
        RNWThemeModifiers.registerAll()
        RNWControlsPolishModifiers.registerAll()
        RNWTextPolishModifiers.registerAll()
        RNWSearchModifiers.registerAll()
        RNWGeometryModifiers.registerAll()
        RNWGesturesModifiers.registerAll()
        RNWEnvironmentModifiers.registerAll()
        RNWGlassModifiers.registerAll()
    }()

    private static func bootstrap() {
        _ = bootstrapOnce
    }
}
