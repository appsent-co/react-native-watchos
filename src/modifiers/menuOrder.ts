import { createModifier } from './createModifier';

/// The order menu items are presented in.
/// - `'priority'` keeps the declared order, anchored nearest the menu trigger
/// - `'fixed'` keeps the declared order regardless of placement
export type MenuOrderValue = 'automatic' | 'fixed' | 'priority';

/// SwiftUI `.menuOrder(_:)`. Controls the presentation order of items inside a
/// menu (e.g. whether the first item sits closest to the user's finger).
export function menuOrder(order: MenuOrderValue = 'automatic') {
  return createModifier('menuOrder', { order });
}
