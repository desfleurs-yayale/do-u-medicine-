"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TIME_NODES } from "@/lib/types";
import type { TimeSlot } from "@/lib/types";
import type { NotificationSettings } from "@/lib/notification/types";
import { loadSettings, saveSettings } from "@/lib/notification/settings-store";
import { requestBrowserPermission } from "@/lib/notification/service";
import { feedbackInfo } from "@/lib/feedback";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [wechatPushResult, setWechatPushResult] = useState<string | null>(null);
  const [wechatPushing, setWechatPushing] = useState(false);
  const [pwaResult, setPwaResult] = useState<string | null>(null);
  const [pwaLoading, setPwaLoading] = useState(false);

  // 进入设置页自动请求系统通知权限
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  function updateAndSave(partial: Partial<NotificationSettings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
    if (typeof partial.enabled === "boolean") {
      feedbackInfo(partial.enabled ? "通知提醒已开启" : "通知提醒已关闭");
    }
  }

  function toggleNode(slot: TimeSlot) {
    const nextEnabled = !settings.nodeSettings[slot]?.enabled;
    const node = TIME_NODES.find((n) => n.slot === slot);
    feedbackInfo(
      `${node?.label ?? ""}提醒已${nextEnabled ? "开启" : "关闭"}`,
    );
    const next = {
      ...settings,
      nodeSettings: {
        ...settings.nodeSettings,
        [slot]: {
          ...settings.nodeSettings[slot],
          enabled: !settings.nodeSettings[slot]?.enabled,
        },
      },
    };
    setSettings(next);
    saveSettings(next);
  }

  async function handleTestNotification() {
    setTestResult("请求通知权限中...");
    const granted = await requestBrowserPermission();
    if (!granted) {
      setTestResult("❌ 需要允许浏览器通知权限");
      return;
    }
    new Notification("💊 保健品服用提醒 — 测试", {
      body: "鱼油 Omega-3、维生素 D3 — 早饭后 08:30",
      icon: "/favicon.ico",
      requireInteraction: true,
      vibrate: [200, 100, 200],
    });
    setTestResult("✅ 测试通知已发送，请查看屏幕上方");
    setTimeout(() => setTestResult(null), 4000);
  }

  async function handleWechatTestPush() {
    setWechatPushing(true);
    setWechatPushResult("⏳ 正在通过微信服务器发送测试消息...");
    try {
      const res = await fetch("/api/test-push", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setWechatPushResult(`✅ ${data.message}`);
      } else {
        setWechatPushResult(`❌ ${data.error}`);
      }
    } catch (err) {
      setWechatPushResult(`❌ 网络请求失败: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setWechatPushing(false);
    }

    // 2 秒后弹出系统级浏览器通知横幅
    setTimeout(() => {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("【膳食补充剂提醒】该吃鱼油啦！配方建议随餐服用", {
            body: "鱼油 Omega-3 — 建议随餐服用以提高吸收率，搭配维生素 E 效果更佳",
            icon: "/favicon.ico",
            tag: "supplement-reminder",
            requireInteraction: true,
            silent: false,
            vibrate: [200, 100, 200],
          });
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((perm) => {
            if (perm === "granted") {
              new Notification("【膳食补充剂提醒】该吃鱼油啦！配方建议随餐服用", {
                body: "鱼油 Omega-3 — 建议随餐服用以提高吸收率，搭配维生素 E 效果更佳",
                icon: "/favicon.ico",
                tag: "supplement-reminder",
                requireInteraction: true,
                silent: false,
                vibrate: [200, 100, 200],
              });
            }
          });
        }
      }
    }, 2000);
  }

  async function handlePwaStrongReminder() {
    setPwaLoading(true);
    setPwaResult("⏳ 正在请求系统通知权限...");

    // 1. 请求通知权限
    const granted = await requestBrowserPermission();
    if (!granted) {
      setPwaResult("❌ 需要允许浏览器通知权限才能使用桌面强提醒");
      setPwaLoading(false);
      return;
    }

    // 2. 确保 Service Worker 已就绪
    if (!("serviceWorker" in navigator)) {
      setPwaResult("❌ 当前浏览器不支持 Service Worker，无法启用桌面强提醒");
      setPwaLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // 3. 通过 SW 发送携带 action 按钮的系统通知
      //    （只有通过 SW 发出的通知，notificationclick 才会被 SW 拦截处理）
      setPwaResult("⏳ 正在通过 Service Worker 发送强提醒通知...");

      await registration.showNotification(
        "【膳食补充剂提醒】该吃鱼油啦！配方建议随餐服用",
        {
          body: "鱼油 Omega-3 — 建议随餐服用以提高吸收率，搭配维生素 E 效果更佳\n\n⬇ 点击下方按钮直接操作，无需进入网页",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `pwa-test-${Date.now()}`,
          requireInteraction: true,
          silent: false,
          vibrate: [200, 100, 200],
          data: {
            supplementId: "sup-2",
            supplementName: "鱼油 Omega-3",
          },
          actions: [
            { action: "take", title: "✅ 已服用" },
            { action: "delay", title: "⏰ 稍后提醒" },
          ],
        },
      );

      setPwaResult(
        "✅ 强提醒通知已发送！请查看系统通知栏，长按或展开通知即可看到「✅ 已服用」和「⏰ 稍后提醒」快捷按钮",
      );
    } catch (err) {
      setPwaResult(
        `❌ Service Worker 通信失败: ${err instanceof Error ? err.message : "请确认已安装 PWA 并刷新页面"}`,
      );
    } finally {
      setPwaLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      {/* top bar */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b-2 border-zinc-200">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3.5">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-base font-bold text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
          >
            ← 返回
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-extrabold text-zinc-900">⚙️ 提醒设置</h1>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-5 space-y-5">

        {/* ---- 微信绑定卡片（功能规划中）---- */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm relative opacity-60 select-none">
          {/* 规划中气泡 */}
          <div className="absolute -top-2.5 right-4 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[10px] font-bold text-amber-700 shadow-sm">
              🚧 功能规划中，敬请期待
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 text-3xl grayscale">
              💬
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-zinc-500">微信订阅号通知</h2>
              <p className="text-sm text-zinc-400 mt-1">
                暂未上线 · 请使用下方 PWA 桌面强提醒替代
              </p>
            </div>
            <button
              disabled
              className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold bg-zinc-100 text-zinc-400 cursor-not-allowed"
            >
              暂不可用
            </button>
          </div>
        </section>

        {/* ---- 通知开关 ---- */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-5">
          {/* 总开关 */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">启用通知提醒</h2>
              <p className="text-sm text-zinc-500 mt-1">
                关闭后不会收到任何服用提醒
              </p>
            </div>
            <button
              role="switch"
              aria-checked={settings.enabled}
              aria-label="启用通知提醒"
              onClick={() => updateAndSave({ enabled: !settings.enabled })}
              className={`relative h-11 w-20 shrink-0 rounded-full transition-colors ${
                settings.enabled ? "bg-emerald-500" : "bg-zinc-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-9 w-9 rounded-full bg-white shadow transition-transform ${
                  settings.enabled ? "left-[47px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <hr className="border-zinc-100" />

          {/* 提前通知时间 */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">提前通知</h2>
              <p className="text-sm text-zinc-500 mt-1">
                提前 {settings.advanceMinutes} 分钟推送提醒
              </p>
            </div>
            <select
              value={settings.advanceMinutes}
              onChange={(e) => updateAndSave({ advanceMinutes: Number(e.target.value) })}
              disabled={!settings.enabled}
              className="rounded-xl border-2 border-zinc-300 bg-zinc-50 px-4 py-3 text-base font-bold text-zinc-800 outline-none focus:border-emerald-400 disabled:opacity-40"
            >
              <option value={0}>准时</option>
              <option value={5}>提前 5 分钟</option>
              <option value={10}>提前 10 分钟</option>
              <option value={15}>提前 15 分钟</option>
              <option value={30}>提前 30 分钟</option>
            </select>
          </div>

          <hr className="border-zinc-100" />

          {/* 各时间节点开关 */}
          <div>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">提醒节点</h2>
            <div className="grid grid-cols-1 gap-2">
              {TIME_NODES.map((node) => {
                const nodeCfg = settings.nodeSettings[node.slot];
                const enabled = nodeCfg?.enabled ?? true;
                return (
                  <div
                    key={node.slot}
                    className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
                      enabled
                        ? "bg-zinc-50 border-zinc-200"
                        : "bg-white border-zinc-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{node.icon}</span>
                      <div>
                        <span className="text-base font-bold text-zinc-800">
                          {node.label}
                        </span>
                        <span className="ml-2 text-sm text-zinc-500 font-mono">
                          {node.typicalTime}
                        </span>
                      </div>
                    </div>
                    <button
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`${node.label}提醒开关`}
                      onClick={() => toggleNode(node.slot)}
                      disabled={!settings.enabled}
                      className={`relative h-11 w-20 shrink-0 rounded-full transition-colors ${
                        enabled ? "bg-emerald-500" : "bg-zinc-300"
                      } disabled:opacity-30`}
                    >
                      <span
                        className={`absolute top-0.5 h-9 w-9 rounded-full bg-white shadow transition-transform ${
                          enabled ? "left-[47px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---- 测试通知（浏览器）---- */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">测试通知（浏览器）</h2>
              <p className="text-sm text-zinc-500 mt-1">
                发送一条简单的浏览器通知，验证基本通知通道
              </p>
            </div>
            <button
              onClick={handleTestNotification}
              className="shrink-0 rounded-xl border-2 border-zinc-400 px-5 py-3 text-base font-bold text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all"
            >
              🔔 发送测试
            </button>
          </div>
          {testResult && (
            <p className="mt-3 rounded-lg bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
              {testResult}
            </p>
          )}
        </section>

        {/* ---- 微信测试推送 ---- */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">微信即时测试推送</h2>
              <p className="text-sm text-zinc-500 mt-1">
                向已绑定的微信发送一条真实模板消息，验证推送链路
              </p>
            </div>
            <button
              onClick={handleWechatTestPush}
              disabled={wechatPushing}
              className={`shrink-0 rounded-xl px-5 py-3 text-base font-bold transition-all active:scale-95 ${
                wechatPushing
                  ? "bg-zinc-100 text-zinc-400 cursor-wait"
                  : "bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200"
              }`}
            >
              {wechatPushing ? "⏳ 发送中..." : "📲 发送测试消息"}
            </button>
          </div>
          {wechatPushResult && (
            <p className={`mt-3 rounded-lg px-4 py-3 text-sm font-medium ${
              wechatPushResult.startsWith("✅")
                ? "bg-green-50 text-green-700"
                : wechatPushResult.startsWith("⏳")
                  ? "bg-blue-50 text-blue-700"
                  : "bg-red-50 text-red-700"
            }`}>
              {wechatPushResult}
            </p>
          )}
        </section>

        {/* ---- PWA 桌面强提醒（Notification Actions）---- */}
        <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white text-2xl shadow-md shadow-emerald-200">
              🚀
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-emerald-800">
                配置并开启桌面强提醒
              </h2>
              <p className="text-sm text-emerald-700/80 mt-1">
                通知携带快捷操作按钮，锁屏界面也能一键打卡
              </p>
            </div>
          </div>

          <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
            点击下方按钮后，系统将授权通知权限并发送一条携带
            <span className="font-bold text-emerald-700">「✅ 已服用」</span>
            和
            <span className="font-bold text-amber-700">「⏰ 稍后提醒」</span>
            快捷按钮的测试通知。你可以长按通知或展开通知横幅，无需进入网页即可完成打卡操作。
          </p>

          <button
            onClick={handlePwaStrongReminder}
            disabled={pwaLoading}
            className={`w-full rounded-xl py-4 text-lg font-bold transition-all active:scale-[0.98] ${
              pwaLoading
                ? "bg-zinc-200 text-zinc-400 cursor-wait"
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-300"
            }`}
          >
            {pwaLoading ? "⏳ 正在配置..." : "🚀 配置并开启桌面强提醒"}
          </button>

          {pwaResult && (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium leading-relaxed ${
                pwaResult.startsWith("✅")
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : pwaResult.startsWith("⏳")
                    ? "bg-blue-50 border border-blue-200 text-blue-700"
                    : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {pwaResult}
            </div>
          )}

          {/* 使用提示 */}
          <div className="mt-4 grid grid-cols-1 gap-2">
            {[
              { icon: "📱", text: "添加到主屏幕获得完整体验" },
              { icon: "🔔", text: "锁屏通知长按显示操作按钮" },
              { icon: "⚡", text: "免解锁一键打卡无需进网页" },
            ].map((tip) => (
              <div
                key={tip.icon}
                className="flex items-center gap-3 rounded-lg bg-white/80 border border-zinc-100 px-4 py-3"
              >
                <div className="text-2xl">{tip.icon}</div>
                <p className="text-sm text-zinc-700">{tip.text}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      <div className="h-6" />
    </div>
  );
}
