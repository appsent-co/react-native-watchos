import { createNativeView } from '../createNativeView';

export interface ShareLinkProps {
  /// The string payload presented to the share sheet. Wrap URLs or other
  /// content as a string — only `String` items are supported on watchOS.
  item: string;
  /// Optional subject hint (used by Mail, Messages, etc.).
  subject?: string;
  /// Optional message hint shown alongside the item.
  message?: string;
  /// Shortcut for `ShareLink("title", item: ...)` — when set, children
  /// are ignored and SwiftUI renders its default label with this title.
  title?: string;
}

/// SwiftUI `ShareLink`. Presents the system share sheet for a string
/// item. Children become the label when `title` is not provided.
export const ShareLink = createNativeView<ShareLinkProps>('ShareLink');
