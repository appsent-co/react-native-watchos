import { createNativeView } from '../createNativeView';

export interface NavigationStackProps {}

/// SwiftUI `NavigationStack`. Wrap a screen in this to enable push
/// transitions via descendant `<NavigationLink>` elements. Back gesture
/// and back button are provided by SwiftUI automatically on watchOS.
export const NavigationStack =
  createNativeView<NavigationStackProps>('NavigationStack');
