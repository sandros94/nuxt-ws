<template>
  <div>
    <NuxtLink to="/">
      Home
    </NuxtLink>
    <div :style="{ marginTop: '1rem' }">
      <div>
        <div>
          Channels:
          <div class="state-selector">
            <div v-for="state in items" :key="state">
              <input
                :id="state"
                v-model="channels"
                type="checkbox"
                :value="state"
              >
              <label :for="state">{{ state.charAt(0).toUpperCase() + state.slice(1) }}</label>
            </div>
          </div>
          <button @click="triggerNotification()">
            Trigger notification
          </button>
          <button
            v-if="status === 'CLOSED'"
            @click.prevent="open()"
          >
            Reconnect
          </button>
          <button
            v-else-if="status === 'OPEN'"
            @click.prevent="close()"
          >
            Close
          </button>
        </div>
        <div>
          Send chat message:
          <input v-model="message" :disabled="!channels.includes('chat')">
          <button
            :disabled="!channels.includes('chat')"
            @click.prevent="sendData"
          >
            Send
          </button>
        </div>
        <div>
          <p>Status: {{ status }}</p>
          <p>Updates</p>
          <pre>
            <code v-if="states['chat']">
              {{ states['chat'] }}
            </code>
            <br>
            <code v-if="states['notifications']">
              {{ states['notifications'] }}
            </code>
            <br>
            <code v-if="session">
              {{ session }}
            </code>
            <br>
            <code v-if="_internal">
              {{ _internal }}
            </code>
          </pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const items = ['notifications', 'chat'] as const
const channels = ref<Array<typeof items[number]>>([])

const { states, status, send, open, close } = useWS<{
  notifications?: {
    message: string
  }
  chat?: {
    [key: string]: string
  }
  session: {
    users: number
  }
  _internal: {
    connectionId: string
    topics: string[]
    message?: string
  }
}>(channels)

const {
  session,
  _internal,
} = toRefs(states)

const message = ref<string>('')
function sendData() {
  if (
    !message.value
    || !_internal.value?.connectionId
    || status.value !== 'OPEN'
  ) return

  send('publish', 'chat', {
    [_internal.value.connectionId]: message.value,
  })
  message.value = ''
}

function triggerNotification() {
  return $fetch('/api/ws/trigger')
}
</script>
