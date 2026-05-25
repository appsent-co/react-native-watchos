import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

/// Which container the background applies to.
export type ContainerBackgroundPlacement = 'navigation' | 'tabView' | 'widget';

export interface ContainerBackgroundParams {
  /// A shape style for the background — a color (`'red'`, `'#RRGGBB'`),
  /// a semantic level (`'primary'`, …), `'tint'`, or a material
  /// (`'regularMaterial'`, …). Ignored when `content` is provided.
  style?: string;
  /// An arbitrary view to use as the background instead of a `style`.
  /// Takes precedence over `style` when both are set.
  content?: ReactNode;
  /// The container to attach the background to. Defaults to
  /// `'navigation'`.
  container?: ContainerBackgroundPlacement;
}

/// SwiftUI `.containerBackground(_:for:)` / `.containerBackground(for:){…}`.
/// Sets the background of an enclosing container (the navigation stack by
/// default). Requires watchOS 10+; on older systems the view is returned
/// unchanged.
export function containerBackground(
  params: ContainerBackgroundParams
): ReturnType<typeof createModifier>;
export function containerBackground(
  style: string,
  container?: ContainerBackgroundPlacement
): ReturnType<typeof createModifier>;
export function containerBackground(
  a: ContainerBackgroundParams | string,
  container?: ContainerBackgroundPlacement
) {
  if (typeof a === 'string') {
    return createModifier('containerBackground', { style: a, container });
  }
  return createModifier('containerBackground', a);
}
