// Chromium 全系浏览器支持 vibrate、actions、silent，但 TypeScript DOM 类型定义尚未收录
// 通过 declaration merging 为 NotificationOptions 补充缺失字段
interface NotificationOptions {
  vibrate?: number[];
  actions?: NotificationAction[];
  silent?: boolean;
}
