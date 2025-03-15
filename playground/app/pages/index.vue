<template>
  <div>
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
        <p>
          status: {{ status }}
          <span v-if="session">
            - users: {{ session.users }}
          </span>
        </p>
        <div v-if="channels.includes('chat')">
          <h3>
            Chat
          </h3>
          <div v-for="({ user, text }, key) in states['chat']" :key>
            {{ user }}: {{ text }}
          </div>
          <input v-model="message" :disabled="!channels.includes('chat')" @keyup.enter="sendMessage()">
        </div>
        <h3>Info</h3>
        <pre>
          <code v-if="_internal">
            {{ _internal }}
          </code>
          <code v-if="states['notifications']">
            {{ states['notifications'] }}
          </code>
        </pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const items = ['notifications', 'chat'] as const
const channels = ref<Array<typeof items[number]>>([])

const { states, status, send, open, close } = useWS<{
  notifications: {
    message: string
  }
  chat: {
    user?: string
    text: string
  }[]
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
function sendMessage() {
  if (
    !message.value
    || !_internal.value?.connectionId
    || status.value !== 'OPEN'
  ) return

  send('publish', 'chat', {
    text: message.value,
  })
  message.value = ''
}

function triggerNotification() {
  return $fetch('/api/ws/trigger')
}
</script>
