export type TimeSlot =
  | "wake_up"
  | "before_breakfast"
  | "after_breakfast"
  | "before_lunch"
  | "after_lunch"
  | "before_dinner"
  | "after_dinner"
  | "before_exercise"
  | "after_exercise"
  | "before_bed";

export type IntakeAction = "taken" | "skipped" | "postponed";

export interface Supplement {
  id: string;
  name: string;
  brand: string;
  dosage: string;
  timing: TimeSlot[];
  efficacy: string;
  precautions: string[];
  color: string;
}

export interface IntakeRecord {
  supplementId: string;
  timeSlot: TimeSlot;
  scheduledTime: string;
  status: "pending" | "taken" | "skipped" | "postponed";
  actualTime?: string;
}

export interface TimeNodeConfig {
  slot: TimeSlot;
  label: string;
  icon: string;
  typicalTime: string;
}

export const TIME_NODES: TimeNodeConfig[] = [
  { slot: "wake_up", label: "睡醒", icon: "🌅", typicalTime: "07:00" },
  { slot: "before_breakfast", label: "早饭前", icon: "🍳", typicalTime: "07:30" },
  { slot: "after_breakfast", label: "早饭后", icon: "☕", typicalTime: "08:30" },
  { slot: "before_lunch", label: "午饭前", icon: "🍚", typicalTime: "11:30" },
  { slot: "after_lunch", label: "午饭后", icon: "🍵", typicalTime: "13:00" },
  { slot: "before_dinner", label: "晚饭前", icon: "🍲", typicalTime: "17:30" },
  { slot: "after_dinner", label: "晚饭后", icon: "🥗", typicalTime: "19:00" },
  { slot: "before_exercise", label: "锻炼前", icon: "🏃", typicalTime: "16:00" },
  { slot: "after_exercise", label: "锻炼后", icon: "🧘", typicalTime: "17:00" },
  { slot: "before_bed", label: "睡觉前", icon: "🌙", typicalTime: "22:00" },
];

export type InputMode = "photo" | "link" | "text";
