// ---- 统一通知服务 ----
// 封装多渠道通知：微信订阅号 + 浏览器通知（降级）

import type { NotificationPayload, NotificationResult, NotificationChannel } from "./types";
import { sendWechatNotification, isWechatConfigured } from "./wechat";

export async function sendNotification(
  channel: NotificationChannel,
  payload: NotificationPayload,
  openid?: string,
): Promise<NotificationResult> {
  switch (channel) {
    case "wechat":
      if (openid) {
        return sendWechatNotification(openid, payload);
      }
      return { success: false, channel: "wechat", error: "未绑定微信 openid" };

    case "browser":
      return sendBrowserNotification(payload);

    default:
      return { success: false, channel, error: "未知通知渠道" };
  }
}

function sendBrowserNotification(payload: NotificationPayload): NotificationResult {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { success: false, channel: "browser", error: "浏览器不支持通知" };
  }

  if (Notification.permission === "denied") {
    return { success: false, channel: "browser", error: "通知权限被拒绝" };
  }

  if (Notification.permission === "default") {
    Notification.requestPermission();
    return { success: false, channel: "browser", error: "需要先授权通知权限" };
  }

  const body = payload.supplementNames.join("、") + ` — ${payload.timeSlotLabel}`;
  new Notification("💊 保健品服用提醒", {
    body,
    icon: "/favicon.ico",
    tag: `supplement-${payload.timeSlot}`,
    requireInteraction: true,
    vibrate: [200, 100, 200],
  });

  return { success: true, channel: "browser" };
}

export function getAvailableChannels(): NotificationChannel[] {
  const channels: NotificationChannel[] = [];

  if (isWechatConfigured()) {
    channels.push("wechat");
  }

  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission !== "denied"
  ) {
    channels.push("browser");
  }

  return channels;
}

export async function requestBrowserPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}
