"use client";

import { useState, useRef, type DragEvent } from "react";
import type { InputMode } from "@/lib/types";

interface SupplementInputProps {
  onSubmit: (mode: InputMode, data: string, file?: File) => void;
  disabled?: boolean;
}

const TAB_CONFIG: { mode: InputMode; label: string; icon: string }[] = [
  { mode: "photo", label: "拍照识别", icon: "📷" },
  { mode: "link", label: "链接解析", icon: "🔗" },
  { mode: "text", label: "文字输入", icon: "✏️" },
];

export default function SupplementInput({ onSubmit, disabled }: SupplementInputProps) {
  const [mode, setMode] = useState<InputMode>("photo");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.type.startsWith("image/")) return;
    const url = URL.createObjectURL(f);
    // 先释放旧的 blob URL
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(url);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files);
  }

  function handleSubmit() {
    if (disabled) return;
    if (mode === "photo" && preview && file) {
      onSubmit("photo", preview, file);
    } else if (mode === "link" && link.trim()) {
      onSubmit("link", link.trim());
    } else if (mode === "text" && text.trim()) {
      onSubmit("text", text.trim());
    }
  }

  function switchMode(m: InputMode) {
    setMode(m);
    // 切换模式时不清除已有数据，保留各模式输入
  }

  const canSubmit =
    !disabled &&
    ((mode === "photo" && preview !== null && file !== null) ||
      (mode === "link" && link.trim().length > 0) ||
      (mode === "text" && text.trim().length > 0));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      {/* header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 border-b border-zinc-100">
        <h2 className="text-xl font-bold text-zinc-900">添加保健品</h2>
        <p className="text-sm text-zinc-600 mt-1">
          拍照就能添加，也可以粘贴链接或输入文字
        </p>
      </div>

      {/* tabs */}
      <div className="flex border-b-2 border-zinc-100">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => switchMode(tab.mode)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-base font-bold transition-all ${
              mode === tab.mode
                ? "border-b-4 border-emerald-500 text-emerald-700 bg-emerald-50/50"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* content */}
      <div className="p-5">
        {/* photo mode */}
        {mode === "photo" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all ${
              disabled
                ? "opacity-50 pointer-events-none border-zinc-200"
                : dragOver
                  ? "border-emerald-400 bg-emerald-50"
                  : preview
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files)}
            />

            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 rounded-lg shadow-md"
                />
                <span className="text-sm text-zinc-500">
                  点击重新选择图片
                </span>
              </div>
            ) : (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
                  📸
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-zinc-800">
                    点击这里拍照
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    也可以从相册选择保健品照片
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* link mode */}
        {mode === "link" && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <input
                type="url"
                placeholder="粘贴购物链接或产品页面链接..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={disabled}
                className="w-full rounded-xl border-2 border-zinc-300 bg-zinc-50 px-4 py-4 pl-12 text-base outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xl">
                🔗
              </span>
            </div>
            <p className="text-sm text-zinc-500">
              支持淘宝、京东、iHerb 等主流电商平台的产品链接
            </p>
          </div>
        )}

        {/* text mode */}
        {mode === "text" && (
          <div className="flex flex-col gap-3">
            <textarea
              placeholder="输入保健品名称、成分或描述，例如：&#10;&#10;Now Foods 维生素D3 1000IU，每天1粒，随餐服用..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={disabled}
              rows={4}
              className="w-full rounded-xl border-2 border-zinc-300 bg-zinc-50 px-4 py-4 text-base outline-none resize-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
            />
            <p className="text-sm text-zinc-500">
              尽可能详细描述，以获取更准确的服用建议
            </p>
          </div>
        )}

        {/* submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`mt-4 w-full rounded-xl py-4 text-lg font-bold transition-all active:scale-[0.98] ${
            disabled
              ? "bg-zinc-100 text-zinc-400 cursor-wait"
              : canSubmit
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200"
                : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          }`}
        >
          {disabled ? "⏳ AI 分析中，请稍等..." : "🔍 开始分析"}
        </button>
      </div>
    </div>
  );
}
