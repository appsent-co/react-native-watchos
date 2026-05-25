import { createNativeView } from '../createNativeView';

export interface LinkProps {
  destination: string;
  title?: string;
}

export const Link = createNativeView<LinkProps>('Link');
