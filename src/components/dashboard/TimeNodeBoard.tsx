"use client";

import { useState } from "react";
import { TIME_NODES } from "@/lib/types";
import type { Supplement, IntakeRecord, IntakeAction, TimeSlot } from "@/lib/types";
import TimeNodeCard from "./TimeNodeCard";

interface TimeNodeBoardProps {
  supplements: Supplement[];
  intakeRecords: IntakeRecord[];
  onAction: (supplementId: string, slot: string, action: IntakeAction) => void;
}

export default function TimeNodeBoard({
  supplements,
  intakeRecords,
  onAction,
}: TimeNodeBoardProps) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  function findCurrentNodeIndex(): number {
    for (let i = TIME_NODES.length - 1; i >= 0; i--) {
      const [h, m] = TIME_NODES[i].typicalTime.split(":").map(Number);
      if (
        currentHour > h ||
        (currentHour === h && currentMinute >= m)
      ) {
        return i;
      }
    }
    return 0;
  }

  const [currentNodeIdx] = useState(findCurrentNodeIndex);

  const takenCount = intakeRecords.filter((r) => r.status === "taken").length;
  const totalCount = intakeRecords.length;
  const progressPct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* 今日进度条 */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold opacity-90">📋 今日服用进度</h2>
          <span className="text-4xl font-extrabold tabular-nums">{progressPct}%</span>
        </div>
        <div className="h-3.5 rounded-full bg-white/25 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-sm opacity-90">
          <span>
            已服用 {takenCount}/{totalCount}
          </span>
          <span>{totalCount - takenCount} 项待完成</span>
        </div>
      </div>

      {/* 时间线 */}
      <div className="relative">
        {/* 竖线，从第一个节点到最后一个 */}
        <div className="absolute left-6 top-6 bottom-6 w-px bg-zinc-200" />

        <div className="flex flex-col">
          {TIME_NODES.map((node, idx) => (
            <TimeNodeCard
              key={node.slot}
              node={node}
              supplements={supplements}
              intakeRecords={intakeRecords.filter((r) => r.timeSlot === node.slot)}
              isCurrent={idx === currentNodeIdx}
              onAction={onAction}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
