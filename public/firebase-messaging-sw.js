importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
firebase.messaging();

// Ao tocar na notificação: foca o app aberto ou abre na página indicada.
self.addEventListener("notificationclick", (event) => {
  const dados = (event.notification && event.notification.data) || {};
  const fcm = dados.FCM_MSG || {};
  const destino =
    (fcm.notification && fcm.notification.click_action) ||
    (fcm.data && fcm.data.url) ||
    dados.url ||
    "/";
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = new URL(destino, self.location.origin).href;
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of janelas) {
        if (new URL(c.url).origin === self.location.origin) {
          await c.focus();
          if ("navigate" in c) await c.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
