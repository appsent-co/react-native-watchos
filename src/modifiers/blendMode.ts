import { createModifier } from './createModifier';

/// SwiftUI `BlendMode` cases. Mirrors the porter-duff / separable blend
/// modes available to `.blendMode(_:)`.
export type BlendModeValue =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'colorDodge'
  | 'colorBurn'
  | 'softLight'
  | 'hardLight'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'
  | 'plusDarker'
  | 'plusLighter';

/// SwiftUI `.blendMode(_:)`. Sets how the view composites with the
/// content behind it.
export function blendMode(mode: BlendModeValue) {
  return createModifier('blendMode', { mode });
}
