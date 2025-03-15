import { useWebSocket } from '@vueuse/core'
import { destr } from 'destr'
import {
  joinURL,
  withProtocol,
  withQuery,
} from 'ufo'

import {
  type Ref,
  type MaybeRef,
  ref,
  reactive,
  computed,
  isRef,
  toRef,
  watch,
  onBeforeUnmount,
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
>(topics: MaybeRef<Array<keyof T | string>> = []): WSStates<T> {
  const { defaults, internals } = useRuntimeConfig().public.ws.topics as WSRuntimeConfig['topics']
  const topicsRef = toRef(topics)

  const mergedTopics = computed(
    () => merge(internals, [...defaults, ...topicsRef.value]) as (string | AllTopics)[],
  )
  const states = useState<T>(wsStateKey, () => ({}) as T)

  watch(mergedTopics, (newTopics) => {
    const keys = Object.keys(states.value)
    const newKeys = newTopics.filter(topic => !keys.includes(String(topic)))

    newKeys.forEach((topic) => {
      states.value[topic as keyof T] = undefined as any
    })
  }, { immediate: true })
  return reactive(states.value)
}

export function useWS<
  T extends Record<string | AllTopics, any>,
  D = any,
>(
  topics: MaybeRef<Array<keyof T | string>> = [],
  options?: WSOptions,
): UseWSReturn<T, D> {
  const { route, topics: defTopics } = useRuntimeConfig().public.ws as WSRuntimeConfig
  const { query, route: optsRoute, ...opts } = options || {}
  const path = optsRoute || route

  if (!path) {
    throw new Error('[useWS] `route` is required in options or `nuxt.config.ts`')
  }

  const topicsRef = isRef(topics) ? topics : ref(topics) as Ref<Array<keyof T | string>>
  const states = useWSState<T>(topics)
  const data: Ref<D | null> = ref(null)

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
    data: _data,
    send: _send,
    open,
    close,
    ws,
  } = useWebSocket<D>(url, {
    ...opts,
    onMessage(_, message) {
      const parsed = destr<WSMessage<T>>(message.data)
      if (!!parsed && typeof parsed === 'object' && 'topic' in parsed && 'payload' in parsed) {
        states[String(parsed.topic)] = parsed.payload as T[keyof T]
      }
      else {
        data.value = message.data
      }

      opts?.onMessage?.(_, message)
    },
    autoConnect: false,
  })

  /**
   * Sends raw message data through the WebSocket connection.
   * Messages are buffered if connection is not yet established.
   *
   * @template Payload - Type extending string | ArrayBuffer | Blob
   * @param {Payload} payload - Payload to send
   * @returns {boolean} Success status of the send operation
   *
   * @example
   * send("Hello World")
   * send(new ArrayBuffer(8))
   * send(new Blob(['Hello']))
   */
  function send<Payload extends (string | ArrayBuffer | Blob)>(payload: Payload): boolean
  /**
   * Sends a subscription or unsubscription message to a specific WebSocket topic.
   *
   * @template Type - Type extending 'subscribe' | 'unsubscribe'
   * @template Topic - Type extending keyof T
   * @param {'subscribe' | 'unsubscribe'} type - Type of the operation
   * @param {Topic} topic - Target topic name
   * @returns {boolean} Success status of the send operation
   *
   * @example
   * send("subscribe", "notifications")
   * send("unsubscribe", "chat")
   */
  function send<
    Type extends 'subscribe' | 'unsubscribe',
    Topic extends keyof T,
  >(type: Type, topic: Topic): boolean
  /**
   * Sends a payload to a specific WebSocket topic.
   * Messages are buffered if connection is not yet established.
   *
   * @template Type - Type extending 'publish'
   * @template Topic - Type extending keyof T
   * @template Payload - Type extending T[Topic] extends Array<infer U> ? U : T[Topic]
   * @param {'publish'} type - Type of the operation
   * @param {Topic} topic - Target topic name
   * @param {Payload} payload - Payload to send
   * @returns {boolean} Success status of the send operation
   *
   * @example
   * send("publish", "notifications", { message: "Hello" })
   * send("publish", "chat", { text: "Hello" })
   */
  function send<
    Type extends 'publish',
    Topic extends keyof T,
    Payload extends T[Topic] extends Array<infer U> ? U : T[Topic],
  >(type: Type, topic: Topic, payload: Payload): boolean
  function send<
    M extends (
      | { type: 'subscribe' | 'unsubscribe', topic: keyof T, payload: never }
      | { type: 'publish', topic: keyof T, payload: T[keyof T] }
    ),
  >(...args: any): boolean {
    if (args.length === 1) {
      const payload = args[0]
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

  const stopWatchTopics = watch(topicsRef, (newTopics, oldTopics) => {
    // get the difference between the new and old topics, subscribe/unsubscribe accordingly
    const added = newTopics.filter(topic => !oldTopics?.includes(topic))
    const removed = oldTopics?.filter(topic => !newTopics.includes(topic)) || []

    added.forEach((topic) => {
      send('subscribe', topic)
    })
    removed.forEach((topic) => {
      send('unsubscribe', topic)
    })
  }, { immediate: true })

  onBeforeUnmount(() => {
    stopWatchTopics()
    close()
  })

  return {
    states,
    data,
    _data,
    status,
    send,
    _send,
    open,
    close,
    ws,
  }
}
