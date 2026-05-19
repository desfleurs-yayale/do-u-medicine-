import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.action !== "string") {
    return NextResponse.json(
      { success: false, error: "请求参数无效，需要 action 字段" },
      { status: 400 },
    );
  }

  const {
    supplementId = "unknown",
    supplementName = "保健品",
    action,
    timestamp = new Date().toISOString(),
    delayMinutes = 15,
  } = body;

  if (!["taken", "delayed"].includes(action)) {
    return NextResponse.json(
      { success: false, error: `无效的 action: ${action}，支持 taken / delayed` },
      { status: 400 },
    );
  }

  const recordedAt = new Date().toISOString();

  console.log(
    `[reminders/action] ${action} | ` +
    `supplement=${supplementName}(${supplementId}) | ` +
    `delayMin=${action === "delayed" ? delayMinutes : "N/A"} | ` +
    `recordedAt=${recordedAt}`,
  );

  return NextResponse.json({
    success: true,
    supplementId,
    supplementName,
    action,
    ...(action === "delayed" ? { delayMinutes } : {}),
    recordedAt,
  });
}
