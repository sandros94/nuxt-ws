import type { UseWebSocketOptions, UseWebSocketReturn } from '@vueuse/core'
import type { Peer, Message, WSError } from 'crossws'
import type { Ref, Reactive } from 'vue'

// TODO: check nitro build types
import type { AllTopics } from '#build/types/ws'

export type MaybePromise<T> = T | Promise<T>

export type { Peer, Message, WSError }
export type UpgradeRequest = Request | {
  url: string
  headers: Headers
}

export interface WSOptions extends UseWebSocketOptions {
  route?: string
  query?: Record<string, any>
}

export interface WSMessage<
  T extends Record<string | AllTopics, any> = Record<string | AllTopics, any>,
> {
  topic: keyof T
  payload: T[keyof T]
}

export type WSStates<T extends Record<string | AllTopics, any>> = Reactive<T>

export interface UseWSReturn<T extends Record<string | AllTopics, any>, D> extends Omit<UseWebSocketReturn<D>, 'send'> {
  /**
   * Upstream, mainly for internal use.
   */
  _data: Ref<D | null>
  states: WSStates<T>
  send<
    Payload extends (string | ArrayBuffer | Blob),
  >(payload: Payload): boolean
  send<
    Type extends 'subscribe' | 'unsubscribe',
    Topic extends keyof Required<T>,
  >(type: Type, topic: Topic): boolean
  send<
    Type extends 'publish',
    Topic extends keyof Required<T>,
    Payload extends Required<T>[Topic] extends Array<infer U> ? U : Required<T>[Topic],
  >(type: Type, topic: Topic, payload: Payload): boolean
  /**
   * Upstream, mainly for internal use.
   */
  _send: UseWebSocketReturn<D>['send']
}

interface _WSRuntimeConfig {
  route?: string
  topics: {
    defaults: string[]
    internals: string[]
  }
}

export interface WSHandlerHooks {
  /** Upgrading */
  /**
   *
   * @param request
   * @throws {Response}
   */
  upgrade: (request: UpgradeRequest & {
    context: Peer['context']
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  }, config: _WSRuntimeConfig) => MaybePromise<Response | ResponseInit | void>

  /** A socket is opened */
  open: (peer: Peer, config: _WSRuntimeConfig) => MaybePromise<void>

  /** A message is received */
  message: (peer: Peer, message: Message, config: _WSRuntimeConfig) => MaybePromise<void>

  /** A socket is closed */
  close: (peer: Peer, details: {
    code?: number
    reason?: string
  }, config: _WSRuntimeConfig) => MaybePromise<void>

  /** An error occurs */
  error: (peer: Peer, error: WSError, config: _WSRuntimeConfig) => MaybePromise<void>
}

export interface WSHooks {
  'ws:publish': (...messages: { topic: string | AllTopics, payload: unknown }[]) => MaybePromise<void>
}
