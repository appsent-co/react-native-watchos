// "Text" modifiers. `font` is NOT re-exported here — it already ships
// from `src/index.ts`. One unit owns this file.
export {
  fontDesign,
  type FontDesign,
  type FontDesignParams,
} from './fontDesign';
export { fontWeight, type FontWeightParams } from './fontWeight';
export { bold, type BoldParams } from './bold';
export { italic, type ItalicParams } from './italic';
export { underline, type UnderlineParams } from './underline';
export { strikethrough, type StrikethroughParams } from './strikethrough';
export { lineLimit, type LineLimitParams } from './lineLimit';
export { lineSpacing, type LineSpacingParams } from './lineSpacing';
export {
  multilineTextAlignment,
  type TextAlignment,
  type MultilineTextAlignmentParams,
} from './multilineTextAlignment';
export {
  minimumScaleFactor,
  type MinimumScaleFactorParams,
} from './minimumScaleFactor';
export {
  truncationMode,
  type TruncationMode,
  type TruncationModeParams,
} from './truncationMode';
export { monospaced, type MonospacedParams } from './monospaced';
export { monospacedDigit } from './monospacedDigit';
export { textCase, type TextCase, type TextCaseParams } from './textCase';
