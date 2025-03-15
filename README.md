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

- `useWS` ([demo](https://reactive-ws.s94.dev/)): A WebSocket implementation with built-in shared state management, topic subscriptions, and type safety.
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

## Real-time Remote State Management

A WebSocket implementation with built-in shared state management, topic subscriptions, and type safety.

- 🔄 Automatic reconnection
- 📦 Built-in shared state management per-topic
- 🤖 Build-in validation with [Standard Schema](https://github.com/standard-schema/standard-schema)
- 🔐 Type-safe messages and topics
- 📢 Hooking system to trigger messages globaly
- ⛓️ Integrates easily with other Nuxt modules

Take in example the following setup:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-ws'],
  ws: {
    route: '/_ws',             // WebSocket endpoint to auto-connect
    topics: {
      defaults: ['session'],   // Auto-subscribed topics
    }
  }
})
```

Client-Side (`pages/chat.client.vue`):
```vue
<template>
  <div>
    <div v-if="status === 'OPEN'">
      Connected, Users: {{ states['session'].users }}
    </div>
    <div v-else>
      Disconnected
    </div>
    <div v-for="({ user, text }, key) in states['chat']" :key>
      {{ user }}: {{ text }}
    </div>
    <input v-model="textRef" @keyup.enter="sendMessage()">
  </div>
</template>

<script setup lang="ts">
const textRef = ref('')
const { states, status, send } = useWS<{
  chat: {
    user?: string
    text: string
  }[]
  session: {
    users: number
  }
}>(['chat'])

function sendMessage() {
  send('publish', 'chat', {
    text: textRef.value,
  })
  textRef.value = ''
}
</script>
```

Server-Side (`server/routes/_ws.ts`):
```ts
import * as v from 'valibot'

export default defineReactiveWSHandler({
  async open(peer) {
    // Update peer with 'chat' data from storage
    const chat = await useStorage('ws').getItem('chat')
    if (chat)
      peer.send(JSON.stringify({
        topic: 'chat',
        payload: chat,
      }), { compress: true })

    // Update everyone's session metadata
    const payload = JSON.stringify({ topic: 'session', payload: { users: peer.peers.size } })
    peer.send(payload, { compress: true })
    peer.publish('session', payload, { compress: true })
  },

  async message(peer, message) {
    // Validate the incoming chat message
    const parsedMessage = await wsValidateMessage( // built-in validation util
      v.object({
        type: v.literal('publish'),
        topic: v.literal('chat'),
        payload: v.object({ text: v.string() }),
      }),
      message,
    )

    // Update chat data in storage
    const mem = useStorage('ws')
    const { topic, payload } = parsedMessage
    const _chat = await mem.getItem<Array<{ user: string, text: string }>>('chat') || []
    const newChat = [..._chat, { ...payload, user: peer.id }]
    await mem.setItem(topic, newChat)

    // Broadcast the new chat message to everyone
    peer.send(JSON.stringify({ topic, payload: newChat }), { compress: true })
    peer.publish(topic, JSON.stringify({ topic, payload: newChat }), { compress: true })
  },

  close(peer) {
    // Update everyone's session metadata
    peer.publish(
      'session',
      JSON.stringify({
        topic: 'session',
        payload: {
          users: peer.peers.size,
        },
      }),
      { compress: true },
    )
  },
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
