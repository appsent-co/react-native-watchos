import { createElement, type FC } from 'react';

import { resolveAssetSource } from '../resolveAssetSource';
import type { CommonProps } from '../types';
import { useModifiers } from '../useModifiers';

/// What `require('./foo.png')` evaluates to (a numeric asset id) or an
/// explicit URL object. The native side ultimately needs a uri string —
/// the JS component resolves the id form before dispatch.
export type ImageSourcePropType =
  | number
  | { uri: string; width?: number; height?: number; scale?: number };

export interface ImageProps {
  /// SF Symbol name (e.g. `'heart.fill'`). Takes precedence over `source`.
  systemName?: string;
  /// Bundled local image (`require('./foo.png')`) or a remote/file URL.
  source?: ImageSourcePropType;
}

export const Image: FC<ImageProps & CommonProps> = (props) => {
  const { source, ...rest } = props;
  let resolved: { uri: string; width?: number; height?: number; scale?: number } | undefined;
  if (typeof source === 'number') {
    resolved = resolveAssetSource(source) ?? undefined;
  } else if (source && typeof source === 'object') {
    resolved = source;
  }

  const { modifiers, children } = useModifiers(rest.modifiers, rest.children);
  return createElement('Image', {
    ...rest,
    source: resolved,
    modifiers,
    children,
  } as Record<string, unknown>);
};
Image.displayName = 'Image';
