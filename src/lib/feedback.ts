// ---- 适老化操作反馈：提示音 + 震动 + 语音播报 ----
//
// 关键操作（如打卡）通过三个通道同时反馈，避免老人漏看屏幕变化：
// 1. 震动（支持的移动设备）
// 2. 提示音（Web Audio，无需音频文件，上扬双音=成功）
// 3. 语音播报（SpeechSynthesis，zh-CN，语速放慢）

let audioCtx: AudioContext | null = null;

/** 播放简短提示音：一串正弦音，逐个上扬 */
function beep(freqs: number[], duration = 0.12) {
  try {
    if (typeof window === "undefined") return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx ?? new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume();

    let t = audioCtx.currentTime;
    for (const f of freqs) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.05);
      t += duration + 0.05;
    }
  } catch {
    // 音频失败不影响主流程
  }
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // 忽略不支持的设备
  }
}

function speak(text: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 0.85; // 语速放慢，方便听清
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {
    // 忽略
  }
}

/** 打卡成功反馈：震动 + 上扬双音 + 语音确认 */
export function feedbackTaken(supplementName?: string) {
  vibrate([120, 60, 120]);
  beep([784, 1047]); // G5 → C6，上扬听起来是"成功"
  speak(
    supplementName
      ? `已记录，${supplementName}，已服用`
      : "已记录，已服用",
  );
}

/** 一般操作反馈：轻震动 + 短音 + 语音说明 */
export function feedbackInfo(message: string) {
  vibrate(60);
  beep([659], 0.1);
  speak(message);
}

/** 分析完成反馈 */
export function feedbackAnalysisDone(supplementName: string) {
  vibrate([80, 50, 80]);
  beep([523, 659, 784]);
  speak(`分析完成，${supplementName}，已加入今日提醒`);
}

/** 出错反馈：下沉音 + 语音说明 */
export function feedbackError(message: string) {
  vibrate([200]);
  beep([392, 311], 0.15);
  speak(`出错了，${message}`);
}
