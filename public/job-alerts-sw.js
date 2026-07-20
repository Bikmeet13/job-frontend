self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title || "Marketlence Jobs", {
      body: data.body || "A new job has been posted.",
      icon: "/marketlence-mj-logo.png",
      badge: "/favicon.svg",
      data: { url: data.url || "/jobs" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
