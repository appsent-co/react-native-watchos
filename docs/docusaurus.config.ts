import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const repoUrl = 'https://github.com/appsent-co/react-native-watchos';
const editBranch = 'main';

const config: Config = {
  title: 'react-native-watchos',
  tagline: 'Build watchOS apps with React Native, rendered as native SwiftUI.',
  favicon: 'img/favicon.ico',

  url: 'https://appsent-co.github.io',
  baseUrl: '/react-native-watchos/',

  organizationName: 'appsent-co',
  projectName: 'react-native-watchos',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-llms',
      {
        generateLLMsTxt: true,
        generateLLMsFullTxt: true,
        docsDir: 'docs',
        title: 'react-native-watchos',
        description:
          'Build watchOS apps with React Native, rendered as native SwiftUI.',
        excludeImports: true,
        removeDuplicateHeadings: true,
        includeOrder: [
          'intro.md',
          'getting-started/*',
          'renderer/*',
          'navigation/*',
          'watch-connectivity.md',
          'native/*',
          'dx/*',
          'expo-plugin.md',
          'architecture.md',
          'contributing.md',
        ],
        includeUnmatchedLast: true,
        pathTransformation: {
          ignorePaths: ['docs'],
        },
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: `${repoUrl}/edit/${editBranch}/docs/`,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'react-native-watchos',
      logo: {
        alt: 'react-native-watchos',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          href: repoUrl,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/' },
            { label: 'Installation', to: '/getting-started/installation' },
            { label: 'Architecture', to: '/architecture' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: repoUrl },
            { label: 'Issues', href: `${repoUrl}/issues` },
            {
              label: 'Discussions',
              href: `${repoUrl}/discussions`,
            },
          ],
        },
      ],
      copyright: `MIT © ${new Date().getFullYear()} Appsent.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['swift', 'objectivec', 'ruby', 'bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
