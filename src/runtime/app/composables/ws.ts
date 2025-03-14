import { useWebSocket } from '@vueuse/core'
import { destr } from 'destr'
import {
  joinURL,
  withProtocol,
  withQuery,
} from 'ufo'

import {
  computed,
  reactive,
  toRefs,
  watch,
  useState,
  useRequestURL,
  useRuntimeConfig,
} from '#imports'
import { merge } from '#ws/utils'
import type {
  WSStates,
  WSMessage,
  WSOptions,
  UseWSReturn,
} from '#ws/types'
import type { AllTopics, WSRuntimeConfig } from '#build/types/ws'

const wsStateKey = '$ws:state'

function wsState<
  T extends Record<string | AllTopics, any>,
>(topics?: Array<keyof T | string>) {
  const { defaults, internals } = useRuntimeConfig().public.ws.topics as WSRuntimeConfig['topics']

  const mergedTopics = computed(
    () => merge(internals, [...defaults, ...topics || []]) as (string | AllTopics)[],
  )
  const states = useState<T>(wsStateKey,
    () => mergedTopics.value.reduce((acc, topic) => ({
      ...acc,
      [topic]: undefined,
    }), {} as T),
  )
  return states
}

/**
 * Create multiple global reactive refs that will be hydrated but not shared across ssr requests
 * Each state is based on the available topics defined in the runtime configuration or via `useWS`
 *
 * @template T - Type of the topic payload mapping
 * @param {Array<keyof T | string>} [topics] - Array of topic names to subscribe to
 *
 * @returns {MultiState<T>} Reactive state object for the topics
 */
export function useWSState<
  T extends Record<string | AllTopics, any>,
>(topics: Array<keyof T | string> = []): WSStates<T> {
  const states = wsState(topics)
  return toRefs<T>(states.value)
}

export function useWS<
  T extends Record<string | AllTopics, any>,
  D = any,
>(
  topics: Array<keyof T | string> = [],
  options?: WSOptions,
): UseWSReturn<T, D> {
  const { route, topics: defTopics } = useRuntimeConfig().public.ws as WSRuntimeConfig
  const { query, route: optsRoute, ...opts } = options || {}
  const path = optsRoute || route

  if (!path) {
    throw new Error('[useWS] `route` is required in options or `nuxt.config.ts`')
  }

  const states = wsState<T>(topics)

  const _query = reactive({
    ...query,
  })
  const reqUrl = useRequestURL()
  const origin = joinURL(reqUrl.origin, path)
  const url = computed(() => {
    return withQuery(
      reqUrl.protocol === 'https:'
        ? withProtocol(origin, 'wss://')
        : withProtocol(origin, 'ws://'),
      _query,
    )
  })

  const {
    status,
    data,
    send: _send,
    open,
    close,
    ws,
  } = useWebSocket(url, {
    ...opts,
    onMessage(_, message) {
      const parsed = destr<WSMessage<T>>(message.data)
      if (!!parsed && typeof parsed === 'object' && 'topic' in parsed && 'payload' in parsed) {
        states.value[parsed.topic] = parsed.payload as T[keyof T]
      }

      opts?.onMessage?.(_, message)
    },
    autoConnect: false,
  })

  /**
   * Sends raw message data through the WebSocket connection.
   * Messages are buffered if connection is not yet established.
   *
   * @template M - Type extending string | ArrayBuffer | Blob | object
   * @param {M} payload - Raw message to send
   * @returns {boolean} Success status of the send operation
   *
   * @example
   * send("Hello World")
   * send(new Blob(['Hello']))
   * send({ type: "message", content: "Hello" })
   */
  function send<M extends (string | ArrayBuffer | Blob | object)>(payload: M): boolean
  /**
   * Sends a subscription or unsubscription message to a specific WebSocket topic.
   *
   * @template M - Type extending WSMessage<T>
   * @param {'subscribe' | 'unsubscribe'} type - Type of the operation
   * @param {M['topic']} topic - Target topic name
   * @returns {boolean} Success status of the send operation
   *
   * @example
   * send("subscribe", "notifications")
   * send("unsubscribe", "chat")
   */
  function send<M extends { type: 'subscribe' | 'unsubscribe', topic: keyof T }>(type: M['type'], topic: M['topic']): boolean
  /**
   * Sends a payload to a specific WebSocket topic.
   * Messages are buffered if connection is not yet established.
   *
   * @template M - Type extending WSMessage<T>
   * @param {'publish'} type - Type of the operation
   * @param {M['topic']} topic - Target topic name
   * @param {M['payload']} payload - Data to send to the topic
   * @returns {boolean} Success status of the send operation
   *
   * @example
   * send("publish", "notifications", { message: "Hello" })
   * send("publish", "chat", { message: "Hello" })
   */
  function send<M extends { type: 'publish', topic: keyof T, payload: T[keyof T] }>(type: M['type'], topic: M['topic'], payload: M['payload']): boolean
  function send<
    M extends (
      | { type: 'subscribe' | 'unsubscribe', topic: keyof T, payload: never }
      | { type: 'publish', topic: keyof T, payload: T[keyof T] }
    ),
  >(...args: any): boolean {
    if (args.length === 1) {
      const payload = args[0]
      if (typeof payload === 'object' && !(payload instanceof Blob) && !(payload instanceof ArrayBuffer))
        return _send(JSON.stringify(payload), true)
      return _send(payload)
    }

    const [type, topic, payload] = args as [M['type'], M['topic'], M['payload']]
    if (defTopics.internals.includes(String(topic))) return false

    return _send(JSON.stringify({ type, topic, payload }), true)
  }

  if (opts?.autoConnect !== false)
    watch(url, () => {
      close()
      setTimeout(() => open(), 100)
    })

  topics.forEach((topic) => {
    send('subscribe', topic)
  })

  return {
    states: toRefs<T>(states.value),
    data,
    status,
    send,
    _send,
    open,
    close,
    ws,
  }
}
