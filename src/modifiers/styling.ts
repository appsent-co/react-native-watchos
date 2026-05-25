// "Styling" modifiers. `background` is intentionally NOT re-exported here —
// it ships from `src/index.ts` directly (its content overload lives in
// `./background`).
export { foregroundStyle } from './foregroundStyle';
export { backgroundStyle } from './backgroundStyle';
export { border, type BorderParams } from './border';
export {
  clipShape,
  type ClipShapeParams,
  type ClipShapeKind,
} from './clipShape';
export { clipped } from './clipped';
export { cornerRadius, type CornerRadiusParams } from './cornerRadius';
export { opacity, type OpacityParams } from './opacity';
export { shadow, type ShadowParams } from './shadow';
export { tint } from './tint';
export {
  overlay,
  type OverlayParams,
  type OverlayAlignment,
} from './overlay';
export { mask, type MaskParams, type MaskAlignment } from './mask';
