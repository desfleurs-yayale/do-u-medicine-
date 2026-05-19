import type { NotificationSettings } from "@/lib/notification/types";

// 模拟：从 localStorage 读取设置
export function loadSettings(): NotificationSettings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem("notification-settings");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return defaultSettings();
}

// 模拟：保存设置到 localStorage
export function saveSettings(settings: NotificationSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem("notification-settings", JSON.stringify(settings));
}

function defaultSettings(): NotificationSettings {
  const nodeSettings = {} as NotificationSettings["nodeSettings"];
  const slots = [
    "wake_up", "before_breakfast", "after_breakfast",
    "before_lunch", "after_lunch", "before_dinner",
    "after_dinner", "before_exercise", "after_exercise", "before_bed",
  ] as const;
  for (const s of slots) {
    nodeSettings[s] = { enabled: true };
  }
  return {
    enabled: true,
    wechatBound: false,
    advanceMinutes: 5,
    nodeSettings,
  };
}
