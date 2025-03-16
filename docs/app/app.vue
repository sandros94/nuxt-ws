<script setup lang="ts">
import { withoutLeadingSlash } from 'ufo'
import { normalizeKey } from 'unstorage'
import {
  useParentElement,
  useElementSize,
  useMouse,
  watchThrottled,
} from '@vueuse/core'

const { seo } = useAppConfig()

const { data: navigation } = await useAsyncData('navigation', () => queryCollectionNavigation('docs'))
const { data: files } = useLazyAsyncData('search', () => queryCollectionSearchSections('docs'), {
  server: false,
})

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  link: [
    { rel: 'icon', href: '/favicon.svg' },
  ],
  htmlAttrs: {
    lang: 'en',
  },
})

useSeoMeta({
  titleTemplate: `%s - ${seo?.siteName}`,
  ogSiteName: seo?.siteName,
  twitterCard: 'summary_large_image',
})

provide('navigation', navigation)

const topics = computed(() => {
  const r = useRoute().path
  const _route = r !== '/'
    ? normalizeKey(withoutLeadingSlash(r))
    : 'index'

  return [`page:${_route}`]
})

type WSStates = {
  [key: string]: {
    x: number
    y: number
    peerId?: string
  }[]
} & {
  _internal: {
    connectionId: string
  }
  session: {
    users: number
  }
}

const states = useWSState<WSStates>(topics)

const el = useParentElement()
const { width, height } = useElementSize(el)

onMounted(() => {
  const { send } = useWS<WSStates>(topics)
  const { x, y, sourceType } = useMouse({ touch: false })

  watchThrottled([x, y], () => {
    if (sourceType.value === 'mouse') {
      send('publish', topics.value[0]!, {
        x: Math.round(x.value / width.value * 1000) / 1000,
        y: Math.round(y.value / height.value * 1000) / 1000,
      })
    }
  }, { throttle: 33 }) // 30fps
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <AppHeader />

    <UMain>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>

    <AppFooter />

    <ClientOnly>
      <LazyUContentSearch
        :files="files"
        :navigation="navigation"
      />
    </ClientOnly>

    <ClientOnly>
      <span
        v-for="c of states[topics[0]!]"
        :key="c.peerId"
        class="fixed z-50 group/cursor"
        :style="{
          left: `${c.x * width}px`,
          top: `${c.y * height}px`,
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.1s ease-out, top 0.1s ease-out',
        }"
      >
        <div v-if="c.peerId !== states['_internal'].connectionId" class="relative">
          <UIcon
            name="i-lucide-mouse-pointer-2"
          />
        </div>
      </span>

      <UBadge
        class="fixed bottom-4 right-4 rounded-full px-3 py-2"
        :icon=" states['session']?.users > 1 ? 'i-lucide-users' : 'i-lucide-user'"
        size="lg"
        color="primary"
        variant="outline"
      >
        {{ states['session']?.users || 0 }}
      </UBadge>
    </ClientOnly>
  </UApp>
</template>
