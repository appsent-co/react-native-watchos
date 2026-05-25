import { createElement } from 'react';

import type { CommonProps } from '../types';
import { useEventHandler } from '../useEventHandler';
import { useModifiers } from '../useModifiers';

export interface TextFieldProps extends CommonProps {
  /// Prompt shown while the field is empty.
  placeholder: string;
  /// Current text. Controlled — JS owns the truth, the native side
  /// mirrors it locally for instant feedback while typing.
  value: string;
  /// Fires as the user types, with the new text.
  onChange?: (value: string) => void;
}

/// SwiftUI `TextField`. No label children — labels are not commonly
/// used on watchOS text fields. Wrap with `<HStack>` + `<Text>` for a
/// caption.
export function TextField(props: TextFieldProps) {
  const { onChange, ...rest } = props;
  const onChangeId = useEventHandler<string>(onChange);
  const { modifiers, children } = useModifiers(rest.modifiers, rest.children);
  return createElement('TextField', {
    ...rest,
    onChange: onChangeId,
    modifiers,
    children,
  });
}
