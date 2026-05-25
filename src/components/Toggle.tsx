import { createElement } from 'react';

import type { CommonProps } from '../types';
import { useEventHandler } from '../useEventHandler';
import { useModifiers } from '../useModifiers';

export interface ToggleProps extends CommonProps {
  /// Current on/off state. The control is controlled — JS owns the
  /// truth, the native side mirrors it locally for instant feedback.
  value: boolean;
  /// Fires when the user flips the toggle, with the new value.
  onChange?: (value: boolean) => void;
}

/// SwiftUI `Toggle`. Children become the toggle's label.
export function Toggle(props: ToggleProps) {
  const { onChange, ...rest } = props;
  const onChangeId = useEventHandler<boolean>(onChange);
  const { modifiers, children } = useModifiers(rest.modifiers, rest.children);
  return createElement('Toggle', {
    ...rest,
    onChange: onChangeId,
    modifiers,
    children,
  });
}
