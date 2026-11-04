/**
 * 玩家昵称和弹幕的文本审核。
 *
 * 造化宿主如果明确返回通过或拒绝，以宿主结果为准。
 * 本地预览、宿主没有实现审核、请求超时或接口失败时放行。
 * 这些情况不是内容违规，不能把正常名字和弹幕卡死。
 */

const PLAYER_NAME_SCENE = 112;
const PLAYER_TEXT_SCENE = 5014;
const BLOCKED_MESSAGE = "输入的内容不可用，请重新输入。";
const SAFETY_TIMEOUT_MS = 4000;

let hostReview: "unknown" | "live" | "absent" = "unknown";

export interface SafetyVerdict {
  allowed: boolean;
  message?: string;
}

interface SafetyResponse {
  requestId?: string;
  ok?: boolean;
  allowed?: boolean;
  message?: string;
  error?: unknown;
}

interface PlatformSafetyScenes {
  PLAYER_NAME?: number;
  AI_DIALOGUE?: number;
}

function isLocalDev() {
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
}

function sceneId(kind: "name" | "text") {
  const scenes = (window as unknown as {
    PlatformClient?: { safety?: { scenes?: PlatformSafetyScenes } };
  }).PlatformClient?.safety?.scenes;
  const fallback = kind === "name" ? PLAYER_NAME_SCENE : PLAYER_TEXT_SCENE;
  const value = kind === "name" ? scenes?.PLAYER_NAME : scenes?.AI_DIALOGUE;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function canAskHost() {
  const bridge = (window as unknown as { KubeeGameBridge?: { postMessage?: (body: string) => void } })
    .KubeeGameBridge;
  if (typeof bridge?.postMessage === "function") return true;
  return window.parent && window.parent !== window;
}

function postSafetyCheck(message: { type: string; payload: unknown }) {
  const bridge = (window as unknown as { KubeeGameBridge?: { postMessage?: (body: string) => void } })
    .KubeeGameBridge;
  if (typeof bridge?.postMessage === "function") {
    bridge.postMessage(JSON.stringify(message));
    return;
  }
  window.parent.postMessage(message, "*");
}

function askHost(scene: number, text: string) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return new Promise<SafetyResponse | "timeout">((resolve) => {
    const hostWindow = window as unknown as { __vagReceiveFromHost?: (body: unknown) => void };
    const previousReceiver = hostWindow.__vagReceiveFromHost;
    let settled = false;

    const finish = (result: SafetyResponse | "timeout") => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      hostWindow.__vagReceiveFromHost = previousReceiver;
      resolve(result);
    };

    const accept = (payload: SafetyResponse | undefined) => {
      if (payload?.requestId !== requestId) return;
      finish(payload);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source && event.source !== window.parent && event.source !== window) return;
      try {
        const data = (typeof event.data === "string" ? JSON.parse(event.data) : event.data) as {
          type?: string;
          payload?: SafetyResponse;
        } | null;
        if (data?.type !== "VAG_SAFETY_CHECK_RESPONSE") return;
        accept(data.payload);
      } catch {
        // 忽略非 JSON 消息
      }
    };

    hostWindow.__vagReceiveFromHost = (body: unknown) => {
      try {
        const message = (typeof body === "string" ? JSON.parse(body) : body) as {
          type?: string;
          payload?: SafetyResponse;
        };
        if (message?.type === "VAG_SAFETY_CHECK_RESPONSE") accept(message.payload);
      } catch {
        // 宿主回包不是 JSON 时继续交给原来的接收器。
      }
      previousReceiver?.(body);
    };

    const timer = window.setTimeout(() => finish("timeout"), SAFETY_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    postSafetyCheck({
      type: "VAG_SAFETY_CHECK",
      payload: { requestId, scene, texts: [text] }
    });
  });
}

function verdictFromHost(label: string, result: SafetyResponse | "timeout"): SafetyVerdict {
  if (result === "timeout" || result.ok !== true) {
    hostReview = "absent";
    console.warn(`[ACE] ${label}审核没有接通，放行`, result === "timeout" ? "timeout" : result.error || result.message);
    return { allowed: true };
  }
  hostReview = "live";
  if (result.allowed === true) {
    console.info(`[ACE] ${label}宿主审核通过`);
    return { allowed: true };
  }
  return { allowed: false, message: result.message?.trim() || BLOCKED_MESSAGE };
}

async function review(label: string, scene: number, text: string): Promise<SafetyVerdict> {
  const value = text.trim();
  if (!value) return { allowed: false, message: BLOCKED_MESSAGE };
  if (isLocalDev() || !canAskHost() || hostReview === "absent") return { allowed: true };
  try {
    return verdictFromHost(label, await askHost(scene, value));
  } catch (error) {
    hostReview = "absent";
    console.warn(`[ACE] ${label}审核请求异常，放行`, error);
    return { allowed: true };
  }
}

export function checkPlayerNameAllowed(name: string) {
  return review("昵称", sceneId("name"), name);
}

export function checkPlayerTextAllowed(text: string) {
  return review("弹幕", sceneId("text"), text);
}
