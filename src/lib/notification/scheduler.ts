// ---- 通知调度器 ----
//
// 调度逻辑：
// 1. 根据用户设置的时间节点，计算触发时间 = 节点预设时间 - advanceMinutes
// 2. 定时器每分钟检查一次，发现应当触发的节点即发送通知
// 3. 每个节点每天只触发一次（通过 lastTriggered 记录防重复）
//
// 微信订阅号实际推送需要在服务端进行，这里是前端调度框架。
// 生产环境可改为服务端 Cron Job 调用微信 API。

import { TIME_NODES } from "@/lib/types";
import type { TimeSlot } from "@/lib/types";
import type { NotificationSettings, NotificationPayload } from "./types";
import { sendNotification, requestBrowserPermission } from "./service";

interface ScheduleState {
  intervalId: ReturnType<typeof setInterval> | null;
  lastTriggered: Map<string, string>; // key: "slot:date", value: "triggered"
}

const state: ScheduleState = {
  intervalId: null,
  lastTriggered: new Map(),
};

export function startScheduler(
  settings: NotificationSettings,
  getSupplementNames: (slot: TimeSlot) => string[],
  openid?: string,
) {
  stopScheduler();

  if (!settings.enabled) return;

  requestBrowserPermission();

  state.intervalId = setInterval(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const node of TIME_NODES) {
      const nodeCfg = settings.nodeSettings[node.slot];
      if (!nodeCfg || !nodeCfg.enabled) continue;

      const [h, m] = (nodeCfg.customTime || node.typicalTime).split(":").map(Number);
      const triggerMinutes = h * 60 + m - settings.advanceMinutes;

      // 跳过已经过了很久的时间（超过60分钟不触发）
      if (currentMinutes < triggerMinutes || currentMinutes > triggerMinutes + 60) continue;

      const key = `${node.slot}:${today}`;
      if (state.lastTriggered.get(key) === "triggered") continue;

      const supplementNames = getSupplementNames(node.slot);
      if (supplementNames.length === 0) continue;

      const payload: NotificationPayload = {
        timeSlot: node.slot,
        timeSlotLabel: node.label,
        scheduledTime: nodeCfg.customTime || node.typicalTime,
        supplementNames,
      };

      state.lastTriggered.set(key, "triggered");

      // 优先微信，降级到浏览器通知
      const channel = settings.wechatBound && openid ? "wechat" : "browser";
      sendNotification(channel, payload, openid);
    }
  }, 60_000); // 每分钟检查一次

  return () => stopScheduler();
}

export function stopScheduler() {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

export function resetTodayTriggers() {
  state.lastTriggered.clear();
}
