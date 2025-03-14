<template>
  <div>
    <NuxtLink to="/">
      Home
    </NuxtLink>
    <div :style="{ marginTop: '1rem' }">
      <div>
        <div>
          <button
            v-if="status === 'CLOSED'"
            @click.prevent="open()"
          >
            Reconnect
          </button>
          <button @click="triggerNotification()">
            Trigger notification
          </button>
        </div>
        <div>
          Send chat message:
          <input v-model="message">
          <button
            @click.prevent="sendData"
          >
            Send
          </button>
        </div>
        <div>
          <p>Status: {{ status }}</p>
          <p>Updates</p>
          <pre>
            <code v-if="chat">
              {{ chat }}
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
            <br>
          </pre>
          <ul>
            <li v-for="(item, index) of history" :key="index">
              <code>{{ item }}</code><br>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { states, data, status, send, open } = useWS<{
  notifications: {
    message: string
  }
  chat: {
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
}>(['notifications', 'chat'])

const {
  chat,
  session,
  _internal,
} = states

const history = ref<string[]>([])
watch(data, (newValue) => {
  history.value.push(`server: ${newValue}`)
})

const message = ref<string>('')
function sendData() {
  if (
    !message.value
    || !_internal.value?.connectionId
    || status.value !== 'OPEN'
  ) return
  chat.value = {
    ...(chat.value || {}),
    [_internal.value.connectionId]: message.value,
  }

  history.value.push(`client: ${JSON.stringify({ topic: 'chat', data: chat.value })}`)
  send('publish', 'chat', chat.value)
  message.value = ''
}

function triggerNotification() {
  return $fetch('/api/ws/trigger')
}
</script>
