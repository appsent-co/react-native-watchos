import { createElement } from 'react';

import type { CommonProps } from '../types';
import { useEventHandler } from '../useEventHandler';
import { useModifiers } from '../useModifiers';

export interface PickerOption {
  /// Stable tag passed to `onSelectionChange` and matched against `selection`.
  value: string;
  /// Human-readable text shown in the picker UI.
  label: string;
}

export interface PickerProps extends CommonProps {
  /// Picker label, shown next to the selection on watchOS.
  label: string;
  /// Currently selected option's `value`. Controlled — JS owns the truth.
  selection: string;
  /// Choices rendered inside the picker. Passed as a prop array rather
  /// than children so the JSON tree stays flat — SwiftUI's tag-based
  /// child model doesn't translate cleanly through the bridge.
  options: PickerOption[];
  /// Fires when the user picks a different option, with the new `value`.
  onSelectionChange?: (value: string) => void;
}

/// SwiftUI `Picker`. Options live as a prop array — each is rendered as a
/// tagged `Text` row in the native picker.
export function Picker(props: PickerProps) {
  const { onSelectionChange, ...rest } = props;
  const onSelectionChangeId = useEventHandler<string>(onSelectionChange);
  const { modifiers, children } = useModifiers(rest.modifiers, rest.children);
  return createElement('Picker', {
    ...rest,
    onSelectionChange: onSelectionChangeId,
    modifiers,
    children,
  });
}
