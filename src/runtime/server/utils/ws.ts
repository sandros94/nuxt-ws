import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { NitroApp } from 'nitropack/types'
import { type Options, destr } from 'destr'
import type { Message } from 'crossws'

import type { WSHandlerHooks } from '../../types'
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
export function defineWSHandler(hooks: Partial<WSHandlerHooks>) {
  let nitroApp: NitroApp
  let config: _WSRuntimeConfig

  function getConfig() {
    if (config) return config
    return config = useRuntimeConfig().public.ws as _WSRuntimeConfig
  }
  function getNitroApp() {
    if (nitroApp) return nitroApp
    return nitroApp = useNitroApp()
  }

  return defineWebSocketHandler({
    upgrade: req => hooks.upgrade?.(req, config),

    async open(peer) {
      const config = getConfig()
      const nitroHooks = getNitroApp().hooks

      // Automatically subscribe to internal and default topics
      config.topics.internals.forEach(topic => peer.subscribe(topic))
      config.topics.defaults.forEach(topic => peer.subscribe(topic))

      // Setup notification hooks
      nitroHooks.hook('ws:publish', (...messages) => {
        for (const { topic, payload } of messages) {
          if (!topic || !payload) continue
          peer.publish(topic, JSON.stringify({ topic, payload }), { compress: true })
        }
      })

      return hooks.open?.(peer, config)
    },

    message(peer, message) {
      const config = getConfig()
      const m = wsParseMessage(message.text())
      if (m?.topic && config.topics.internals.includes(m.topic)) return
      if (m?.type === 'subscribe' && m?.topic && !config.topics.defaults.includes(m.topic))
        peer.subscribe(m.topic)
      if (m?.type === 'unsubscribe' && m?.topic)
        peer.unsubscribe(m.topic)

      return hooks.message?.(peer, message, config)
    },

    async close(peer, details) {
      const config = getConfig()

      return hooks.close?.(peer, details, config)
    },

    error: (peer, error) => hooks.error?.(peer, error, config),
  })
}

/**
 * Parses a WebSocket message into an object of type T or fallback to the original string.
 *
 * @template T - The type to parse the message into. Defaults to 'any'.
 * @param {Message | string} message - The WebSocket message to parse. Can be a string or a Message object.
 * @param {Options} [options] - Optional configuration for parsing: { strict?: boolean }
 * @returns {T | string} The parsed message as an object of type T, or the original string if parsing fails.
 *
 * @remarks
 * This function uses `destr` to safely parse the message. If the message is a string, it's passed directly to `destr`.
 * If it's a Message object, the function calls `message.text()` to get the string content.
 * If parsing fails, `destr` will return the original string value.
 */
export function wsParseMessage<T = any>(message: Message | string, options?: Options): T | string {
  return destr<T>(
    typeof message === 'string'
      ? message
      : message.text(),
    options,
  )
}

/**
 * Validates a WebSocket message against a given schema.
 * If the message is invalid, the function throws an error with the validation issues.
 * Otherwise, it returns the validated message.
 * If the message is a Message object, it's parsed with `wsParseMessage` before validation.
 *
 * @template T - The schema to validate the message against.
 * @param {T} schema - The schema to validate the message against.
 * @param {Message | StandardSchemaV1.InferInput<T>} message - The WebSocket message to validate.
 * @returns {Promise<StandardSchemaV1.InferOutput<T>>} The validated message.
 * @throws {Error} If the message is invalid, the function throws an error with the validation issues.
 *
 * @example
 * import * as v from 'valibot'
 *
 * message(peer, message) {
 *   const parsedMessage = await wsValidateMessage(
 *     v.object({
 *       type: v.picklist(['subscribe', 'unsubscribe']),
 *       topic: v.string(),
 *     }),
 *     message,
 *   )
 * }
 * @example
 * import { z } from 'zod'
 *
 * message(peer, message) {
 *   const parsedMessage = await wsValidateMessage(
 *     z.object({
 *       type: z.enum(['subscribe', 'unsubscribe']),
 *       topic: z.string(),
 *     }),
 *     message,
 *   )
 * }
 */
export async function wsValidateMessage<
  T extends StandardSchemaV1,
>(schema: T, message: Message | StandardSchemaV1.InferInput<T>): Promise<StandardSchemaV1.InferOutput<T>> {
  let result: StandardSchemaV1.Result<unknown> | Promise<StandardSchemaV1.Result<unknown>>
  if (message && typeof message === 'object' && 'text' in message && typeof message.text === 'function')
    result = schema['~standard'].validate(wsParseMessage(message))
  else
    result = schema['~standard'].validate(message)

  if (result instanceof Promise) result = await result

  if (result.issues) {
    throw new Error('WebSocket:' + JSON.stringify(result.issues, null, 2))
  }

  return result.value
}

/**
 * Safely validates a WebSocket message against a given schema.
 * It returns both the validated message and the validation issues, if any.
 * If the message is a Message object, it's parsed with `wsParseMessage` before validation.
 *
 * @template T - The schema to validate the message against.
 * @param {T} schema - The schema to validate the message against.
 * @param {Message | StandardSchemaV1.InferInput<T>} message - The WebSocket message to validate.
 * @returns {Promise<{ value: StandardSchemaV1.InferOutput<T>, issues?: StandardSchemaV1.Issue[] }>} The validated message and the validation issues, if any.
 *
 * @example
 * import * as v from 'valibot'
 *
 * message(peer, message) {
 *   const parsedMessage = await wsSafeValidateMessage(
 *     v.object({
 *       type: v.picklist(['subscribe', 'unsubscribe']),
 *       topic: v.string(),
 *     }),
 *     message,
 *   )
 *
 *   if (parsedMessage.issues) {
 *     console.error('WebSocket:', parsedMessage.issues)
 *     return
 *   }
 *   // else do something with parsedMessage.value
 * }
 * @example
 * import { z } from 'zod'
 *
 * message(peer, message) {
 *   const parsedMessage = await wsSafeValidateMessage(
 *     z.object({
 *       type: z.enum(['subscribe', 'unsubscribe']),
 *       topic: z.string(),
 *     }),
 *     message,
 *   )
 *
 *   if (parsedMessage.issues) {
 *     console.error('WebSocket:', parsedMessage.issues)
 *     return
 *   }
 *   // else do something with parsedMessage.value
 * }
 */
export async function wsSafeValidateMessage<
  T extends StandardSchemaV1,
>(
  schema: T,
  message: Message | StandardSchemaV1.InferInput<T>,
): Promise<StandardSchemaV1.Result<StandardSchemaV1.InferOutput<T>>> {
  let result: StandardSchemaV1.Result<unknown> | Promise<StandardSchemaV1.Result<unknown>>
  if (message && typeof message === 'object' && 'text' in message && typeof message.text === 'function')
    result = schema['~standard'].validate(wsParseMessage(message))
  else
    result = schema['~standard'].validate(message)

  if (result instanceof Promise) result = await result

  return result
}
