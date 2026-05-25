import { createModifier } from './createModifier';

/// SwiftUI `Font.Design` values.
export type FontDesign = 'default' | 'serif' | 'rounded' | 'monospaced';

export interface FontDesignParams {
  design?: FontDesign;
}

/// SwiftUI `.fontDesign(_:)` (watchOS 9+). Overrides the font design of
/// text within the view — e.g. `'rounded'` for SF Rounded. Pass a design
/// string directly or an object.
export function fontDesign(params?: FontDesignParams | FontDesign) {
  if (typeof params === 'string') {
    return createModifier('fontDesign', { design: params });
  }
  return createModifier('fontDesign', params);
}
