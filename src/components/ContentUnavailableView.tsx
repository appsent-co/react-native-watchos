import { createElement, type FC, type ReactNode } from 'react';

import type { CommonProps } from '../types';
import { useModifiers } from '../useModifiers';

export interface ContentUnavailableViewProps {
  variant?: 'default' | 'search';
  searchText?: string;
}

interface SlotProps extends CommonProps {
  children?: ReactNode;
}

/// Sentinel child — routes into SwiftUI's `label:` slot.
const Label: FC<SlotProps> = (props) =>
  createElement('ContentUnavailableLabel', props);
Label.displayName = 'ContentUnavailableView.Label';

/// Sentinel child — routes into SwiftUI's `description:` slot.
const Description: FC<SlotProps> = (props) =>
  createElement('ContentUnavailableDescription', props);
Description.displayName = 'ContentUnavailableView.Description';

/// Sentinel child — routes into SwiftUI's `actions:` slot.
const Actions: FC<SlotProps> = (props) =>
  createElement('ContentUnavailableActions', props);
Actions.displayName = 'ContentUnavailableView.Actions';

const ContentUnavailableViewFn: FC<ContentUnavailableViewProps & CommonProps> = (
  props
) => {
  const { modifiers, children } = useModifiers(props.modifiers, props.children);
  return createElement('ContentUnavailableView', { ...props, modifiers, children });
};
ContentUnavailableViewFn.displayName = 'ContentUnavailableView';

/// SwiftUI `ContentUnavailableView` (watchOS 10+). Default form takes
/// `<ContentUnavailableView.Label>` / `.Description` / `.Actions` as
/// children. Pass `variant="search"` (with optional `searchText`) to use
/// the system-provided empty-search-results preset; children are ignored
/// in that mode.
export const ContentUnavailableView = Object.assign(ContentUnavailableViewFn, {
  Label,
  Description,
  Actions,
});
