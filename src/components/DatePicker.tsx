import { createElement } from 'react';

import type { CommonProps } from '../types';
import { useEventHandler } from '../useEventHandler';
import { useModifiers } from '../useModifiers';

/// Which calendar fields the picker exposes. Defaults to `'dateAndTime'`.
export type DatePickerComponents = 'date' | 'hourAndMinute' | 'dateAndTime';

export interface DatePickerProps extends CommonProps {
  /// Visible label.
  label: string;
  /// Current selection as an ISO-8601 string. Controlled — JS owns the
  /// truth; the native side mirrors it locally for instant feedback.
  selection: string;
  /// Which calendar fields to show. Defaults to `'dateAndTime'`.
  displayedComponents?: DatePickerComponents;
  /// Optional inclusive lower bound (ISO-8601). Only enforced when both
  /// `minimum` and `maximum` are supplied.
  minimum?: string;
  /// Optional inclusive upper bound (ISO-8601). Only enforced when both
  /// `minimum` and `maximum` are supplied.
  maximum?: string;
  /// Fires when the user picks a new date, with the new ISO-8601 string.
  onSelectionChange?: (iso: string) => void;
}

/// SwiftUI `DatePicker`. Dates cross the bridge as ISO-8601 strings
/// because JSON has no native `Date` type.
export function DatePicker(props: DatePickerProps) {
  const { onSelectionChange, ...rest } = props;
  const onSelectionChangeId = useEventHandler<string>(onSelectionChange);
  const { modifiers, children } = useModifiers(rest.modifiers, rest.children);
  return createElement('DatePicker', {
    ...rest,
    onSelectionChange: onSelectionChangeId,
    modifiers,
    children,
  });
}
