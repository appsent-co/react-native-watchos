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

// Modifier units (batch). Each barrel is filled by its work unit; the
// `export *` picks up every factory + type that unit adds. Modifiers above
// are NOT re-exported from these barrels (units skip already-shipped ones).
export * from './modifiers/layout';
export * from './modifiers/styling';
export * from './modifiers/text';
export * from './modifiers/interaction';
export * from './modifiers/watch';
export * from './modifiers/navigation';
export * from './modifiers/lists';
export * from './modifiers/componentStyles';
export * from './modifiers/input';
export * from './modifiers/imageSymbol';
export * from './modifiers/accessibility';
export * from './modifiers/filters';
export * from './modifiers/transforms';
export * from './modifiers/scroll';
export * from './modifiers/toolbar';
export * from './modifiers/presentation';
export * from './modifiers/containerGrid';
export * from './modifiers/theme';
export * from './modifiers/controlsPolish';
export * from './modifiers/textPolish';
export * from './modifiers/search';
export * from './modifiers/geometry';
export * from './modifiers/gestures';
export * from './modifiers/environment';
export * from './modifiers/glass';

// Renderer entry point.
export { render } from './render';
