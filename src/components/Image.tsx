import { createNativeView } from '../createNativeView';

export interface ImageProps {
  /// SF Symbol name (e.g. `'heart.fill'`, `'arrow.clockwise'`). The only
  /// supported source for now — asset-catalog and remote images come
  /// later.
  systemName: string;
}

export const Image = createNativeView<ImageProps>('Image');
