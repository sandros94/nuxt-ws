import type { PublicRuntimeConfig } from 'nuxt/schema'
import type { NitroApp } from 'nitropack/types'
import { consola } from 'consola'
import * as v from 'valibot'

interface Cursor {
  x: number
  y: number
  peerId: string
  avatar_url?: string
  login?: string
}

const logger = consola.create({}).withTag('WS')
const topicPageSchema = v.pipe(v.string(), v.trim(), v.nonEmpty(), v.startsWith('page:'))

function myPerformantWS() {
  let nitroApp: NitroApp
  let config: PublicRuntimeConfig['ws']

  function getConfig() {
    if (config) return config
    return config = useRuntimeConfig().public.ws as PublicRuntimeConfig['ws']
  }
  function getNitroApp() {
    if (nitroApp) return nitroApp
    return nitroApp = useNitroApp()
  }

  return defineWebSocketHandler({
    async open(peer) {
      const config = getConfig()
      const nitroHooks = getNitroApp().hooks

      // Automatically subscribe to internal and default topics
      config.topics!.internals!.forEach(topic => peer.subscribe(topic))
      config.topics!.defaults!.forEach(topic => peer.subscribe(topic))

      // Setup notification hooks
      nitroHooks.hook('ws:publish', (...messages) => {
        for (const { topic, payload } of messages) {
          if (!topic || !payload) continue
          peer.publish(topic, JSON.stringify({ topic, payload }), { compress: true })
        }
      })

      logger.log('New connection:', peer.id)
      // Update peer with data from storage
      peer.topics.forEach(async (topic) => {
        const payload = await useStorage('ws').getItem(topic)
        if (payload)
          peer.send(JSON.stringify({ topic, payload }), { compress: true })
      })

      // Send `_internal` communications
      peer.send(JSON.stringify({
        topic: '_internal',
        payload: {
          connectionId: peer.id,
        },
      }), { compress: true })

      // Update everyone's session metadata
      const payload = JSON.stringify({ topic: 'session', payload: { users: peer.peers.size } })
      peer.send(payload, { compress: true })
      peer.publish('session', payload, { compress: true })
    },

    async message(peer, message) {
      // Validate channel subscription/unsubscription or cursor update
      const validated = await wsSafeValidateMessage(
        v.union([
          topicSubUnsub(topicPageSchema),
          topicPublish(
            v.object({ x: v.number(), y: v.number() }),
            topicPageSchema,
          ),
        ]),
        message,
      )
      // If validation failed, fail silently
      if (validated.issues) return
      const parsedMessage = validated.value

      const storage = useStorage('ws')

      if (parsedMessage.type === 'subscribe') {
        peer.subscribe(parsedMessage.topic)
        const cursors = await storage.getItem<Cursor[]>(parsedMessage.topic) || []

        if (cursors)
          peer.send(JSON.stringify({
            topic: parsedMessage.topic,
            payload: cursors,
          }), { compress: true })

        return
      }
      else if (parsedMessage.type === 'unsubscribe') {
        peer.unsubscribe(parsedMessage.topic)
        const cursors = await storage.getItem<Cursor[]>(parsedMessage.topic)

        if (cursors) {
          // Remove this peer's cursor from the array
          const updatedCursors = cursors.filter(cursor => cursor.peerId !== peer.id)

          // Update storage and notify other peers
          await storage.setItem(parsedMessage.topic, updatedCursors)
          peer.publish(parsedMessage.topic, JSON.stringify({
            topic: parsedMessage.topic,
            payload: updatedCursors,
          }), { compress: true })
        }

        return
      }
      else if (parsedMessage.type === 'publish') {
        const cursors: Cursor[] = await storage.getItem<Cursor[]>(parsedMessage.topic) || []

        // Find and update existing cursor or add new one
        const cursorIndex = cursors.findIndex(cursor => cursor.peerId === peer.id)
        const updatedCursor: Cursor = {
          x: parsedMessage.payload.x,
          y: parsedMessage.payload.y,
          peerId: peer.id,
          // TODO: Add avatar_url and login
        }

        if (cursorIndex >= 0) {
          cursors[cursorIndex] = updatedCursor
        }
        else {
          cursors.push(updatedCursor)
        }

        await storage.setItem(parsedMessage.topic, cursors)
        peer.publish(parsedMessage.topic, JSON.stringify({
          topic: parsedMessage.topic,
          payload: cursors,
        }), { compress: true })
      }
    },

    async close(peer, details) {
      logger.log('Connection closed:', peer.id, details.code, details.reason)

      peer.publish(
        'session',
        JSON.stringify({ topic: 'session', payload: { users: peer.peers.size } }),
        { compress: true },
      )

      // Remove the user from all active cursors
      const storage = useStorage('ws')

      // Clean up cursor data from all topics this peer was subscribed to
      for (const topic of peer.topics) {
        if (topic.startsWith('page:')) {
          const cursors = await storage.getItem<Cursor[]>(topic)
          if (cursors) {
            const updatedCursors = cursors.filter(cursor => cursor.peerId !== peer.id)
            await storage.setItem(topic, updatedCursors)

            // Notify remaining peers
            peer.publish(topic, JSON.stringify({
              topic,
              payload: updatedCursors,
            }), { compress: true })
          }
        }
      }
    },

    error(peer, error) {
      logger.error('Peer', peer.id, 'connection error:', error)
    },
  })
}

export default myPerformantWS()
