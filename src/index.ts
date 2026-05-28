// Side-effect import — installs `setImmediate`/`clearImmediate` globals
// before React's scheduler captures them at module-init time.
import './polyfills';

// Components — built-in SwiftUI views.
export { Text, type TextProps } from './components/Text';
export { VStack, type VStackProps } from './components/VStack';
export { HStack, type HStackProps } from './components/HStack';
export { LazyVStack, type LazyVStackProps } from './components/LazyVStack';
export { LazyHStack, type LazyHStackProps } from './components/LazyHStack';
export { ZStack, type ZStackProps } from './components/ZStack';
export { Group, type GroupProps } from './components/Group';
export { Spacer, type SpacerProps } from './components/Spacer';
export { Divider } from './components/Divider';
export { Rectangle } from './components/Rectangle';
export {
  RoundedRectangle,
  type RoundedRectangleProps,
} from './components/RoundedRectangle';
export { Circle } from './components/Circle';
export { Ellipse } from './components/Ellipse';
export { Capsule } from './components/Capsule';
export { Color, type ColorProps } from './components/Color';
export { ScrollView, type ScrollViewProps } from './components/ScrollView';
export { ScrollViewReader } from './components/ScrollViewReader';
export {
  ViewThatFits,
  type ViewThatFitsProps,
} from './components/ViewThatFits';
export { GeometryReader } from './components/GeometryReader';
export { Button, type ButtonProps } from './components/Button';
export { Toggle, type ToggleProps } from './components/Toggle';
export { Slider, type SliderProps } from './components/Slider';
export { Stepper, type StepperProps } from './components/Stepper';
export { Picker, type PickerProps } from './components/Picker';
export { DatePicker, type DatePickerProps } from './components/DatePicker';
export { TextField, type TextFieldProps } from './components/TextField';
export { SecureField, type SecureFieldProps } from './components/SecureField';
export { Image, type ImageProps } from './components/Image';
export { AsyncImage, type AsyncImageProps } from './components/AsyncImage';
export { Label, type LabelProps } from './components/Label';
export { List, type ListProps } from './components/List';
export { Section, type SectionProps } from './components/Section';
export { Form, type FormProps } from './components/Form';
export { TabView, type TabViewProps } from './components/TabView';
export {
  NavigationStack,
  type NavigationStackProps,
} from './components/NavigationStack';
export {
  NavigationLink,
  type NavigationLinkProps,
} from './components/NavigationLink';
export {
  ProgressView,
  type ProgressViewProps,
} from './components/ProgressView';
export { Gauge, type GaugeProps } from './components/Gauge';
export { EmptyView } from './components/EmptyView';
export { LazyVGrid, type LazyVGridProps } from './components/LazyVGrid';
export { LazyHGrid, type LazyHGridProps } from './components/LazyHGrid';
export { gridItem, type GridItem } from './types/GridItem';
export { Grid, type GridProps } from './components/Grid';
export { GridRow, type GridRowProps } from './components/GridRow';
export {
  LabeledContent,
  type LabeledContentProps,
} from './components/LabeledContent';
export {
  ContentUnavailableView,
  type ContentUnavailableViewProps,
} from './components/ContentUnavailableView';
export { Link, type LinkProps } from './components/Link';
export { ShareLink, type ShareLinkProps } from './components/ShareLink';
export {
  TimelineView,
  type TimelineViewProps,
  type TimelineSchedule,
} from './components/TimelineView';
export {
  LinearGradient,
  type LinearGradientProps,
  type UnitPoint,
  type UnitPointName,
} from './components/LinearGradient';
export {
  RadialGradient,
  type RadialGradientProps,
} from './components/RadialGradient';
export {
  AngularGradient,
  type AngularGradientProps,
} from './components/AngularGradient';

// Component-authoring helpers.
export { createNativeView } from './createNativeView';
export type { ViewModifier, CommonProps } from './types';

// Modifier factories — composed via the `modifiers` prop on any view.
export { padding, type PaddingParams } from './modifiers/padding';
export { background } from './modifiers/background';
export { foregroundColor } from './modifiers/foregroundColor';
export {
  font,
  type FontParams,
  type FontStyle,
  type FontWeight,
} from './modifiers/font';
export { aspectRatio, type AspectRatioParams } from './modifiers/aspectRatio';
export { resizable } from './modifiers/resizable';
export { renderingMode, type RenderingMode } from './modifiers/renderingMode';
export {
  interpolation,
  type InterpolationLevel,
} from './modifiers/interpolation';
export { antialiased } from './modifiers/antialiased';
export { scaledToFit, scaledToFill } from './modifiers/scaledTo';
export {
  frame,
  type FrameParams,
  type FrameAlignment,
} from './modifiers/frame';
export {
  animation,
  type AnimationParams,
  type AnimationCurve,
} from './modifiers/animation';
export { navigationTitle } from './modifiers/navigationTitle';

// Modifier units (batch). Each line below mirrors a barrel under
// `./modifiers/`; the explicit re-exports (vs `export *`) let bundlers
// tree-shake unused modifiers from consumer bundles. Modifiers shipped
// directly above (padding, background, font, navigationTitle, etc.) are
// NOT re-exported from these barrels (units skip already-shipped ones).
export {
  offset,
  type OffsetParams,
  position,
  type PositionParams,
  fixedSize,
  type FixedSizeParams,
  layoutPriority,
  type LayoutPriorityParams,
  zIndex,
  type ZIndexParams,
  hidden,
  type HiddenParams,
  alignmentGuide,
  type AlignmentGuideName,
  type AlignmentGuideParams,
  ignoresSafeArea,
  type SafeAreaEdge,
  type IgnoresSafeAreaParams,
  safeAreaInset,
  type SafeAreaInsetEdge,
  type SafeAreaInsetParams,
} from './modifiers/layout';
export {
  foregroundStyle,
  backgroundStyle,
  border,
  type BorderParams,
  clipShape,
  type ClipShapeParams,
  type ClipShapeKind,
  clipped,
  cornerRadius,
  type CornerRadiusParams,
  opacity,
  type OpacityParams,
  shadow,
  type ShadowParams,
  tint,
  overlay,
  type OverlayParams,
  type OverlayAlignment,
  mask,
  type MaskParams,
  type MaskAlignment,
} from './modifiers/styling';
export {
  fontDesign,
  type FontDesign,
  type FontDesignParams,
  fontWeight,
  type FontWeightParams,
  bold,
  type BoldParams,
  italic,
  type ItalicParams,
  underline,
  type UnderlineParams,
  strikethrough,
  type StrikethroughParams,
  lineLimit,
  type LineLimitParams,
  lineSpacing,
  type LineSpacingParams,
  multilineTextAlignment,
  type TextAlignment,
  type MultilineTextAlignmentParams,
  minimumScaleFactor,
  type MinimumScaleFactorParams,
  truncationMode,
  type TruncationMode,
  type TruncationModeParams,
  monospaced,
  type MonospacedParams,
  monospacedDigit,
  textCase,
  type TextCase,
  type TextCaseParams,
} from './modifiers/text';
export {
  disabled,
  type DisabledParams,
  transition,
  type TransitionParams,
  type TransitionType,
  type TransitionEdge,
  onTapGesture,
  type OnTapGestureParams,
  onLongPressGesture,
  type OnLongPressGestureParams,
  onAppear,
  onDisappear,
  onChange,
  onSubmit,
  type OnSubmitParams,
  type SubmitTrigger,
  task,
  onReceive,
  type OnReceiveParams,
  onOpenURL,
  contextMenu,
  type ContextMenuParams,
  swipeActions,
  type SwipeActionsParams,
  type SwipeEdge,
} from './modifiers/interaction';
export {
  handGestureShortcut,
  type HandGestureShortcutKind,
  type HandGestureShortcutParams,
  sensoryFeedback,
  type SensoryFeedbackKind,
  type SensoryFeedbackParams,
  digitalCrownRotation,
  type DigitalCrownSensitivity,
  type DigitalCrownRotationParams,
  digitalCrownAccessory,
  type DigitalCrownAccessoryParams,
} from './modifiers/watch';
export {
  navigationBarBackButtonHidden,
  searchable,
  type SearchableParams,
  navigationDestination,
  type NavigationDestinationParams,
  sheet,
  type SheetParams,
  fullScreenCover,
  type FullScreenCoverParams,
  alert,
  type AlertParams,
  confirmationDialog,
  type ConfirmationDialogParams,
  type TitleVisibility,
  toolbar,
  type ToolbarParams,
} from './modifiers/navigation';
export {
  listStyle,
  type ListStyleName,
  listRowInsets,
  type ListRowInsetsParams,
  listSectionSpacing,
  type ListSectionSpacingParams,
  type ListSectionSpacingName,
  listItemTint,
  deleteDisabled,
  moveDisabled,
  selectionDisabled,
  listRowBackground,
  type ListRowBackgroundParams,
} from './modifiers/lists';
export {
  buttonStyle,
  type ButtonStyle,
  toggleStyle,
  type ToggleStyle,
  pickerStyle,
  type PickerStyle,
  datePickerStyle,
  type DatePickerStyle,
  progressViewStyle,
  type ProgressViewStyle,
  gaugeStyle,
  type GaugeStyle,
  textFieldStyle,
  type TextFieldStyle,
  labelStyle,
  type LabelStyle,
  labeledContentStyle,
  type LabeledContentStyle,
  formStyle,
  type FormStyle,
  tabViewStyle,
  type TabViewStyle,
  controlSize,
  type ControlSize,
} from './modifiers/componentStyles';
export {
  focusable,
  type FocusableParams,
  submitLabel,
  type SubmitLabelKind,
  type SubmitLabelParams,
  autocorrectionDisabled,
  type AutocorrectionDisabledParams,
  textContentType,
  type TextContentTypeKind,
  type TextContentTypeParams,
  textInputAutocapitalization,
  type TextInputAutocapitalizationKind,
  type TextInputAutocapitalizationParams,
  focused,
  type FocusedParams,
} from './modifiers/input';
export {
  imageScale,
  type ImageScale,
  symbolRenderingMode,
  type SymbolRenderingMode,
  symbolVariant,
  type SymbolVariant,
  symbolEffect,
  type SymbolEffectType,
} from './modifiers/imageSymbol';
export {
  accessibilityLabel,
  accessibilityHint,
  accessibilityValue,
  accessibilityIdentifier,
  accessibilityHidden,
  accessibilityAddTraits,
  type AccessibilityTrait,
  accessibilityRemoveTraits,
  accessibilityElement,
  type AccessibilityChildBehavior,
  id,
  tag,
  accessibilityAction,
  type AccessibilityActionKind,
  type AccessibilityActionParams,
  accessibilityActions,
  type AccessibilityActionsParams,
} from './modifiers/accessibility';
export {
  blur,
  type BlurParams,
  brightness,
  contrast,
  saturation,
  grayscale,
  hueRotation,
  type HueRotationParams,
  colorInvert,
  colorMultiply,
  blendMode,
  type BlendModeValue,
  luminanceToAlpha,
  compositingGroup,
  drawingGroup,
  type DrawingGroupParams,
  geometryGroup,
} from './modifiers/filters';
export {
  rotationEffect,
  type RotationEffectParams,
  type TransformAnchor,
  rotation3DEffect,
  type Rotation3DEffectParams,
  scaleEffect,
  type ScaleEffectParams,
  transformEffect,
  type AffineTransformParams,
  projectionEffect,
} from './modifiers/transforms';
export {
  scrollDisabled,
  scrollIndicators,
  type ScrollIndicatorVisibility,
  type ScrollIndicatorsParams,
  scrollContentBackground,
  type ScrollContentBackgroundVisibility,
  type ScrollContentBackgroundParams,
  scrollDismissesKeyboard,
  type ScrollDismissesKeyboardMode,
  type ScrollDismissesKeyboardParams,
  scrollTargetBehavior,
  type ScrollTargetBehaviorKind,
  type ScrollTargetBehaviorParams,
  scrollTargetLayout,
  scrollBounceBehavior,
  type ScrollBounceBehaviorKind,
  type ScrollBounceAxis,
  type ScrollBounceBehaviorParams,
  scrollClipDisabled,
  defaultScrollAnchor,
  type DefaultScrollAnchorParams,
  contentMargins,
  type ContentMarginEdge,
  type ContentMarginsParams,
  scrollPosition,
  type ScrollPositionParams,
  refreshable,
} from './modifiers/scroll';
export {
  toolbarBackground,
  type ToolbarBackgroundParams,
  type ToolbarBars,
  toolbarColorScheme,
  type ToolbarColorSchemeParams,
  type ToolbarColorScheme,
  toolbarVisibility,
  type ToolbarVisibilityParams,
  type ToolbarVisibilityValue,
  toolbarTitleDisplayMode,
  type ToolbarTitleDisplayModeParams,
  type ToolbarTitleDisplayModeValue,
  toolbarTitleMenu,
  type ToolbarTitleMenuParams,
  tabItem,
  type TabItemParams,
} from './modifiers/toolbar';
export {
  interactiveDismissDisabled,
  presentationDragIndicator,
  type DragIndicatorVisibility,
  presentationDetents,
  type PresentationDetent,
  type PresentationDetentsParams,
  presentationCornerRadius,
  presentationCompactAdaptation,
  type PresentationAdaptation,
  presentationBackground,
  type PresentationBackgroundParams,
} from './modifiers/presentation';
export {
  containerShape,
  type ContainerShapeName,
  type ContainerShapeParams,
  containerRelativeFrame,
  type ContainerRelativeFrameAxes,
  type ContainerRelativeFrameAlignment,
  type ContainerRelativeFrameParams,
  containerValue,
  type ContainerValueParams,
  containerBackground,
  type ContainerBackgroundPlacement,
  type ContainerBackgroundParams,
  gridCellAnchor,
  type GridCellAnchor,
  type GridCellAnchorParams,
  gridCellColumns,
  type GridCellColumnsParams,
  gridCellUnsizedAxes,
  type GridCellUnsizedAxesValue,
  type GridCellUnsizedAxesParams,
  gridColumnAlignment,
  type GridColumnAlignmentGuide,
  type GridColumnAlignmentParams,
} from './modifiers/containerGrid';
export {
  colorScheme,
  type ColorScheme,
  preferredColorScheme,
  dynamicTypeSize,
  type DynamicTypeSize,
  redacted,
  type RedactionReason,
  unredacted,
  privacySensitive,
  headerProminence,
  type Prominence,
} from './modifiers/theme';
export {
  buttonBorderShape,
  type ButtonBorderShapeValue,
  buttonRepeatBehavior,
  type ButtonRepeatBehaviorValue,
  buttonSizing,
  type ButtonSizingValue,
  menuActionDismissBehavior,
  type MenuActionDismissBehaviorValue,
  menuOrder,
  type MenuOrderValue,
  labelsHidden,
  labelsVisibility,
  type LabelsVisibilityValue,
  labelIconToTitleSpacing,
  labelReservedIconWidth,
} from './modifiers/controlsPolish';
export {
  kerning,
  tracking,
  baselineOffset,
  allowsTightening,
  textScale,
  type TextScale,
} from './modifiers/textPolish';
export {
  searchCompletion,
  type SearchCompletionParams,
  searchToolbarBehavior,
  type SearchToolbarBehavior,
  type SearchToolbarBehaviorParams,
  searchPresentationToolbarBehavior,
  type SearchPresentationToolbarBehavior,
  type SearchPresentationToolbarBehaviorParams,
  searchSuggestions,
  type SearchSuggestionsParams,
} from './modifiers/search';
export {
  coordinateSpace,
  type CoordinateSpaceParams,
  matchedGeometryEffect,
  type MatchedGeometryEffectParams,
  type MatchedGeometryProperty,
  matchedTransitionSource,
  type MatchedTransitionSourceParams,
  navigationTransition,
  type NavigationTransitionParams,
  type NavigationTransitionType,
  onGeometryChange,
  type GeometrySize,
} from './modifiers/geometry';
export {
  allowsHitTesting,
  contentShape,
  type ContentShapeKind,
  type ContentShapeParams,
  springLoadingBehavior,
  type SpringLoadingBehaviorValue,
  gesture,
  type GestureParams,
  type GestureType,
  simultaneousGesture,
  highPriorityGesture,
} from './modifiers/gestures';
export {
  help,
  type HelpParams,
  environment,
  type EnvironmentParams,
  type EnvironmentKey,
  type EnvironmentLayoutDirection,
  type EnvironmentTextAlignment,
  environmentObject,
  type EnvironmentObjectParams,
  defaultAppStorage,
  type DefaultAppStorageParams,
} from './modifiers/environment';
export {
  glassEffect,
  type GlassEffectParams,
  type GlassVariant,
  type GlassShape,
  glassEffectID,
  type GlassEffectIDParams,
  glassEffectTransition,
  type GlassEffectTransitionParams,
  type GlassEffectTransitionType,
  glassEffectUnion,
  type GlassEffectUnionParams,
  materialActiveAppearance,
  type MaterialActiveAppearanceParams,
  type MaterialActiveAppearanceMode,
  backgroundExtensionEffect,
} from './modifiers/glass';

// Renderer entry point.
export { render } from './render';
