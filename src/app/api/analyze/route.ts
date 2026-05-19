import { NextRequest, NextResponse } from "next/server";
import { analyzeSupplement, isAIConfigured } from "@/lib/ai/analyzer";
import type { AnalysisResult } from "@/lib/ai/analyzer";

export async function POST(request: NextRequest) {
  try {
    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: "AI 服务未配置，请联系管理员设置 AI_API_KEY" },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.mode !== "string" || typeof body.data !== "string") {
      return NextResponse.json(
        { error: "请求参数无效，需要 mode 和 data 字段" },
        { status: 400 },
      );
    }

    const { mode, data } = body;

    if (!["photo", "link", "text"].includes(mode)) {
      return NextResponse.json(
        { error: `无效的输入模式：${mode}，支持 photo / link / text` },
        { status: 400 },
      );
    }

    if (!data || data.trim().length === 0) {
      return NextResponse.json(
        { error: "输入数据不能为空" },
        { status: 400 },
      );
    }

    // 图片 base64 数据大小限制（约 10MB → ~13.6M base64 chars）
    if (mode === "photo" && data.length > 14_000_000) {
      return NextResponse.json(
        { error: "图片过大，请压缩后再上传（不超过 10MB）" },
        { status: 400 },
      );
    }

    // 文本/链接长度限制
    if (mode !== "photo" && data.length > 10_000) {
      return NextResponse.json(
        { error: "输入文本过长，请精简后再试（不超过 10000 字符）" },
        { status: 400 },
      );
    }

    const result: AnalysisResult = await analyzeSupplement(mode, data);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "分析服务异常，请稍后重试";
    console.error("[/api/analyze] 分析失败:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
