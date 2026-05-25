import { createElement, type FC, type ReactNode } from 'react';

import type { CommonProps } from '../types';
import { useModifiers } from '../useModifiers';

export interface NavigationLinkProps {}

interface NavigationLinkLabelProps extends CommonProps {
  children?: ReactNode;
}

interface NavigationLinkDestinationProps extends CommonProps {
  children?: ReactNode;
}

/// Sentinel child of `<NavigationLink>`. Its contents form the
/// always-visible tap target (the row, in a `<List>`). Outside a
/// `NavigationLink` it falls back to rendering its children inline.
const Label: FC<NavigationLinkLabelProps> = (props) =>
  createElement('NavigationLinkLabel', props);
Label.displayName = 'NavigationLink.Label';

/// Sentinel child of `<NavigationLink>` — its contents become the screen
/// pushed onto the navigation stack when the label is tapped.
const Destination: FC<NavigationLinkDestinationProps> = (props) =>
  createElement('NavigationLinkDestination', props);
Destination.displayName = 'NavigationLink.Destination';

const NavigationLinkFn: FC<NavigationLinkProps & CommonProps> = (props) => {
  const { modifiers, children } = useModifiers(props.modifiers, props.children);
  return createElement('NavigationLink', { ...props, modifiers, children });
};
NavigationLinkFn.displayName = 'NavigationLink';

/// SwiftUI `NavigationLink`. Place inside a `<NavigationStack>`. Nest a
/// single `<NavigationLink.Label>` (the visible row) and a single
/// `<NavigationLink.Destination>` (the pushed screen).
///
/// ```tsx
/// <NavigationLink>
///   <NavigationLink.Label><Text>Room A</Text></NavigationLink.Label>
///   <NavigationLink.Destination><TasksScreen /></NavigationLink.Destination>
/// </NavigationLink>
/// ```
export const NavigationLink = Object.assign(NavigationLinkFn, {
  Label,
  Destination,
});
