import * as v from 'valibot'

export default defineReactiveWSHandler({
  async open(peer) {
    // Update peer with data from storage
    peer.topics.forEach(async (topic) => {
      const payload = await useMem('ws').getItem(topic)
      if (payload)
        peer.send(JSON.stringify({ topic, payload }), { compress: true })
    })

    // Send `_internal` communications
    const activeChannels = Array.from(peer['_topics'])
    peer.send(JSON.stringify({
      topic: '_internal',
      payload: {
        connectionId: peer.id,
        topics: activeChannels,
        message: activeChannels.length
          ? `Subscribed to ${activeChannels.length} topics`
          : 'Not subscribed to any topic',
      },
    }), { compress: true })

    // Update everyone's session metadata
    const payload = JSON.stringify({ topic: 'session', payload: { users: peer.peers.size } })
    peer.send(payload, { compress: true })
    peer.publish('session', payload, { compress: true })
  },

  async message(peer, message) {
    // Validate the incoming message
    const parsedMessage = await wsValidateMessage(
      v.union([
        v.object({
          type: v.picklist(['subscribe', 'unsubscribe']),
          topic: v.string(),
        }),
        v.object({
          type: v.literal('publish'),
          topic: v.string(),
          payload: v.any(),
        }),
      ]),
      message,
    )
    const mem = useMem('ws')

    if (parsedMessage.type === 'publish') {
      const { topic, payload } = parsedMessage

      // Update data from the storage (or init it)
      const _data = await mem.getItem<Record<string, string>>(topic) || {}
      const newData = { ..._data, ...payload }
      await mem.setItem(topic, newData)

      // Update everyone else with the new payload
      peer.send(JSON.stringify({ topic, payload: newData }), { compress: true })
      peer.publish(topic, JSON.stringify({ topic, payload: newData }), { compress: true })
    }
    else {
      const { type, topic } = parsedMessage
      if (type === 'subscribe') {
        peer.subscribe(topic)
        const payload = await mem.getItem(topic)
        if (payload)
          peer.send(JSON.stringify({ topic, payload }), { compress: true })
      }
      else {
        peer.unsubscribe(topic)
      }
    }
  },

  close(peer) {
    peer.publish(
      'session',
      JSON.stringify({
        topic: 'session',
        payload: {
          users: peer.peers.size,
        },
      }),
      { compress: true },
    )
  },
})
