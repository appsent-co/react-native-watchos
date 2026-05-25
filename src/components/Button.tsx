import { createElement } from 'react';

import type { CommonProps } from '../types';
import { useEventHandler } from '../useEventHandler';
import { useModifiers } from '../useModifiers';

export interface ButtonProps extends CommonProps {
  /// Fires on tap. Children become the label of the SwiftUI button.
  onPress?: () => void;
}

/// SwiftUI `Button`. Children become the label content (typically a
/// `<Text>` but any view works — Image + Text for an icon-with-caption,
/// HStack of multiple children, etc.).
export function Button(props: ButtonProps) {
  const { onPress, ...rest } = props;
  const onPressId = useEventHandler<void>(onPress);
  const { modifiers, children } = useModifiers(rest.modifiers, rest.children);
  return createElement('Button', {
    ...rest,
    onPress: onPressId,
    modifiers,
    children,
  });
}
