import { createModifier } from './createModifier';

/// SwiftUI `.onChange(of:perform:)`. Fires `handler` with the new value
/// whenever `value` differs from the previous render. `value` must be a
/// bridgeable primitive (string / number / boolean).
///
/// ```tsx
/// <Text modifiers={[onChange(selectedTab, (v) => persist(v))]} />
/// ```
export function onChange<T extends string | number | boolean>(
  value: T,
  handler: (newValue: T) => void
) {
  return createModifier('onChange', { value, handler });
}
