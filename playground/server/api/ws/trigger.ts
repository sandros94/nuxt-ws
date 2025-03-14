import { randomUUID } from 'uncrypto'

export default defineEventHandler(() => {
  // The `ws:publish` hook is a special hook that can be used
  // to send messages to any topic. Use with caution.
  useNitroApp().hooks.callHook('ws:publish', {
    topic: 'notifications',
    payload: {
      message: 'WS is up and running',
      id: randomUUID(),
    },
  })
})
