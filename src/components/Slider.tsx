import { createElement } from 'react';

import type { CommonProps } from '../types';
import { useEventHandler } from '../useEventHandler';
import { useModifiers } from '../useModifiers';

export interface SliderProps extends CommonProps {
  /// Current value. Controlled — JS owns the truth.
  value: number;
  /// Inclusive minimum. Defaults to 0.
  min?: number;
  /// Inclusive maximum. Defaults to 1.
  max?: number;
  /// Optional snapping increment. Continuous when omitted.
  step?: number;
  /// Fires while dragging with the new value.
  onChange?: (value: number) => void;
}

/// SwiftUI `Slider`. No label children — labels are not commonly used on
/// watchOS sliders. Wrap with `<HStack>` + `<Text>` for a caption.
export function Slider(props: SliderProps) {
  const { onChange, ...rest } = props;
  const onChangeId = useEventHandler<number>(onChange);
  const { modifiers, children } = useModifiers(rest.modifiers, rest.children);
  return createElement('Slider', {
    ...rest,
    onChange: onChangeId,
    modifiers,
    children,
  });
}
