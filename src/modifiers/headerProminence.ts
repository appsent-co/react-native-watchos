import { createModifier } from './createModifier';

/// SwiftUI `Prominence` values for section headers.
export type Prominence = 'standard' | 'increased';

/// SwiftUI `.headerProminence(_:)`. Sets the prominence of section headers
/// within the view — `'increased'` gives list section headers a larger,
/// more emphasized appearance.
export function headerProminence(value: Prominence) {
  return createModifier('headerProminence', { value });
}
