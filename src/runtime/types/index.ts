import type { UseWebSocketOptions, UseWebSocketReturn } from '@vueuse/core'
import type { Peer, Hooks, Message } from 'crossws'
import type { ToRefs } from 'vue'

import type { AllTopics, WSRuntimeConfig } from '#build/types/ws'

export type MaybePromise<T> = T | Promise<T>

export type { Peer, Hooks, Message }

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

export type WSStates<T extends Record<string | AllTopics, any>> = ToRefs<T>

export interface UseWSReturn<T extends Record<string | AllTopics, any>, D> extends Omit<UseWebSocketReturn<D>, 'send'> {
  states: WSStates<T>
  send<M extends (string | ArrayBuffer | Blob | object)>(payload: M): boolean
  send<M extends { type: 'subscribe' | 'unsubscribe', topic: keyof T }>(type: M['type'], topic: M['topic']): boolean
  send<M extends { type: 'publish', topic: keyof T, payload: T[keyof T] }>(type: 'publish', topic: M['topic'], payload: M['payload']): boolean
  _send: UseWebSocketReturn<D>['send']
}

export interface WSHandlerHooks extends Partial<Omit<Hooks, 'open' | 'close' | 'message'>> {
  /** A socket is opened */
  open: (peer: Peer, config: { config: WSRuntimeConfig }) => MaybePromise<void>

  /** A message is received */
  message: (peer: Peer, message: Message, config: { config: WSRuntimeConfig }) => MaybePromise<void>

  /** A socket is closed */
  close: (peer: Peer, details: {
    code?: number
    reason?: string
  }, config: { config: WSRuntimeConfig }) => MaybePromise<void>

  // TODO: add other hooks
}

export interface WSHooks {
  'ws:publish': (...messages: { topic: string | AllTopics, payload: unknown }[]) => MaybePromise<void>
}
