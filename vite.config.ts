import { cp, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));
const previewMediaFolders = [
  "prologue",
  "act-01",
  "act-02",
  "act-03",
  "act-04",
  "act-05",
  "endings",
  "runtime-references"
];

function runtimePlanModule() {
  const virtualId = "virtual:runtime-plan";
  const resolvedId = `\0${virtualId}`;
  return {
    name: "runtime-plan-module",
    resolveId(id: string) {
      return id === virtualId ? resolvedId : undefined;
    },
    async load(id: string) {
      if (id !== resolvedId) return undefined;
      const source = await readFile(path.join(root, "server", "index.mjs"), "utf8");
      const constantsStart = source.indexOf("const linLanVoiceConstraint");
      const constantsEnd = source.indexOf("await fsp.mkdir", constantsStart);
      const planStart = source.indexOf("function buildRuntimePlan");
      const planEnd = source.indexOf("function extractVideoUrl", planStart);
      if ([constantsStart, constantsEnd, planStart, planEnd].some((position) => position < 0)) {
        throw new Error("Unable to extract the Runtime plan from server/index.mjs");
      }
      const constants = source.slice(constantsStart, constantsEnd);
      const planFunctions = source.slice(planStart, planEnd);
      return `
import { buildDialogueMessages, parseDialogueResponse, composeDialoguePlan, supportsDialogue } from "${path.join(root, 'server/dialogue-core.mjs').replace(/\\/g, '/')}";
export { buildDialogueMessages, parseDialogueResponse, supportsDialogue };
const mediaRoot = "/media";
const path = { join: (...parts) => parts.join("/").replace(/\\\\/g, "/") };
${constants}
${planFunctions}
export function buildBrowserRuntimePlan(input, decision) {
  if (supportsDialogue(input.promptId) && !decision) throw new Error("自由对话必须先完成AI推理。");
  const voice = input.promptId === "RT-03" ? linQiuVoiceConstraint
    : input.promptId === "RT-02B" ? futureLinLanVoiceConstraint : linLanVoiceConstraint;
  const plan = decision ? composeDialoguePlan(input, decision, buildRuntimePlan, buildConversationalResponsePlan, voice) : buildRuntimePlan(input);
  return {
    advance: plan.advance,
    dialogueSource: plan.dialogueSource,
    dialogueModel: plan.dialogueModel,
    knowledgeVersion: plan.knowledgeVersion,
    intent: plan.intent,
    reply: plan.reply,
    duration: plan.duration || 5,
    prompt: [
      h3UnifiedStyleConstraint,
      "【世界观、身份、镜头与首尾帧硬锁】",
      plan.prompt,
      \`【时长说明】本镜头完整时长为\${plan.duration || 5}秒，所有动作与对白必须在该时长内完成。\`,
      "【统一负面约束】禁止背景音乐、字幕、对白文字、弹幕气泡、用户名、头像、按钮、平台UI、录制标记、Logo、水印、额外可读文字、写实真人、精致3D、二次元、日漫赛璐璐、人物换脸、空间重构、无来源切镜和新增角色。",
      "【最终画面锁】首帧严格对齐所给首帧图，尾帧严格对齐所给尾帧图，中间只做连续插值；画幅与首尾帧一致，保持原创二维手绘低饱和中国都市民俗悬疑画风。成片不得包含BGM，文字、HUD与按钮只由游戏UI绘制。"
    ].join("\\n\\n"),
    referenceUrl: plan.referencePath
  };
}
`;
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    runtimePlanModule(),
    {
      name: "bundle-game-media",
      apply: "build",
      async closeBundle() {
        const mediaOutput = path.join(root, "dist", "media");
        await mkdir(mediaOutput, { recursive: true });
        await Promise.all(
          previewMediaFolders.map((folder) =>
            cp(
              path.join(root, "assets", "videos", folder),
              path.join(mediaOutput, folder),
              { recursive: true, force: true }
            )
          )
        );
        await cp(path.join(root, "assets", "audio"), path.join(root, "dist", "audio"), {
          recursive: true,
          force: true
        });
        await cp(path.join(root, "landing.html"), path.join(root, "dist", "landing.html"));
      }
    }
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
    watch: {
      ignored: ["**/.tmp/**"]
    },
    proxy: {
      "/api": "http://127.0.0.1:8797",
      "/media": "http://127.0.0.1:8797",
      "/audio": "http://127.0.0.1:8797",
      "/generated": "http://127.0.0.1:8797"
    }
  },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        game: path.join(root, "index.html"),
        narrative: path.join(root, "narrative.html")
      }
    }
  }
});
