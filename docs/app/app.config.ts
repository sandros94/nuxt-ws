export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate',
    },
  },
  uiPro: {
    footer: {
      slots: {
        root: 'border-t border-(--ui-border)',
        left: 'text-sm text-(--ui-text-muted)',
      },
    },
  },
  seo: {
    siteName: 'Nuxt WebSocket - Docs',
  },
  header: {
    title: 'Nuxt WebSocket',
    to: '/',
    search: true,
    colorMode: true,
    links: [{
      'icon': 'i-simple-icons-github',
      'to': 'https://github.com/sandros94/nuxt-ws',
      'target': '_blank',
      'aria-label': 'GitHub',
    }],
  },
  footer: {
    credits: `Copyright © ${new Date().getFullYear()}`,
    colorMode: false,
    links: [
      {
        'icon': 'i-simple-icons-github',
        'to': 'https://github.com/sandros94/nuxt-ws',
        'target': '_blank',
        'aria-label': 'Nuxt WebSocket',
      }, {
        'icon': 'i-simple-icons-bluesky',
        'to': 'https://bsky.app/profile/sandros94.com',
        'target': '_blank',
        'aria-label': 'Sandros94 on BlueSky',
      },
    ],
  },
  toc: {
    title: 'Table of Contents',
    bottom: {
      title: 'Community',
      edit: 'https://github.com/sandros94/nuxt-ws/edit/main/docs/content',
      links: [
        {
          icon: 'i-lucide-star',
          label: 'Star on GitHub',
          to: 'https://github.com/sandros94/nuxt-ws',
          target: '_blank',
        },
      ],
    },
  },
})
