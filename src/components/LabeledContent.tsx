import { createElement, type FC, type ReactNode } from 'react';

import type { CommonProps } from '../types';
import { useModifiers } from '../useModifiers';

export interface LabeledContentProps {}

interface LabeledContentLabelProps extends CommonProps {
  children?: ReactNode;
}

interface LabeledContentContentProps extends CommonProps {
  children?: ReactNode;
}

/// Sentinel child of `<LabeledContent>` — routes into SwiftUI's `label:` slot.
const Label: FC<LabeledContentLabelProps> = (props) =>
  createElement('LabeledContentLabel', props);
Label.displayName = 'LabeledContent.Label';

/// Sentinel child of `<LabeledContent>` — routes into SwiftUI's `content:` slot.
const Content: FC<LabeledContentContentProps> = (props) =>
  createElement('LabeledContentContent', props);
Content.displayName = 'LabeledContent.Content';

const LabeledContentFn: FC<LabeledContentProps & CommonProps> = (props) => {
  const { modifiers, children } = useModifiers(props.modifiers, props.children);
  return createElement('LabeledContent', { ...props, modifiers, children });
};
LabeledContentFn.displayName = 'LabeledContent';

/// SwiftUI `LabeledContent`. Pairs a label with a content view — typically
/// used as a form row. Nest a `<LabeledContent.Label>` and a
/// `<LabeledContent.Content>` directly under it; bare children fall into
/// the content slot.
export const LabeledContent = Object.assign(LabeledContentFn, {
  Label,
  Content,
});
