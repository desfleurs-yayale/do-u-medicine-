"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TimeNodeBoard from "@/components/dashboard/TimeNodeBoard";
import SupplementInput from "@/components/input/SupplementInput";
import {
  mockSupplements as initialSupplements,
  mockIntakeRecords as initialRecords,
} from "@/lib/mock-data";
import type { Supplement, IntakeRecord, IntakeAction, InputMode, TimeSlot } from "@/lib/types";
import type { AnalysisResult } from "@/lib/ai/analyzer";
import { assignSupplementColor } from "@/lib/ai/analyzer";
import { loadSettings } from "@/lib/notification/settings-store";
import { startScheduler, stopScheduler } from "@/lib/notification/scheduler";

export default function Home() {
  const router = useRouter();
  const [supplements, setSupplements] = useState<Supplement[]>(initialSupplements);
  const [intakeRecords, setIntakeRecords] = useState<IntakeRecord[]>(initialRecords);
  const [analyzing, setAnalyzing] = useState(false);

  // 启动通知调度器
  useEffect(() => {
    const settings = loadSettings();
    const cleanup = startScheduler(
      settings,
      (slot: TimeSlot) => {
        return intakeRecords
          .filter((r) => r.timeSlot === slot && r.status === "pending")
          .map((r) => supplements.find((s) => s.id === r.supplementId)?.name)
          .filter(Boolean) as string[];
      },
      settings.openid,
    );
    return () => {
      stopScheduler();
      if (cleanup) cleanup();
    };
  }, [intakeRecords, supplements]);

  function handleIntakeAction(supplementId: string, slot: string, action: IntakeAction) {
    setIntakeRecords((prev) =>
      prev.map((r) =>
        r.supplementId === supplementId && r.timeSlot === slot
          ? {
              ...r,
              status: action,
              actualTime:
                action === "taken"
                  ? new Date().toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : undefined,
            }
          : r,
      ),
    );
  }

  async function handleAddSupplement(mode: InputMode, data: string, file?: File) {
    // 1. 创建占位卡片（即时反馈）
    const tempId = `sup-${Date.now()}`;
    const placeholder: Supplement = {
      id: tempId,
      name: "AI 分析中...",
      brand: "识别中...",
      dosage: "—",
      timing: ["after_breakfast"],
      efficacy: "正在调用大模型分析，请稍候...",
      precautions: [],
      color: "bg-zinc-100 text-zinc-700 border-zinc-200 animate-pulse",
    };
    setSupplements((prev) => [...prev, placeholder]);
    setIntakeRecords((prev) => [
      ...prev,
      {
        supplementId: tempId,
        timeSlot: "after_breakfast",
        scheduledTime: "08:30",
        status: "pending",
      },
    ]);

    // 2. 调用 AI 分析 API
    setAnalyzing(true);
    try {
      let requestData = data;
      if (mode === "photo" && file) {
        requestData = await fileToBase64(file);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, data: requestData }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "分析失败" }));
        throw new Error(err.error || `请求失败 (${response.status})`);
      }

      const result: AnalysisResult = await response.json();

      // 3. 用真实分析结果更新占位卡片
      setSupplements((prev) =>
        prev.map((s) =>
          s.id === tempId
            ? analysisToSupplement(tempId, result)
            : s,
        ),
      );

      // 为新保健品创建服用记录
      setIntakeRecords((prev) => {
        const filtered = prev.filter((r) => r.supplementId !== tempId);
        const newRecords = result.timing.map((slot) => {
          const config = TIME_NODE_TIMES[slot] || "08:30";
          return {
            supplementId: tempId,
            timeSlot: slot,
            scheduledTime: config,
            status: "pending" as const,
          };
        });
        return [...filtered, ...newRecords];
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "分析失败";
      setSupplements((prev) =>
        prev.map((s) =>
          s.id === tempId
            ? {
                ...s,
                name: `分析失败`,
                efficacy: message,
                color: "bg-red-100 text-red-800 border-red-200",
              }
            : s,
        ),
      );
    } finally {
      setAnalyzing(false);
    }
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const pendingCount = intakeRecords.filter((r) => r.status === "pending").length;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      {/* top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-zinc-900">
              今天你保健了没？
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
            <button
              onClick={() => router.push("/settings")}
              className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* main content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-5 space-y-6">
        <SupplementInput onSubmit={handleAddSupplement} disabled={analyzing} />
        <TimeNodeBoard
          supplements={supplements}
          intakeRecords={intakeRecords}
          onAction={handleIntakeAction}
        />
      </main>

      {/* bottom nav */}
      <nav className="sticky bottom-0 z-10 bg-white/80 backdrop-blur-md border-t border-zinc-100">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-5 py-2">
          <button className="flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl bg-emerald-50 text-emerald-700">
            <span className="text-lg">🏠</span>
            <span className="text-[10px] font-bold">首页</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl text-zinc-400 hover:text-zinc-600 transition-colors">
            <span className="text-lg">📊</span>
            <span className="text-[10px] font-bold">统计</span>
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <span className="text-lg">⚙️</span>
            <span className="text-[10px] font-bold">设置</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// ---- Helpers ----

/** 将 File 转为 base64 data URL */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

/** AI 分析结果 → Supplement 卡片 */
function analysisToSupplement(
  id: string,
  result: AnalysisResult,
): Supplement {
  return {
    id,
    name: result.name,
    brand: result.brand,
    dosage: result.dosage,
    timing: result.timing,
    efficacy: result.efficacy,
    precautions: [
      ...result.precautions,
      ...result.interactions.map((s) => `⚠️ ${s}`),
      ...result.personalizedTips.map((s) => `💡 ${s}`),
    ],
    color: assignSupplementColor(result.name, result.ingredients),
  };
}

/** 时间槽 → 默认时间映射 */
const TIME_NODE_TIMES: Record<string, string> = {
  wake_up: "07:00",
  before_breakfast: "07:30",
  after_breakfast: "08:30",
  before_lunch: "11:30",
  after_lunch: "13:00",
  before_dinner: "17:30",
  after_dinner: "19:00",
  before_exercise: "16:00",
  after_exercise: "17:00",
  before_bed: "22:00",
};
