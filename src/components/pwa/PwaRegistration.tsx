"use client";

import { useEffect } from "react";

export default function PwaRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("[PWA] SW registered:", registration.scope);

        // 监听来自 SW 的消息（后台打卡结果等）
        navigator.serviceWorker.addEventListener("message", (event) => {
          const msg = event.data;
          if (msg?.type === "supplement-taken") {
            console.log(
              `[PWA] 后台打卡成功: supplementId=${msg.supplementId} at=${msg.recordedAt}`,
            );
          }
        });
      })
      .catch((err) => {
        console.error("[PWA] SW registration failed:", err);
      });
  }, []);

  return null;
}
