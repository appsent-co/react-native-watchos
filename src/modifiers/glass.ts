// "Glass (watchOS 26)" modifiers — SwiftUI Liquid Glass. Every modifier in
// this unit is gated to watchOS 26+ on the native side and is a no-op on
// older OS versions.
export {
  glassEffect,
  type GlassEffectParams,
  type GlassVariant,
  type GlassShape,
} from './glassEffect';
export { glassEffectID, type GlassEffectIDParams } from './glassEffectID';
export {
  glassEffectTransition,
  type GlassEffectTransitionParams,
  type GlassEffectTransitionType,
} from './glassEffectTransition';
export {
  glassEffectUnion,
  type GlassEffectUnionParams,
} from './glassEffectUnion';
export {
  materialActiveAppearance,
  type MaterialActiveAppearanceParams,
  type MaterialActiveAppearanceMode,
} from './materialActiveAppearance';
export { backgroundExtensionEffect } from './backgroundExtensionEffect';
