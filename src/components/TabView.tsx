import { createElement } from 'react';

import type { CommonProps } from '../types';
import { useEventHandler } from '../useEventHandler';
import { useModifiers } from '../useModifiers';

export interface TabViewProps extends CommonProps {
  /// Currently selected tab. Matched against each child's `tabTag` prop.
  /// When omitted, defaults to the first child's `tabTag` (or its index
  /// position if none was set).
  selection?: string;
  /// Fires when the user pages to a different tab via swipe / Digital
  /// Crown. JS should mirror the new tag back to `selection`.
  onSelectionChange?: (tag: string) => void;
  /// Tab navigation style. Defaults to `'page'` (the watchOS norm — swipe
  /// or crown to page between tabs). `'automatic'` lets SwiftUI pick.
  style?: 'page' | 'automatic';
}

/// SwiftUI `TabView` with watchOS-style paged navigation. Each child
/// declares a string `tabTag` prop; `selection` matches one of those tags.
///
/// ```tsx
/// <TabView selection={tab} onSelectionChange={setTab}>
///   <VStack tabTag="rooms"> … </VStack>
///   <VStack tabTag="schedule"> … </VStack>
/// </TabView>
/// ```
export function TabView(props: TabViewProps) {
  const { onSelectionChange, ...rest } = props;
  const onSelectionChangeId = useEventHandler<string>(onSelectionChange);
  const { modifiers, children } = useModifiers(rest.modifiers, rest.children);
  return createElement('TabView', {
    ...rest,
    onSelectionChange: onSelectionChangeId,
    modifiers,
    children,
  });
}
