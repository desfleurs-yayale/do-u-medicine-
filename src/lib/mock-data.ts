import type { Supplement, IntakeRecord } from "./types";

export const mockSupplements: Supplement[] = [
  {
    id: "sup-1",
    name: "维生素 D3",
    brand: "Now Foods",
    dosage: "1粒 / 1000 IU",
    timing: ["wake_up", "after_breakfast"],
    efficacy: "促进钙吸收，维持骨骼健康，增强免疫力",
    precautions: ["建议与含脂肪食物同服以提高吸收率", "避免与钙片同时大量服用"],
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    id: "sup-2",
    name: "鱼油 Omega-3",
    brand: "Nordic Naturals",
    dosage: "2粒 / 1000mg",
    timing: ["after_breakfast", "after_lunch"],
    efficacy: "维护心脑血管健康，抗炎，支持大脑功能",
    precautions: ["与维生素E同服可增强抗氧化效果", "避免与抗凝血药物同服"],
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    id: "sup-3",
    name: "镁片",
    brand: "Doctor's Best",
    dosage: "2粒 / 200mg",
    timing: ["after_dinner", "before_bed"],
    efficacy: "缓解肌肉紧张，改善睡眠质量，调节神经",
    precautions: ["与钙片错开2小时服用", "建议睡前服用以提高睡眠质量"],
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    id: "sup-4",
    name: "益生菌",
    brand: "Culturelle",
    dosage: "1粒 / 100亿CFU",
    timing: ["before_breakfast"],
    efficacy: "调节肠道菌群，改善消化，增强免疫力",
    precautions: ["空腹服用效果最佳", "与抗生素错开至少2小时"],
    color: "bg-green-100 text-green-800 border-green-200",
  },
];

export const mockIntakeRecords: IntakeRecord[] = [
  { supplementId: "sup-1", timeSlot: "wake_up", scheduledTime: "07:00", status: "taken", actualTime: "07:15" },
  { supplementId: "sup-4", timeSlot: "before_breakfast", scheduledTime: "07:30", status: "taken", actualTime: "07:35" },
  { supplementId: "sup-1", timeSlot: "after_breakfast", scheduledTime: "08:30", status: "taken", actualTime: "08:40" },
  { supplementId: "sup-2", timeSlot: "after_breakfast", scheduledTime: "08:30", status: "taken", actualTime: "08:40" },
  { supplementId: "sup-2", timeSlot: "after_lunch", scheduledTime: "13:00", status: "pending" },
  { supplementId: "sup-3", timeSlot: "after_dinner", scheduledTime: "19:00", status: "pending" },
  { supplementId: "sup-3", timeSlot: "before_bed", scheduledTime: "22:00", status: "pending" },
];
