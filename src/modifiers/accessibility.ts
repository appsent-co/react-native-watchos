// "Accessibility & identity" modifiers. Re-exports every factory + type
// this unit adds; picked up by `src/index.ts` via `export *`.
export { accessibilityLabel } from './accessibilityLabel';
export { accessibilityHint } from './accessibilityHint';
export { accessibilityValue } from './accessibilityValue';
export { accessibilityIdentifier } from './accessibilityIdentifier';
export { accessibilityHidden } from './accessibilityHidden';
export {
  accessibilityAddTraits,
  type AccessibilityTrait,
} from './accessibilityAddTraits';
export { accessibilityRemoveTraits } from './accessibilityRemoveTraits';
export {
  accessibilityElement,
  type AccessibilityChildBehavior,
} from './accessibilityElement';
export { id } from './id';
export { tag } from './tag';
export {
  accessibilityAction,
  type AccessibilityActionKind,
  type AccessibilityActionParams,
} from './accessibilityAction';
export {
  accessibilityActions,
  type AccessibilityActionsParams,
} from './accessibilityActions';
