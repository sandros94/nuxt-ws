# Nuxt WebSocket

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A Nuxt module aimed to simplify the use of WebSockets.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/sandros94/lab?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

- `useWS` ([demo](https://reactive-ws.s94.dev/)): A WebSocket implementation with built-in shared state management, channel subscriptions, and type safety.
- `defineReactiveWSHandler`: wraps Nitro's `defineWebSocketHandler` to provide additional configuration, hooks and automatic topic subscription.

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add nuxt-ws
```

Ideally you should set your default path, based on where you will place your WebSocket api handlers:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-ws'],

  ws: {
    path: '/_ws', // default undefined
  }
})
```

## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  pnpm install
  
  # Generate type stubs
  pnpm run dev:prepare
  
  # Develop with the playground
  pnpm run dev
  
  # Build the playground
  pnpm run dev:build
  
  # Run ESLint
  pnpm run lint
  
  # Run Vitest
  pnpm run test
  pnpm run test:watch
  ```

</details>

## License

Published under the [MIT](/LICENSE) license.


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-ws/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-ws

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-ws.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/nuxt-ws

[license-src]: https://img.shields.io/npm/l/nuxt-ws.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-ws

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
