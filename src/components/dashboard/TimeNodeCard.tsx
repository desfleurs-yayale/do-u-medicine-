"use client";

import type { Supplement, IntakeRecord, TimeNodeConfig, IntakeAction } from "@/lib/types";

interface TimeNodeCardProps {
  node: TimeNodeConfig;
  supplements: Supplement[];
  intakeRecords: IntakeRecord[];
  isCurrent: boolean;
  onAction: (supplementId: string, slot: string, action: IntakeAction) => void;
}

function SupplementBadge({
  supplement,
  record,
  onAction,
}: {
  supplement: Supplement;
  record: IntakeRecord;
  onAction: (supplementId: string, slot: string, action: IntakeAction) => void;
}) {
  const statusConfig = {
    taken: {
      badge: "已服用 ✓",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    pending: {
      badge: "待服用",
      badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    },
    skipped: {
      badge: "已跳过",
      badgeClass: "bg-zinc-100 text-zinc-500 border-zinc-200",
    },
    postponed: {
      badge: "已推迟",
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
  };

  const config = statusConfig[record.status];

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border px-4 py-4 text-base transition-all ${config.badgeClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-lg font-bold truncate">{supplement.name}</span>
          <span className="text-sm opacity-80">{supplement.dosage}</span>
        </div>
        {record.status !== "pending" && (
          <span className="text-sm font-bold shrink-0">{config.badge}</span>
        )}
      </div>

      {record.status === "pending" && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onAction(supplement.id, record.timeSlot, "taken")}
            className="w-full rounded-xl bg-emerald-600 py-4 text-xl font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-200"
          >
            ✅ 已服用
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAction(supplement.id, record.timeSlot, "postponed")}
              className="flex-1 rounded-xl bg-amber-500 py-3 text-base font-bold text-white hover:bg-amber-600 active:scale-95 transition-all"
            >
              ⏰ 稍后提醒
            </button>
            <button
              onClick={() => onAction(supplement.id, record.timeSlot, "skipped")}
              className="flex-1 rounded-xl border-2 border-zinc-400 py-3 text-base font-bold text-zinc-600 hover:bg-zinc-100 active:scale-95 transition-all"
            >
              今天不吃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimeNodeCard({
  node,
  supplements,
  intakeRecords,
  isCurrent,
  onAction,
}: TimeNodeCardProps) {
  const nodeRecords = intakeRecords.filter((r) => r.timeSlot === node.slot);
  const nodeSupplements = supplements.filter((s) =>
    nodeRecords.some((r) => r.supplementId === s.id)
  );
  const allDone = nodeRecords.length > 0 && nodeRecords.every((r) => r.status === "taken");
  const hasContent = nodeRecords.length > 0;

  return (
    <div className={`flex gap-4 ${isCurrent ? "relative" : ""}`}>
      {/* timeline connector */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-sm border-2 transition-all ${
            allDone
              ? "bg-emerald-50 border-emerald-300"
              : hasContent
                ? "bg-orange-50 border-orange-300"
                : "bg-white border-zinc-200"
          } ${isCurrent ? "ring-4 ring-emerald-200 scale-110" : ""}`}
        >
          {node.icon}
        </div>
      </div>

      {/* content */}
      <div className="flex-1 pb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3
            className={`text-lg font-bold ${
              isCurrent ? "text-emerald-700" : "text-zinc-900"
            }`}
          >
            {node.label}
          </h3>
          <span className="text-sm text-zinc-500 font-mono">{node.typicalTime}</span>
          {isCurrent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              当前
            </span>
          )}
          {allDone && hasContent && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
              全部完成 ✓
            </span>
          )}
        </div>

        {hasContent ? (
          <div className="flex flex-col gap-3">
            {nodeRecords.map((record) => {
              const supplement = nodeSupplements.find((s) => s.id === record.supplementId);
              if (!supplement) return null;
              return (
                <SupplementBadge
                  key={`${record.supplementId}-${record.timeSlot}`}
                  supplement={supplement}
                  record={record}
                  onAction={onAction}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">暂无服用安排</p>
        )}
      </div>
    </div>
  );
}
