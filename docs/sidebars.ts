import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/your-first-screen',
        'getting-started/customizing-the-watch-target',
        'getting-started/pure-react-native',
      ],
    },
    {
      type: 'category',
      label: 'Renderer',
      items: [
        'renderer/overview',
        'renderer/layout',
        'renderer/text-and-images',
        'renderer/controls',
        'renderer/lists',
        'renderer/modifiers',
        'renderer/styling',
      ],
    },
    {
      type: 'category',
      label: 'Navigation',
      items: [
        'navigation/navigation-stack',
        'navigation/navigation-link',
        'navigation/tab-view',
        'navigation/sheet',
      ],
    },
    'watch-connectivity',
    {
      type: 'category',
      label: 'Native modules',
      items: ['native/turbo-modules'],
    },
    {
      type: 'category',
      label: 'Developer experience',
      items: ['dx/metro', 'dx/fast-refresh', 'dx/error-toast'],
    },
    'expo-plugin',
    'architecture',
    'contributing',
  ],
};

export default sidebars;
