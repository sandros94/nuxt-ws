export default defineNuxtConfig({
  modules: [
    '../src/module',
    '@sandros94/lab',
  ],
  imports: { autoImport: true },
  devtools: { enabled: true },
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2024-12-15',

  ws: {
    route: '/_ws',
    topics: {
      internals: ['_internal'],
      defaults: ['session'],
    },
  },
})
