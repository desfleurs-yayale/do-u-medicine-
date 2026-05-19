import type { TimeSlot } from "@/lib/types";

// ---- 通知设置 ----

export interface NodeNotificationConfig {
  enabled: boolean;
  customTime?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  wechatBound: boolean;
  openid?: string;
  advanceMinutes: number;
  nodeSettings: Record<TimeSlot, NodeNotificationConfig>;
}

// ---- 通知载荷 ----

export interface NotificationPayload {
  timeSlot: TimeSlot;
  timeSlotLabel: string;
  scheduledTime: string;
  supplementNames: string[];
  templateId?: string;
}

// ---- 通知渠道 ----

export type NotificationChannel = "wechat" | "browser";

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  error?: string;
}

// ---- 微信 OA 配置 ----

export interface WechatOAConfig {
  appId: string;
  appSecret: string;
  token: string;
  templateIds: Record<string, string>;
}

// ---- 默认设置 ----

export function defaultNotificationSettings(): NotificationSettings {
  const nodeSettings = {} as Record<TimeSlot, NodeNotificationConfig>;
  const slots: TimeSlot[] = [
    "wake_up",
    "before_breakfast",
    "after_breakfast",
    "before_lunch",
    "after_lunch",
    "before_dinner",
    "after_dinner",
    "before_exercise",
    "after_exercise",
    "before_bed",
  ];
  for (const slot of slots) {
    nodeSettings[slot] = { enabled: true };
  }
  return {
    enabled: true,
    wechatBound: false,
    advanceMinutes: 5,
    nodeSettings,
  };
}
