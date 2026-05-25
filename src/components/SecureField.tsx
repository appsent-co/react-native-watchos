import { createElement } from 'react';

import type { CommonProps } from '../types';
import { useEventHandler } from '../useEventHandler';
import { useModifiers } from '../useModifiers';

export interface SecureFieldProps extends CommonProps {
  /// Prompt shown while the field is empty.
  placeholder: string;
  /// Current text. Controlled — JS owns the truth, the native side
  /// mirrors it locally for instant feedback while typing.
  value: string;
  /// Fires as the user types, with the new text.
  onChange?: (value: string) => void;
}

/// SwiftUI `SecureField`. Same shape as `TextField` but the glyphs are
/// masked. No label children — wrap with `<HStack>` + `<Text>` for a
/// caption.
export function SecureField(props: SecureFieldProps) {
  const { onChange, ...rest } = props;
  const onChangeId = useEventHandler<string>(onChange);
  const { modifiers, children } = useModifiers(rest.modifiers, rest.children);
  return createElement('SecureField', {
    ...rest,
    onChange: onChangeId,
    modifiers,
    children,
  });
}
