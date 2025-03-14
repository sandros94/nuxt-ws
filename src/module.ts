import {
  defineNuxtModule,
  addImports,
  addServerImports,
  addTypeTemplate,
  createResolver,
} from '@nuxt/kit'
import { defu } from 'defu'

import type { WSHooks } from './runtime/types'

interface ModuleOptions {
  route?: string
  topics?: {
    defaults?: Array<string>
    internals?: Array<string>
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-ws',
    configKey: 'ws',
  },
  defaults: {
    topics: {
      defaults: [],
      internals: [],
    },
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    nuxt.options.nitro.experimental ||= {}
    nuxt.options.nitro.experimental.websocket = true

    nuxt.options.alias['#ws'] = resolve('./runtime')

    nuxt.options.runtimeConfig.public.ws = defu<ModuleOptions, [ModuleOptions]>(
      nuxt.options.runtimeConfig.public.ws,
      options,
    )

    addImports([
      {
        name: 'useWSState',
        from: resolve('./runtime/app/composables/ws'),
      },
      {
        name: 'useWS',
        from: resolve('./runtime/app/composables/ws'),
      },
    ])
    addServerImports([
      {
        name: 'wsBroadcast',
        from: resolve('./runtime/server/utils/ws'),
      },
      {
        name: 'wsParseMessage',
        from: resolve('./runtime/server/utils/ws'),
      },
      {
        name: 'wsValidateMessage',
        from: resolve('./runtime/server/utils/ws'),
      },
      {
        name: 'wsSafeValidateMessage',
        from: resolve('./runtime/server/utils/ws'),
      },
      {
        name: 'defineReactiveWSHandler',
        from: resolve('./runtime/server/utils/ws'),
      },
    ])
    addTypeTemplate({
      filename: 'types/ws.d.ts',
      getContents: () => `
import type { PublicRuntimeConfig } from 'nuxt/schema'

type _WSRuntimeConfig = Required<PublicRuntimeConfig['ws']>
export type InternalTopics = Required<_WSRuntimeConfig['topics']>['internals'][number]
export type DefaultTopics = Required<_WSRuntimeConfig['topics']>['defaults'][number]
export type AllTopics = DefaultTopics | InternalTopics
export interface WSRuntimeConfig {
  route: _WSRuntimeConfig['route']
  topics: {
    defaults: DefaultTopics[]
    internals: InternalTopics[]
  }
}
`,
    }, { nitro: true, nuxt: true })
  },
})

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    ws: ModuleOptions
  }
}

declare module 'nitropack' {
  interface NitroRuntimeHooks extends WSHooks {}
}
