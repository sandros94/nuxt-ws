---
seo:
  title: Nuxt Websocket - Docs
  description: A Nuxt module aimed to simplify real-time communication with built-in automatic topic subscriptions, reactive shared state management, and type safety.
---

::u-page-hero
---
orientation: horizontal
---
  :::prose-pre{filename="Terminal" code="npx nuxi module add nuxt-ws"}
  ```bash
  npx nuxi module add nuxt-ws
  ```
  :::

#title
Real-Time

made easy

#description
A Nuxt module aimed to simplify real-time communication with built-in automatic topic subscriptions, reactive shared state management, and type safety.

#links
  :::u-button
  ---
  size: xl
  to: /getting-started
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  <!-- :::u-button
  ---
  color: neutral
  size: xl
  to: /examples
  variant: subtle
  trailing-icon: i-lucide-cable
  ---
  Examples
  ::: -->
::

::u-page-section
#title
Integrated concepts and features

#features
  :::u-page-feature
  ---
  icon: i-lucide-smartphone-nfc
  to: /usage/usws
  ---
  #title
  useWS

  #description
  The all-in-one composable to manage reactive WebSocket connections from client-side.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-arrow-left-right
  to: /usage/definewshandler
  ---
  #title
  defineWSHandler

  #description
  The all-in-one utility to manage reactive WebSocket connections from server-side.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-hammer
  to: /usage/validation
  ---
  #title
  Validation

  #description
  Validation utils for incoming messages from the client.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-messages-square
  to: /usage/topics
  ---
  #title
  Topics

  #description
  Automatic topic subscriptions
  :::
::
