// ---- 微信订阅号消息推送 ----
//
// 接入流程：
// 1. 在 mp.weixin.qq.com 注册微信服务号/订阅号
// 2. 在「开发 → 基本配置」获取 AppID / AppSecret
// 3. 在「功能 → 模板消息」申请模板消息权限和模板 ID
// 4. 用户关注公众号后，通过网页授权获取 openid
// 5. 填写下方 WECHAT_CONFIG 即可启用真实推送
//
// 模板消息示例（需在微信后台申请）：
//   {{first.DATA}}   — "您有一条保健品服用提醒"
//   {{keyword1.DATA}} — "鱼油 Omega-3、维生素 D3"
//   {{keyword2.DATA}} — "早饭后 08:30"
//   {{remark.DATA}}  — "点击查看详情"

import type { NotificationPayload, NotificationResult } from "./types";

interface WechatAccessToken {
  token: string;
  expiresAt: number;
}

interface WechatTemplateMessage {
  touser: string;
  template_id: string;
  data: Record<string, { value: string; color?: string }>;
  url?: string;
}

// 替换为你的公众号配置即可启用真实推送
let WECHAT_CONFIG = {
  appId: "",
  appSecret: "",
  templateIds: {
    supplement_reminder: "",
  },
  baseUrl: "https://api.weixin.qq.com",
};

let cachedToken: WechatAccessToken | null = null;

export function configureWechat(config: typeof WECHAT_CONFIG) {
  WECHAT_CONFIG = config;
  cachedToken = null;
}

export function isWechatConfigured(): boolean {
  return Boolean(WECHAT_CONFIG.appId && WECHAT_CONFIG.appSecret);
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const { appId, appSecret, baseUrl } = WECHAT_CONFIG;
  const res = await fetch(
    `${baseUrl}/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`,
  );
  const data = await res.json();

  if (data.errcode) {
    throw new Error(`微信 access_token 获取失败: ${data.errmsg}`);
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

export async function sendWechatNotification(
  openid: string,
  payload: NotificationPayload,
): Promise<NotificationResult> {
  if (!isWechatConfigured()) {
    return { success: false, channel: "wechat", error: "微信未配置" };
  }

  try {
    const token = await getAccessToken();
    const templateId =
      payload.templateId ||
      WECHAT_CONFIG.templateIds.supplement_reminder ||
      "";

    const message: WechatTemplateMessage = {
      touser: openid,
      template_id: templateId,
      url: "",
      data: {
        first: {
          value: `⏰ ${payload.timeSlotLabel} — 保健品服用提醒`,
          color: "#059669",
        },
        keyword1: {
          value: payload.supplementNames.join("、"),
          color: "#111827",
        },
        keyword2: {
          value: `${payload.timeSlotLabel} ${payload.scheduledTime}`,
          color: "#6b7280",
        },
        remark: {
          value: "点击查看今日服用详情 →",
          color: "#059669",
        },
      },
    };

    const res = await fetch(
      `${WECHAT_CONFIG.baseUrl}/cgi-bin/message/template/send?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      },
    );
    const data = await res.json();

    if (data.errcode !== 0) {
      return {
        success: false,
        channel: "wechat",
        error: data.errmsg || "发送失败",
      };
    }

    return { success: true, channel: "wechat" };
  } catch (err: any) {
    return { success: false, channel: "wechat", error: err.message };
  }
}
