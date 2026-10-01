import { clientsClaim } from "workbox-core";
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { body: event.data?.text() || "" };
  }

  event.waitUntil(self.registration.showNotification(data.title || "The System", {
    body: data.body || "Your next quest is ready.",
    tag: data.tag || "solo-leveling-notification",
    data: { url: data.url || "/" },
    renotify: false,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const client = clients.find((item) => item.url.startsWith(self.location.origin));
    if (client) {
      client.navigate(target);
      return client.focus();
    }
    return self.clients.openWindow(target);
  }));
});