import { createElement } from 'react';

import type { CommonProps } from '../types';
import { useEventHandler } from '../useEventHandler';
import { useModifiers } from '../useModifiers';

export interface StepperProps extends CommonProps {
  /// Label rendered alongside the +/- controls.
  label: string;
  /// Current value. Controlled — JS owns the truth.
  value: number;
  /// Inclusive minimum. When both `minimum` and `maximum` are present
  /// the value is clamped to that range; otherwise it is unbounded.
  minimum?: number;
  /// Inclusive maximum. See `minimum`.
  maximum?: number;
  /// Increment per tap. Defaults to 1 on the native side.
  step?: number;
  /// Fires when the user taps +/- with the new value.
  onChange?: (value: number) => void;
}

/// SwiftUI `Stepper`. No children — the label is provided via the
/// `label` prop (matches SwiftUI's `Stepper(_:value:in:step:)` overload).
export function Stepper(props: StepperProps) {
  const { onChange, ...rest } = props;
  const onChangeId = useEventHandler<number>(onChange);
  const { modifiers, children } = useModifiers(rest.modifiers, rest.children);
  return createElement('Stepper', {
    ...rest,
    onChange: onChangeId,
    modifiers,
    children,
  });
}
