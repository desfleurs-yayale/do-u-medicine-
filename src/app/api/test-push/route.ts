import { NextResponse } from "next/server";

// WeChat 测试号 / 服务号配置，全部从环境变量读取
function getWechatConfig() {
  return {
    appId: process.env.WECHAT_APP_ID || "",
    appSecret: process.env.WECHAT_APP_SECRET || "",
    templateId: process.env.WECHAT_TEMPLATE_ID || "",
    openid: process.env.WECHAT_USER_OPENID || "",
    baseUrl: "https://api.weixin.qq.com",
  };
}

export async function POST() {
  const config = getWechatConfig();

  // 校验配置完整性
  const missing: string[] = [];
  if (!config.appId) missing.push("WECHAT_APP_ID");
  if (!config.appSecret) missing.push("WECHAT_APP_SECRET");
  if (!config.templateId) missing.push("WECHAT_TEMPLATE_ID");
  if (!config.openid) missing.push("WECHAT_USER_OPENID");

  if (missing.length > 0) {
    return NextResponse.json(
      { success: false, error: `缺少环境变量: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    // 1. 获取 access_token
    const tokenRes = await fetch(
      `${config.baseUrl}/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`,
    );

    if (!tokenRes.ok) {
      return NextResponse.json(
        { success: false, error: `获取 access_token 失败: HTTP ${tokenRes.status}` },
        { status: 502 },
      );
    }

    const tokenData = await tokenRes.json();

    if (tokenData.errcode) {
      return NextResponse.json(
        {
          success: false,
          error: `获取 access_token 失败: [${tokenData.errcode}] ${tokenData.errmsg}`,
        },
        { status: 502 },
      );
    }

    const accessToken = tokenData.access_token;

    // 2. 发送模板消息
    const now = new Date();
    const timeStr = now.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const dateStr = now.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    const message = {
      touser: config.openid,
      template_id: config.templateId,
      data: {
        first: {
          value: "这是一条来自「今天你保健了没」的即时测试消息",
          color: "#059669",
        },
        keyword1: {
          value: "维生素 D3、鱼油 Omega-3、镁片",
          color: "#111827",
        },
        keyword2: {
          value: `测试发送时间：${dateStr} ${timeStr}`,
          color: "#6b7280",
        },
        remark: {
          value: "✅ 如果你收到这条消息，说明微信推送配置成功！",
          color: "#059669",
        },
      },
    };

    const pushRes = await fetch(
      `${config.baseUrl}/cgi-bin/message/template/send?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      },
    );

    if (!pushRes.ok) {
      return NextResponse.json(
        { success: false, error: `发送模板消息失败: HTTP ${pushRes.status}` },
        { status: 502 },
      );
    }

    const pushData = await pushRes.json();

    if (pushData.errcode !== 0) {
      return NextResponse.json(
        {
          success: false,
          error: `发送失败: [${pushData.errcode}] ${pushData.errmsg}`,
          detail: pushData,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `测试消息已发送至 ${config.openid}，请检查微信服务通知`,
      detail: {
        msgid: pushData.msgid,
        time: timeStr,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { success: false, error: `请求微信服务器异常: ${message}` },
      { status: 500 },
    );
  }
}
