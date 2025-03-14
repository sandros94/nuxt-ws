import { destr } from 'destr'

import type {
  Peer,
  WSHandlerHooks,
} from '../../types'
import { defineWebSocketHandler, useNitroApp, useRuntimeConfig } from '#imports'

interface _WSRuntimeConfig {
  route: string
  topics: {
    defaults: string[]
    internals: string[]
  }
}

/**
 * Define a custom WebSocket event handler.
 * This implementation also includes automatic subscription to internal and default topics.
 *
 * @see — https://h3.unjs.io/guide/websocket
 */
export function defineReactiveWSHandler(hooks: Partial<WSHandlerHooks>) {
  let config: _WSRuntimeConfig

  const getConfig = () => {
    if (config) return config
    return config = useRuntimeConfig().public.ws as _WSRuntimeConfig
  }

  // TODO: get runtimeConfig topics and merge them with defaultChannels

  return defineWebSocketHandler({
    upgrade: req => hooks.upgrade?.(req),

    async open(peer) {
      const config = getConfig()
      const nitroHooks = useNitroApp().hooks

      // Automatically subscribe to internal and default topics
      config.topics.internals.forEach(topic => peer.subscribe(topic))
      config.topics.defaults.forEach(topic => peer.subscribe(topic))

      // Setup notification hooks
      nitroHooks.hook('ws:publish', (...messages) => {
        for (const { topic, payload } of messages) {
          if (!topic || !payload) continue
          wsBroadcast(
            peer,
            topic,
            JSON.stringify({
              topic,
              payload,
            }),
            { compress: true },
          )
        }
      })
      nitroHooks.hook('ws:publish:internal', (...messages) => {
        for (const { topic, payload } of messages) {
          if (!topic || !payload || !config.topics.internals.includes(topic)) continue
          wsBroadcast(
            peer,
            topic,
            JSON.stringify({
              topic,
              payload,
            }),
            { compress: true },
          )
        }
      })

      return hooks.open?.(peer, { config })
    },

    message(peer, message) {
      const config = getConfig()
      const m = destr<any>(message.text())
      if (m?.topic && config.topics.internals.includes(m.topic)) return
      if (m?.type === 'subscribe' && m?.topic && !config.topics.defaults.includes(m.topic))
        peer.subscribe(m.topic)
      if (m?.type === 'unsubscribe' && m?.topic)
        peer.unsubscribe(m.topic)

      return hooks.message?.(peer, message, { config })
    },

    async close(peer, details) {
      const config = getConfig()

      return hooks.close?.(peer, details, { config })
    },

    error: (peer, error) => hooks.error?.(peer, error),
  })
}

/**
 * Broadcasts a message to peers subscribed to a specific topic only once.
 *
 * @param {Peer} peer - WebSocket peer instance
 * @param {string} topic - Topic to broadcast to
 * @param {any} message - Message to broadcast
 * @param {object} [options] - Broadcast options
 * @param {boolean} [options.compress] - Whether to compress the message
 */
export function wsBroadcast( // TODO: is it still needed?
  peer: Peer,
  topic: string,
  message: any,
  options?: {
    compress?: boolean
  },
) {
  let firstPeer: Peer | null = null

  for (const _peer of peer.peers) {
    if (_peer['_topics'].has(topic)) {
      firstPeer = _peer
      break
    }
  }

  if (firstPeer?.id === peer.id) {
    firstPeer.send(message, options)
    firstPeer.publish(topic, message, options)
  }
}
