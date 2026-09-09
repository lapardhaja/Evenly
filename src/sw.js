import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import {
  applyChatOpenMessage,
  chatNotificationClickUrl,
  parsePushEventData,
  shouldShowChatPush,
} from './lib/chatPushSw.js';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

let chatOpenState = { openConversationId: '' };

self.addEventListener('message', (event) => {
  chatOpenState = applyChatOpenMessage(chatOpenState, event.data);
});

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(handleNotificationClick(event));
});

async function handlePush(event) {
  const data = parsePushEventData(event.data);
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  if (
    !shouldShowChatPush(chatOpenState, {
      conversationId: data.conversationId,
      windowClients,
    })
  ) {
    return;
  }
  await self.registration.showNotification(data.title, {
    body: data.body,
    tag: data.tag,
    icon: '/brand/pwa-192.png',
    badge: '/brand/pwa-192.png',
    silent: false,
    renotify: true,
    data: { path: data.path, conversationId: data.conversationId },
  });
}

async function handleNotificationClick(event) {
  const path = event.notification?.data?.path || '#/chat';
  const url = chatNotificationClickUrl(self.location.origin, path);
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  for (const client of windowClients) {
    if (typeof client.focus === 'function') {
      await client.focus();
      if (typeof client.navigate === 'function') {
        try {
          await client.navigate(url);
          return;
        } catch {
          /* fall through to postMessage */
        }
      }
      client.postMessage?.({ type: 'evenly-navigate', url });
      return;
    }
  }
  await self.clients.openWindow(url);
}
