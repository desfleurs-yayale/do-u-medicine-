// ---- Service Worker: 保健品提醒 PWA ----
//
// 职责：
// 1. notificationclick — 处理通知快捷操作按钮（已服用 / 稍后提醒）
// 2. push — 接收服务端推送并展示带 action 按钮的系统通知
// 3. message — 接收主线程指令（测试通知、延迟重发）
// 4. 基础 PWA 生命周期管理

// --------------- notificationclick ---------------

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const supplementId = data.supplementId;
  const supplementName = data.supplementName || "保健品";

  if (action === "take") {
    // 免解锁后台静默打卡
    event.waitUntil(
      fetch("/api/reminders/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplementId,
          supplementName,
          action: "taken",
          timestamp: new Date().toISOString(),
        }),
      }).then(async (res) => {
        const result = await res.json().catch(() => ({}));
        // 通知所有打开的客户端更新 UI
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.postMessage({
            type: "supplement-taken",
            supplementId,
            recordedAt: result.recordedAt,
          });
        }
      }),
    );
  } else if (action === "delay") {
    // 15 分钟后重新推送
    const delayMs = 15 * 60 * 1000;

    event.waitUntil(
      fetch("/api/reminders/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplementId,
          supplementName,
          action: "delayed",
          delayMinutes: 15,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {}),
    );

    // Service Worker 内部定时器重新弹通知
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(() => {
          self.registration
            .showNotification(
              `【膳食补充剂提醒】该吃${supplementName}啦！配方建议随餐服用`,
              {
                body: `⏰ 已过 15 分钟，别忘了服用 ${supplementName} 哦`,
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                tag: `supplement-redeliver-${supplementId}`,
                requireInteraction: true,
                vibrate: [200, 100, 200],
                silent: false,
                data: { supplementId, supplementName },
                actions: [
                  { action: "take", title: "✅ 已服用" },
                  { action: "delay", title: "⏰ 稍后提醒" },
                ],
              },
            )
            .then(() => resolve(undefined));
        }, delayMs);
      }),
    );
  } else {
    // 点击通知主体 → 打开/聚焦主页面
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow("/");
        }
      }),
    );
  }
});

// --------------- push ---------------

self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data?.json();
  } catch {
    payload = {};
  }

  const {
    supplementName = "鱼油",
    supplementId = "unknown",
    timeSlot = "饭后",
  } = payload;

  event.waitUntil(
    self.registration.showNotification(
      `【膳食补充剂提醒】该吃${supplementName}啦！配方建议随餐服用`,
      {
        body: `${supplementName} — ${timeSlot}服用提醒，点击选择操作`,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: `supplement-${supplementId}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        silent: false,
        data: { supplementId, supplementName },
        actions: [
          { action: "take", title: "✅ 已服用" },
          { action: "delay", title: "⏰ 稍后提醒" },
        ],
      },
    ),
  );
});

// --------------- message (主线程 → SW) ---------------

self.addEventListener("message", (event) => {
  const msg = event.data;

  // 测试通知（来自设置页面按钮）
  if (msg?.type === "show-test-notification") {
    const { supplementName = "鱼油", supplementId = "sup-2" } = msg;

    event.waitUntil(
      self.registration.showNotification(
        `【膳食补充剂提醒】该吃${supplementName}啦！配方建议随餐服用`,
        {
          body: `鱼油 Omega-3 — 建议随餐服用以提高吸收率，搭配维生素 E 效果更佳`,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `supplement-test-${Date.now()}`,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          silent: false,
          data: { supplementId, supplementName },
          actions: [
            { action: "take", title: "✅ 已服用" },
            { action: "delay", title: "⏰ 稍后提醒" },
          ],
        },
      ),
    );
  }

  // 客户端的延迟重新投递请求
  if (msg?.type === "schedule-redelivery") {
    const {
      supplementName = "鱼油",
      supplementId,
      delayMinutes = 15,
    } = msg;

    const delayMs = delayMinutes * 60 * 1000;

    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(() => {
          self.registration
            .showNotification(
              `【膳食补充剂提醒】该吃${supplementName}啦！配方建议随餐服用`,
              {
                body: `⏰ 已过 ${delayMinutes} 分钟，别忘了服用 ${supplementName} 哦`,
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                tag: `supplement-redeliver-${supplementId}`,
                requireInteraction: true,
                vibrate: [200, 100, 200],
                silent: false,
                data: { supplementId, supplementName },
                actions: [
                  { action: "take", title: "✅ 已服用" },
                  { action: "delay", title: "⏰ 稍后提醒" },
                ],
              },
            )
            .then(() => resolve(undefined));
        }, delayMs);
      }),
    );
  }
});

// --------------- lifecycle ---------------

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
