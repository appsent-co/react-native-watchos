import { createElement, type FC, type ReactNode } from 'react';

import type { CommonProps } from '../types';
import { useModifiers } from '../useModifiers';

export interface SectionProps {}

interface SectionHeaderProps extends CommonProps {
  children?: ReactNode;
}

interface SectionFooterProps extends CommonProps {
  children?: ReactNode;
}

/// Sentinel child of `<Section>`. Its contents are routed into SwiftUI's
/// `header:` slot. Outside a `Section` it falls back to rendering its
/// children inline (graceful degradation, not an intended use).
const Header: FC<SectionHeaderProps> = (props) =>
  createElement('SectionHeader', props);
Header.displayName = 'Section.Header';

/// Sentinel child of `<Section>` — routes into SwiftUI's `footer:` slot.
const Footer: FC<SectionFooterProps> = (props) =>
  createElement('SectionFooter', props);
Footer.displayName = 'Section.Footer';

const SectionFn: FC<SectionProps & CommonProps> = (props) => {
  const { modifiers, children } = useModifiers(props.modifiers, props.children);
  return createElement('Section', { ...props, modifiers, children });
};
SectionFn.displayName = 'Section';

/// SwiftUI `Section`. Place inside a `<List>` to group rows. Optionally
/// nest a single `<Section.Header>` and/or `<Section.Footer>` directly
/// under it; remaining children become the section's rows.
export const Section = Object.assign(SectionFn, { Header, Footer });
