import pkg from '../package.json'

export default defineNuxtConfig({
  modules: [
    '../src/module',
    '@nuxt/image',
    '@nuxt/ui-pro',
    '@nuxt/content',
    'nuxt-og-image',
    '@nuxtjs/plausible',
    // 'nuxt-llms' // TODO: study module
  ],

  $development: {
    site: {
      url: 'http://localhost:3000',
    },
  },
  $production: {
    site: {
      url: 'https://nuxt-ws.s94.dev',
    },
  },

  devtools: {
    enabled: true,
  },

  app: {
    head: {
      link: [
        {
          rel: 'icon',
          href: '/favicon.svg',
          type: 'image/svg+xml',
        },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  content: {
    build: {
      markdown: {
        toc: {
          searchDepth: 1,
        },
      },
    },
  },

  runtimeConfig: {
    public: {
      version: pkg.version,
    },
  },

  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    buildCache: true,
  },

  compatibilityDate: '2024-07-11',

  nitro: {
    prerender: {
      routes: [
        '/',
      ],
      crawlLinks: true,
    },
  },

  icon: {
    clientBundle: {
      scan: true,
    },
    provider: 'iconify',
  },

  plausible: {
    apiHost: 'https://plausible.digitoolmedia.com',
  },

  ws: {
    route: '/_ws',
    topics: {
      internals: ['_internal', 'notifications'],
      defaults: ['session'],
    },
  },
})
