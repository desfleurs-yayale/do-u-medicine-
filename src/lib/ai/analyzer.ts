import type { TimeSlot } from "@/lib/types";

// ---- Configuration ----

interface AIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

function getConfig(): AIConfig {
  return {
    apiKey: process.env.AI_API_KEY || "",
    baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.AI_MODEL || "gpt-4o",
  };
}

export function isAIConfigured(): boolean {
  return !!getConfig().apiKey;
}

// ---- Public types ----

export interface IngredientInfo {
  name: string;
  amount: string;
  effect: string;
}

export interface AnalysisResult {
  name: string;
  brand: string;
  dosage: string;
  timing: TimeSlot[];
  efficacy: string;
  precautions: string[];
  ingredients: IngredientInfo[];
  interactions: string[];
  personalizedTips: string[];
  suitableFor: string[];
  unsuitableFor: string[];
}

// ---- Prompt ----

const SYSTEM_PROMPT = `你是一个专业的保健品分析助手。用户会提供保健品信息（文字描述、链接或图片内容），你需要进行详细分析并返回 JSON。

分析要求：
1. 识别产品名称和品牌
2. 分析主要成分及其含量、作用
3. 评估功效，用 2-3 句话描述核心功效
4. 列出注意事项和禁忌
5. 判断最佳服用时间（从可用时间槽中选择 1-3 个）
6. 识别潜在的药物/保健品相互作用
7. 给出个性化健康建议
8. 判断适用和不适用人群

时间槽（timing）只能从以下值中选择：
wake_up, before_breakfast, after_breakfast, before_lunch, after_lunch, before_dinner, after_dinner, before_exercise, after_exercise, before_bed

返回严格 JSON，不要包含 markdown 代码块标记：
{
  "name": "产品名称",
  "brand": "品牌名",
  "dosage": "推荐用量（如：1粒/天，500mg）",
  "timing": ["after_breakfast"],
  "efficacy": "功效描述，2-3句话",
  "precautions": ["注意事项1", "注意事项2"],
  "ingredients": [{"name": "成分名", "amount": "每粒含量", "effect": "该成分的作用"}],
  "interactions": ["与XX药物/保健品可能产生相互作用"],
  "personalizedTips": ["个性化健康建议"],
  "suitableFor": ["适用人群"],
  "unsuitableFor": ["不适用人群"]
}`;

// ---- Main analyzer ----

export async function analyzeSupplement(
  mode: "photo" | "link" | "text",
  data: string,
): Promise<AnalysisResult> {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error("AI 服务未配置，请设置 AI_API_KEY 环境变量");
  }

  const messages = buildMessages(mode, data);
  const rawJSON = await callLLM(config, messages);
  return parseAnalysisResult(rawJSON);
}

function buildMessages(
  mode: "photo" | "link" | "text",
  data: string,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Array<{ role: string; content: any }> {
  if (mode === "photo") {
    return [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: data, detail: "high" },
          },
          {
            type: "text",
            text: "请分析这张保健品照片，提取产品信息并返回 JSON 分析结果。",
          },
        ],
      },
    ];
  }

  const userPrompt =
    mode === "link"
      ? `请分析以下链接对应的保健品，提取产品信息并返回 JSON 分析结果：\n${data}`
      : `请分析以下保健品信息，提取产品详情并返回 JSON 分析结果：\n${data}`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

// ---- LLM call ----

async function callLLM(
  config: AIConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: Array<{ role: string; content: any }>,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `AI API 请求失败 (${response.status}): ${errorText.slice(0, 200)}`,
      );
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI 返回内容为空");
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Response parsing ----

const VALID_TIMINGS = new Set<string>([
  "wake_up", "before_breakfast", "after_breakfast",
  "before_lunch", "after_lunch", "before_dinner", "after_dinner",
  "before_exercise", "after_exercise", "before_bed",
]);

function parseAnalysisResult(rawJSON: string): AnalysisResult {
  let cleaned = rawJSON.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`AI 返回了无效的 JSON：${cleaned.slice(0, 300)}`);
  }

  const timing = (
    Array.isArray(parsed.timing) ? parsed.timing : ["after_breakfast"]
  ).filter(
    (t): t is TimeSlot =>
      typeof t === "string" && VALID_TIMINGS.has(t),
  );

  if (timing.length === 0) {
    timing.push("after_breakfast");
  }

  return {
    name: String(parsed.name || "未知产品"),
    brand: String(parsed.brand || "未知品牌"),
    dosage: String(parsed.dosage || "请遵医嘱"),
    timing,
    efficacy: String(parsed.efficacy || ""),
    precautions: ensureStringArray(parsed.precautions),
    ingredients: ensureIngredientArray(parsed.ingredients),
    interactions: ensureStringArray(parsed.interactions),
    personalizedTips: ensureStringArray(parsed.personalizedTips),
    suitableFor: ensureStringArray(parsed.suitableFor),
    unsuitableFor: ensureStringArray(parsed.unsuitableFor),
  };
}

function ensureStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string");
}

function ensureIngredientArray(val: unknown): IngredientInfo[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter(
      (v): v is Record<string, unknown> =>
        typeof v === "object" && v !== null,
    )
    .map((v) => ({
      name: String(v.name || ""),
      amount: String(v.amount || ""),
      effect: String(v.effect || ""),
    }))
    .filter((i) => i.name);
}

// ---- Color assignment ----

export function assignSupplementColor(
  name: string,
  ingredients: IngredientInfo[],
): string {
  const text =
    name +
    ingredients.map((i) => i.name).join(" ");
  const lower = text.toLowerCase();

  if (/维生素|vitamin|维他命|vc\b|vd\b|vb\b|ve\b|vk\b|b族/.test(lower))
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (/鱼油|omega|dha|epa|鱼肝油|深海/.test(lower))
    return "bg-blue-100 text-blue-800 border-blue-200";
  if (/益生菌|probiotic|乳酸菌|双歧|嗜酸|乳杆/.test(lower))
    return "bg-green-100 text-green-800 border-green-200";
  if (/镁|钙|锌|铁|硒|铬|钾|mineral/.test(lower))
    return "bg-purple-100 text-purple-800 border-purple-200";
  if (/蛋白|protein|氨基酸|乳清|whey|肌酸|bcaa/.test(lower))
    return "bg-rose-100 text-rose-800 border-rose-200";
  if (/草本|herb|草药|植物|提取物|姜黄|人参|灵芝|枸杞/.test(lower))
    return "bg-teal-100 text-teal-800 border-teal-200";
  if (/辅酶|coq|coenzyme|硫辛酸|谷胱/.test(lower))
    return "bg-orange-100 text-orange-800 border-orange-200";

  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}
