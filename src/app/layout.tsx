import type { Metadata, Viewport } from "next";
import PwaRegistration from "@/components/pwa/PwaRegistration";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 适老化：允许用户双指缩放，不限制最大倍数
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#059669",
};

export const metadata: Metadata = {
  title: "今天你保健了没？",
  description: "智能保健品服用提醒，AI 分析成分与服用方式，定时提醒不遗漏",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "保健提醒",
    startupImage: ["/icon-512.png"],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
