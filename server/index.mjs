import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import ffmpegPath from "ffmpeg-static";
import { reasonDialogue, composeDialoguePlan, supportsDialogue } from "./dialogue-planner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const runtimeFfmpegPath = ffmpegPath && fs.existsSync(ffmpegPath) ? ffmpegPath : "ffmpeg";

dotenv.config({ path: path.join(root, ".env.local"), override: true, quiet: true });
dotenv.config({ path: path.join(root, ".env") });

const app = express();
const port = Number(process.env.PORT || 8797);
const mediaRoot = path.join(root, "assets", "videos");
const audioRoot = path.join(root, "assets", "audio");
const generatedRoot = path.join(mediaRoot, "generated");
const h3BaseUrl = (process.env.H3_BASE_URL || "https://llm-proxy.forgeax.com").replace(/\/$/, "");
const h3Model = process.env.H3_MODEL || "minimax-h3-max";
const h3Duration = Number(process.env.H3_DURATION || 5);
const h3Size = process.env.H3_SIZE || "480p";
const runtimePromptRevision = "unified-painted-suspense-v23";
const supportedEvidenceTags = new Set([
  "BREAKER_MAP",
  "PROGRAM_EXTENSION",
  "TAPE_TIMECODE_2103",
  "TAPE_ABSENT_2103",
  "ZERO_CHANNEL_TRANSFER_RULE",
  "LIN_QIU_UNSENT_MESSAGE"
]);
const jobs = new Map();
const linLanVoiceConstraint = `声音角色约束：林岚的声线严格匹配预制视频，是年轻成年中国女性的自然普通话，女性偏低音区、沉稳、克制，近距离收音带极轻微沙感。这里的“沉稳”只限定基础音色，不代表情绪平淡；遇到异常时必须出现真实的短促吸气、语速加快、声音发紧、害怕或着急，情绪强度跟随剧情变化，同时不变成高音少女声。只能说下文用中文引号明确指定的中文台词，禁止朗读、翻译或复述任何提示词说明；禁止英文对白、甜美可爱、活泼撒娇、儿童声、男声、旁白和第二说话者。`;
const futureLinLanVoiceConstraint = `声音角色约束：未来林岚保持与预制视频林岚相同的偏低、沉稳年轻女性普通话声线，但更加疲惫和克制，并通过监视器扬声器呈现窄频失真。只能说下文用中文引号明确指定的中文台词，禁止朗读、翻译或复述任何提示词说明；禁止英文对白、高音少女腔、甜美撒娇、男声、旁白和第二说话者。`;
const linQiuVoiceConstraint = `林秋声音：约四十岁中国中年女性，中低音，胸腔共鸣稳定，偏冷、略疲惫和干涩，语速慢，句尾下沉。声音必须来自旧录像带和CRT单声道扬声器：窄频、高频衰减、轻微磁带嘶声和音高漂移。禁止少女声、甜美声、现代配音腔、干净录音棚声、机械TTS、男声和旁白。只说指定的一句简短中文，禁止字幕、文字、额外对白和提示词朗读。`;
const h3UnifiedStyleConstraint = `【全项目统一画风，最高优先级，不得被节点内容覆盖】
整体画风必须严格保持输入参考图和《停播之后》现有预制视频一致，使用原创二维手绘中国都市悬疑游戏视觉语言：复古诡异、压抑安静，带旧时代国产恐怖游戏的克制质感；只吸收低饱和手绘群像悬疑作品的高层视觉规律，不复制任何现成游戏的角色、具体构图、场景、UI、标识或故事元素。
场景采用低饱和灰绿、煤灰、旧米色、脏青和暗褐配色，只允许旧CRT冷灰绿荧光、锈红或少量旧灯泡暗橙作为局部异常色。避免鲜艳纯色、霓虹色和商业插画感。
人物面部必须保留轻微铅笔绘制纹理、旧纸颗粒和纸面摩擦感；轮廓线使用深棕或炭黑的自然铅笔勾线，边缘略软、有轻微手绘不均匀，不得变成干净锐利的数码线稿。
人物皮肤为中性偏灰黄的自然肤色，只有克制的哑光亮感和少量高光；不得油亮、红润、磨皮、蜡像化或出现写实毛孔。整体上色偏扁平平涂，以眼窝、鼻侧、下颌和颈部少量手绘阴影建立体积，减少复杂材质细节和写实皮肤纹理。
人物形体为半写实二维叙事角色，脸型偏窄、五官克制、动作安静；严格维持输入首帧中的年龄、脸型、发型、眼镜、服装、身体比例和人物身份，不得美型化、幼态化、网红化或擅自换脸。
场景保持20世纪末至21世纪初中国地方电视台旧公共建筑质感：老式CRT、积灰控制台、金属机柜、磨损墙面、旧日光灯、有限光区与有层次暗部；形体概括、透视稳定、空间留白明显，氛围优先于细节堆砌。
绝对禁止二次元大眼、赛璐璐、日漫风、Q版、时装插画、水彩概念图、厚涂油画、照片写实、精致3D写实CG、塑料皮肤、游戏引擎高光、电影级真人摄影、复杂PBR材质、艳丽调色和赛博朋克霓虹。
画面必须是无界面的横屏16:9手机摄像头原始输出。禁止字幕、对白文字、弹幕气泡、用户名、头像、按钮、平台UI、录制标记、Logo、水印、来源标识和任何额外可读文字。`;
const runtimePromptIds = new Set([
  "RT-00",
  "RT-01",
  "RT-02",
  "RT-02B",
  "RT-03",
  "RT-04",
  "RT-05",
  "RT-06",
  "RTE-A3-01",
  "RTE-A3-02",
  "RTE-A3-03"
]);

await fsp.mkdir(generatedRoot, { recursive: true });

app.disable("x-powered-by");
app.use((request, response, next) => {
  const origin = request.get("origin");
  if (origin && /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (request.method === "OPTIONS") return response.sendStatus(204);
  next();
});
app.use(express.json({ limit: "32kb" }));
app.use("/media", express.static(mediaRoot, { maxAge: "1h", fallthrough: false }));
app.use("/audio", express.static(audioRoot, { maxAge: "1h", fallthrough: false }));
app.use(
  "/generated",
  express.static(generatedRoot, {
    etag: false,
    fallthrough: false,
    maxAge: 0,
    setHeaders(response) {
      response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }
  })
);

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    h3Configured: Boolean(process.env.LITELLM_KEY),
    model: h3Model,
    runtimePromptRevision
  });
});

app.post("/api/videos", async (request, response) => {
  const promptId = request.body?.promptId;
  const message = typeof request.body?.message === "string" ? request.body.message.trim() : "";
  const evidenceTags = Array.isArray(request.body?.evidenceTags)
    ? request.body.evidenceTags.filter((tag) => supportedEvidenceTags.has(tag))
    : [];
  const continuityJobId =
    typeof request.body?.continuityJobId === "string" ? request.body.continuityJobId.trim() : "";

  if (!runtimePromptIds.has(promptId)) {
    return response.status(400).json({ error: "当前Demo不支持这个Runtime节点。" });
  }

  if (!message || message.length > 280) {
    return response.status(400).json({ error: "请输入1到280个字符的弹幕。" });
  }

  if (continuityJobId && !jobs.get(continuityJobId)?.outputPath) {
    return response.status(400).json({ error: "上一段Runtime尾帧不可用，无法继续生成结局。" });
  }

  if (!process.env.LITELLM_KEY) {
    return response.status(503).json({ error: "零号频道中继服务尚未接通。" });
  }

  const plan = buildRuntimePlan({
    promptId,
    message,
    evidenceTags
  });
  if (continuityJobId) plan.continuityJobId = continuityJobId;
  const id = crypto.randomUUID();
  const job = {
    id,
    promptId,
    status: "queued",
    progress: 0,
    reply: plan.reply,
    intent: plan.intent,
    referenceFrame: path.basename(plan.referencePath),
    promptRevision: runtimePromptRevision,
    createdAt: Date.now(),
    videoUrl: null,
    error: null
  };

  jobs.set(id, job);
  void runGeneration(job, plan, { promptId, message, evidenceTags, history: request.body?.history });

  return response.status(202).json(publicJob(job));
});

app.get("/api/runtime-cache/:promptId", async (request, response) => {
  const promptId = String(request.params.promptId || "").toUpperCase();
  if (promptId !== "RT-00") {
    return response.status(400).json({ error: "当前交互点不能安全复用历史视频。" });
  }

  const filenamePrefix = `${promptId.toLowerCase()}-`;
  const entries = await fsp.readdir(generatedRoot, { withFileTypes: true });
  const candidates = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.startsWith(filenamePrefix) &&
          entry.name.endsWith(".mp4") &&
          !entry.name.endsWith(".source.mp4")
      )
      .map(async (entry) => ({
        filename: entry.name,
        modifiedAt: (await fsp.stat(path.join(generatedRoot, entry.name))).mtimeMs
      }))
  );
  candidates.sort((left, right) => right.modifiedAt - left.modifiedAt);

  const latest = candidates[0];
  if (!latest) {
    return response.status(404).json({ error: "当前交互点没有找到之前成功生成的视频。" });
  }

  return response.json({
    id: `cache:${latest.filename}`,
    promptId,
    status: "completed",
    progress: 100,
    reply: "",
    intent: "",
    videoUrl: `/generated/${encodeURIComponent(latest.filename)}`,
    cached: true
  });
});

app.get("/api/videos/:id", (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job) {
    return response.status(404).json({ error: "没有找到这次Runtime生成任务。" });
  }
  return response.json(publicJob(job));
});

if (fs.existsSync(path.join(root, "dist"))) {
  app.use(express.static(path.join(root, "dist")));
  app.use((_request, response) => response.sendFile(path.join(root, "dist", "index.html")));
}

app.listen(port, "127.0.0.1", () => {
  console.log(`Channel Zero server listening on http://127.0.0.1:${port}`);
});

function publicJob(job) {
  return {
    id: job.id,
    promptId: job.promptId,
    status: job.status,
    progress: job.progress,
    reply: job.reply,
    intent: job.intent,
    referenceFrame: job.referenceFrame,
    promptRevision: job.promptRevision,
    videoUrl: job.videoUrl,
    error: job.error
    ,phase: job.phase,
    advance: job.advance,
    dialogueSource: job.dialogueSource,
    dialogueModel: job.dialogueModel,
    knowledgeVersion: job.knowledgeVersion
  };
}

async function runGeneration(job, plan, input) {
  let continuityFramePath = null;
  try {
    if (supportsDialogue(input.promptId)) {
      job.status = "submitting";
      job.phase = "reasoning";
      job.reply = "";
      job.intent = "";
      const decision = await reasonDialogue(input);
      const voice = input.promptId === "RT-03" ? linQiuVoiceConstraint
        : input.promptId === "RT-02B" ? futureLinLanVoiceConstraint : linLanVoiceConstraint;
      plan = composeDialoguePlan(input, decision, buildRuntimePlan, buildConversationalResponsePlan, voice);
      Object.assign(job, { reply: plan.reply, intent: plan.intent, advance: plan.advance,
        dialogueSource: plan.dialogueSource, dialogueModel: plan.dialogueModel,
        knowledgeVersion: plan.knowledgeVersion, referenceFrame: path.basename(plan.referencePath) });
    }
    job.phase = "video";
    if (plan.continuityJobId) {
      const previousJob = jobs.get(plan.continuityJobId);
      continuityFramePath = path.join(generatedRoot, `.continuity-${job.id}.jpg`);
      await extractLastVideoFrame(previousJob.outputPath, continuityFramePath);
      plan = { ...plan, referencePath: continuityFramePath };
      job.referenceFrame = path.basename(continuityFramePath);
    }
    job.status = "submitting";
    job.progress = 8;
    const result = await submitH3(plan);

    if (result.videoBuffer) {
      await finishWithBuffer(job, result.videoBuffer, plan);
      return;
    }

    if (result.videoUrl) {
      job.status = "downloading";
      job.progress = 92;
      await finishWithBuffer(job, await downloadVideo(result.videoUrl), plan);
      return;
    }

    if (!result.id) {
      throw new Error("H3响应中没有视频地址或任务ID。");
    }

    job.status = "generating";
    job.progress = Math.max(12, result.progress || 12);
    await pollH3(job, result.id, plan);
  } catch (error) {
    console.error(`[${job.promptId}] Runtime generation failed:`, readableError(error));
    job.status = "failed";
    job.error = job.phase === "reasoning"
      ? "剧情AI回复生成失败，请重试；本次没有使用预设回复或提交视频生成。"
      : "实时视频生成失败，请重新发送。";
  } finally {
    if (continuityFramePath) {
      await fsp.rm(continuityFramePath, { force: true }).catch(() => undefined);
    }
  }
}

async function submitH3(plan) {
  const referenceBytes = await fsp.readFile(plan.referencePath);
  const dataUrl = `data:image/jpeg;base64,${referenceBytes.toString("base64")}`;
  const jsonResponse = await fetch(`${h3BaseUrl}/v1/videos`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: h3Model,
      prompt: `${h3UnifiedStyleConstraint}\n\n【当前节点动作与连续性】\n${plan.prompt}\n\n【再次确认】\n统一二维手绘低饱和悬疑画风与输入首帧连续性高于一切；禁止写实真人、精致3D、二次元、赛璐璐、日漫风、字幕、弹幕、气泡和平台UI。`,
      duration: plan.duration || h3Duration,
      size: h3Size,
      first_frame: dataUrl
    })
  });

  if (!jsonResponse.ok) {
    throw await upstreamError(jsonResponse);
  }

  return parseVideoResponse(jsonResponse);
}

async function parseVideoResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("video/") || contentType.includes("octet-stream")) {
    return { videoBuffer: Buffer.from(await response.arrayBuffer()) };
  }

  const payload = await response.json();
  const base64 = payload?.data?.[0]?.b64_json || payload?.b64_json;
  if (base64) {
    return { videoBuffer: Buffer.from(base64, "base64") };
  }

  return {
    id: payload?.id || payload?.task_id || payload?.video_id,
    status: normalizeStatus(payload?.status || payload?.task?.status),
    progress: Number(payload?.progress || payload?.task?.progress || 0),
    videoUrl: extractVideoUrl(payload)
  };
}

async function pollH3(job, upstreamId, plan) {
  const deadline = Date.now() + 10 * 60 * 1000;

  while (Date.now() < deadline) {
    await delay(3000);
    const response = await fetch(`${h3BaseUrl}/v1/videos/${encodeURIComponent(upstreamId)}`, {
      headers: authHeaders()
    });

    if (!response.ok) {
      throw await upstreamError(response);
    }

    const payload = await response.json();
    const status = normalizeStatus(payload?.status || payload?.task?.status);
    const progress = Number(payload?.progress || payload?.task?.progress || job.progress + 4);
    job.progress = Math.min(90, Math.max(job.progress, progress));

    if (status === "failed") {
      throw new Error(payload?.error?.message || payload?.error || "H3视频生成失败。");
    }

    const videoUrl = extractVideoUrl(payload);
    if (videoUrl) {
      job.status = "downloading";
      job.progress = 92;
      await finishWithBuffer(job, await downloadVideo(videoUrl), plan);
      return;
    }

    if (status === "completed") {
      const contentResponse = await fetch(
        `${h3BaseUrl}/v1/videos/${encodeURIComponent(upstreamId)}/content`,
        { headers: authHeaders() }
      );
      if (!contentResponse.ok) {
        throw await upstreamError(contentResponse);
      }
      await finishWithBuffer(job, Buffer.from(await contentResponse.arrayBuffer()), plan);
      return;
    }
  }

  throw new Error("H3生成超过10分钟，任务已停止等待。");
}

async function finishWithBuffer(job, buffer, plan) {
  if (buffer.length < 1024) {
    throw new Error("H3返回的视频文件为空或不完整。");
  }
  const filename = `${job.promptId.toLowerCase()}-${job.id}.mp4`;
  const outputPath = path.join(generatedRoot, filename);
  const sourcePath = path.join(generatedRoot, `${job.promptId.toLowerCase()}-${job.id}.source.mp4`);
  await fsp.writeFile(sourcePath, buffer);
  await assertNativeAudio(sourcePath);
  await normalizeRuntimeVideo(sourcePath, outputPath, plan);
  await fsp.rm(sourcePath, { force: true });
  job.outputPath = outputPath;
  job.videoUrl = `/generated/${filename}`;
  job.progress = 100;
  job.status = "completed";
}

async function extractLastVideoFrame(inputPath, outputPath) {
  await new Promise((resolve, reject) => {
    const child = spawn(runtimeFfmpegPath, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-sseof",
      "-0.12",
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      outputPath
    ]);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`无法提取上一段Runtime尾帧：${stderr.slice(-300)}`));
    });
  });
}

async function assertNativeAudio(sourcePath) {
  await new Promise((resolve, reject) => {
    const child = spawn(runtimeFfmpegPath, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      sourcePath,
      "-map",
      "0:a:0",
      "-t",
      "0.1",
      "-f",
      "null",
      "-"
    ]);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`H3返回的视频没有原生音轨：${stderr.slice(-300)}`));
    });
  });
}

async function normalizeRuntimeVideo(sourcePath, outputPath, plan) {
  await new Promise((resolve, reject) => {
    const subtitleMask = plan?.subtitleMask || { x: 290, y: 630, width: 700, height: 90 };
    const baseArgs = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      sourcePath
    ];
    const videoArgs = plan?.lockVisualToReference
      ? [
          "-loop",
          "1",
          "-i",
          plan.referencePath,
          "-filter_complex",
          `[1:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.00012,1.012)':d=1:s=1280x720:fps=24[outv]`,
          "-map",
          "[outv]",
          "-map",
          "0:a:0",
          "-t",
          String(plan.duration || h3Duration)
        ]
      : plan?.maskSubtitleBand
      ? [
          "-loop",
          "1",
          "-i",
          plan.referencePath,
          "-filter_complex",
          `[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[main];[1:v]scale=1280:720,crop=${subtitleMask.width}:${subtitleMask.height}:${subtitleMask.x}:${subtitleMask.y}[band];[main][band]overlay=${subtitleMask.x}:${subtitleMask.y}:shortest=1[outv]`,
          "-map",
          "[outv]",
          "-map",
          "0:a:0"
        ]
      : [
          "-map",
          "0:v:0",
          "-map",
          "0:a:0",
          "-vf",
          "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720"
        ];
    const audioArgs = plan?.tapeAudio
      ? [
          "-af",
          "highpass=f=180,lowpass=f=3400,acompressor=threshold=-18dB:ratio=2.5:attack=12:release=180,vibrato=f=0.7:d=0.025,volume=0.95"
        ]
      : [];
    const child = spawn(runtimeFfmpegPath, [
      ...baseArgs,
      ...videoArgs,
      ...audioArgs,
      "-r",
      "24",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      outputPath
    ]);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Runtime视频规格化失败：${stderr.slice(-500)}`));
    });
  });
}

async function downloadVideo(url) {
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("H3返回了不支持的视频地址。");
  }
  const response = await fetch(parsed);
  if (!response.ok) {
    throw new Error(`下载H3视频失败：${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function buildRuntimePlan({ promptId, message, evidenceTags = [] }) {
  const style = `以本次输入首帧为绝对空间与构图基准，严格保持首帧中的房间、门洞、墙面、家具、旧电视、灯具及其相对位置，不得改造场景。原创复古中国都市悬疑游戏视觉，诡异、压抑、安静，整体低饱和暗绿、灰褐、旧黄色调，保留自然铅笔勾线、纸面摩擦感、克制平涂和少量手绘明暗。真实横屏16:9手机直播拍摄逻辑，镜头变化只能来自手机持有者的自然手持动作。禁止二次元、日漫、赛璐璐、塑料质感、精致3D写实CG、第三人称摄影机、夸张电影运镜、血腥、怪物、攻击、可读文字、水印和额外UI。`;
  const lobbyAnchor = `当前首帧是青河电视台旧走廊大厅，必须保持尽头墙面的青河电视台旧字与台标、黑屏CRT电视、右侧楼梯、两侧门洞和头顶日光灯位置一致。`;
  const characterStyle = `林岚的短黑色直发、齐刘海、圆框眼镜、面部比例、服装和背包肩带与参考图完全一致；人物肤色中性略灰黄，不偏红、不偏橙，面部保留轻微铅笔纹理，皮肤只有克制哑光亮感。`;
  const socialCategory = classifyConversationalDetour(promptId, message);
  if (socialCategory) {
    return buildConversationalResponsePlan(promptId, message, socialCategory);
  }

  if (promptId === "RT-00") {
    const intent = classifyAlert(message);
    const reply =
      intent === "DIRECT_ALERT"
        ? "背后的电视？……等一下。"
        : intent === "URGENT_LEAVE"
          ? "跑？到底怎么了……你看见什么了？"
        : intent === "AVOID_LOOKING"
          ? "为什么不能回头？你看到什么了？"
          : "我看到你的弹幕了……等等，后面怎么亮了？";
    const action = `整段是林岚手机前置摄像头拍摄的稳定自拍原始画面，镜头位置、暗曝光和参考图完全一致。手机本体、手机边缘、双手和手指始终完全在画框之外，尤其禁止在画面下沿出现任何手持设备。不切换摄像头，不改变机位，不出现旁观者视角。林岚先直接注视镜头，像是刚理解了一条重要信息；她在意识到身后异常时先短促吸气，声音从疑惑迅速变为紧张发紧，用普通话说“${reply}”，后半句语速略快，口型与原生语音精确同步，禁止平静播报。她的表情从疑惑变为警觉，身体僵住半秒，然后只把眼睛缓慢移向自己身后亮起的旧电视，最后轻微侧头，但不离开前置自拍构图。画面必须是无UI的干净手机摄像头画面：绝对禁止字幕、对白气泡、名字标签、头像、弹幕、按钮、录制标记和任何可读文字叠层。玩家表达的意思是“${sanitizeForPrompt(message)}”，只用于决定林岚的警觉程度，不得将这句话显示在画面里。${linLanVoiceConstraint} 声音必须与画面由H3在同一次生成中原生合成并封装进视频。声音内容：安静废弃大厅的低沉室内底噪、旧电视微弱电流声，以及林岚贴近手机收音的普通话“${reply}”；语音清晰、情绪紧张，口型同步；不要背景音乐。`;
    return {
      intent,
      reply,
      prompt: `${style}\n${lobbyAnchor}\n${characterStyle}\n\n${action}`,
      referencePath: path.join(mediaRoot, "runtime-references", "RT-00-continuity-from-SYS-A1-00.jpg")
    };
  }

  if (promptId === "RT-02") {
    return buildVerificationPlan(message, evidenceTags);
  }

  if (promptId === "RT-02B") {
    return buildIdentityReplyPlan(message);
  }

  if (promptId === "RT-03") {
    return buildMotherReplyPlan(message);
  }

  if (promptId === "RT-04") {
    return buildUnsentMessagePlan(evidenceTags);
  }

  if (promptId === "RT-05") {
    return buildBeliefReplyPlan(message);
  }

  if (promptId === "RT-06") {
    return buildFinalDecisionPlan(message);
  }

  if (promptId === "RTE-A3-01") {
    return buildPastEchoPlan(message);
  }

  if (promptId === "RTE-A3-02") {
    return buildChairDirectionPlan();
  }

  if (promptId === "RTE-A3-03") {
    return buildA3IncidentReactionPlan();
  }

  const direction = classifyDirection(message);
  const replyByDirection = {
    CONTROL_ROOM: "好，先去控制室。你别断线。",
    STUDIO: "这根线连着控制室……演播厅先不进了，还是先查控制室。",
    LOBBY: "电视机好像没问题，我去控制室看看。",
    LEAVE: "好，我听你的。现在就走。",
    OTHER: "我没听明白……你想让我先做什么？"
  };
  const routeActionByDirection = {
    CONTROL_ROOM:
      "开头清楚建立正前方关闭的控制室门，随后立即持续向前走到门外半米处。门框明显变大，地面和墙体产生连续视差。最后两秒停稳并听见门后低沉电流声；不推门、不进入，把开门留给下一条PRE视频。",
    STUDIO:
      "第0秒必须逐像素延续首帧中的演播厅玻璃门入口，十秒全程发生在这个入口及相连的同一条走廊，绝不进入演播厅内部，绝不切到新房间。0至2秒只向演播厅门靠近两小步；2至5秒手机在原地缓慢低头，清楚发现一根老旧黑色同轴电缆从演播厅门缝下伸出；5至7秒镜头沿电缆连续平移，明确拍到它沿同一面墙接向控制室方向；7至10秒林岚立刻回头，手机随身体完成一次连续转身，沿原路向控制室门走两三步并把控制室门置于画面正前方。最后一秒手伸向控制室门把，准备接入下一条控制室PRE镜头。禁止跳切、瞬移、穿门、无来源转场、旧报幕、人物出现或新增走廊。",
    LOBBY:
      "第0秒必须逐像素延续首帧中的旧走廊大厅：正前方黑屏老式CRT电视、墙面青河电视台旧字与台标、右侧楼梯、两侧门洞、头顶日光灯和反光地面的位置全程不变。0至4秒沿走廊持续向CRT电视走近，电视自然变大，地面与两侧门框产生真实连续视差；4至6.5秒在电视前停下，只做一次小幅左右检查，电视始终黑屏、没有人影、没有异常节目，不拔电源、不增加线缆；6.5至10秒林岚说完判断后立即回头，手机随身体连续转向控制室方向并快步走向控制室门，最后一秒手伸向门把，准备接入下一条控制室PRE镜头。禁止改变走廊布局、切到室外或陌生房间、瞬移、跳切、电视亮起或新增人物。",
    LEAVE:
      "第0秒逐像素延续首帧中的林岚前置近景。她先对镜头说出决定，约1秒后自然翻到后置摄像头，立即转向出口并连续走出电视台，清楚越过室内外门槛进入安全空地。最后两秒再次翻到前置自拍，确认身后的电视台已经拉开距离；绝不能返回室内。",
    OTHER:
      "第0秒逐像素延续首帧中的林岚前置近景，十秒内保持同一自拍机位。林岚紧张地看一眼画外走廊后重新看向镜头，不选择房间、不向任何方向前进，请求玩家把最重要的行动再说清楚。"
  };
  const routeDeliveryByDirection = {
    CONTROL_ROOM: "林岚压低声音但脚步和语速明显加快，表现出警惕与着急，不是平静导览。",
    STUDIO: "发现线缆时先短促吸气，确认它通向控制室后语速加快，带着害怕却强迫自己作出决定。",
    LOBBY: "检查电视时仍在克制呼吸；确认没有异常后语气不是放松，而是困惑转为不安，最后一句明显着急。",
    LEAVE: "声音发紧、呼吸急促，决定离开时语速快且带真实害怕，但不尖叫。",
    OTHER: "语气犹豫而焦虑，像担心停留太久会出事，不得平铺直叙。"
  };
  const reply = replyByDirection[direction];
  const cameraRule =
    direction === "LEAVE"
      ? "横屏16:9手机直播原始画面从前置自拍开始，中段只翻到一次后置执行离开，结尾再翻回前置；每次切换允许一次短黑帧和曝光调整。"
      : direction === "OTHER"
        ? "整段保持横屏16:9手机前置自拍，林岚头肩近景与首帧完全一致，不切换摄像头。"
        : "整段保持横屏16:9手机后置摄像头第一人称原始画面。";
  const presenceRule =
    direction === "LEAVE"
      ? "前置段只出现林岚本人；后置行走段禁止人物、脸、身体、影子或倒影进入画面。"
      : direction === "OTHER"
        ? "画面只出现林岚本人，不出现第二个人、影子或倒影。"
        : "除最后伸向门把的一只手外，禁止人物、脸、身体、影子或倒影进入画面。";
  const action = `这是唯一一条路线实时视频，十秒内完成路线选择、短暂检查和返回控制室的决定，后续不得再追加路线视频。${cameraRule}记录设备本体始终在画框外。${routeActionByDirection[direction]} 玩家原话的意思是“${sanitizeForPrompt(message)}”，只用于确定路线，不得显示成文字。情绪表演：${routeDeliveryByDirection[direction]} ${direction === "OTHER" ? "林岚面对镜头" : direction === "LEAVE" ? "林岚在前置段面对镜头" : "林岚在镜头外"}说且只能说这句中文台词：“${reply}”。${presenceRule}禁止第三人称视角、无来源切镜、瞬移和新增房间。${linLanVoiceConstraint} 声音必须与画面由H3在同一次生成中原生合成并封装进视频。声音内容：与画面同步的脚步、衣料、年轻女性呼吸、旧设备电流和空间混响；离开路线另有微弱夜风；不要背景音乐。`;
  const routeReferenceName =
    direction === "CONTROL_ROOM"
      ? "RT-01-route-control-room-from-PRE-A1-05.jpg"
      : direction === "STUDIO"
        ? "RT-01-route-studio-from-PRE-A1-05.jpg"
        : direction === "LOBBY"
          ? "RT-01-route-lobby-from-PRE-G01.jpg"
          : "RT-01-continuity-from-INS-A1-06G.jpg";

  return {
    intent: direction,
    reply,
    duration: 10,
    prompt: `${style}\n\n${action}`,
    referencePath: path.join(
      mediaRoot,
      "runtime-references",
      routeReferenceName
    )
  };
}

function buildVerificationPlan(message, evidenceTags = []) {
  const hasBreakerMap = evidenceTags.includes("BREAKER_MAP");
  const intent = hasBreakerMap ? "CUT_POWER" : classifyVerification(message);
  const replyByIntent = {
    CHECK_TIMECODE: "它先动了……这不是普通录像。",
    COMPARE_FEED: "两块屏幕不是同一个时间……十三号在提前播放。",
    CUT_POWER: "怎么断电了屏幕依旧亮着！",
    WAIT_AND_WATCH: "我一直没动……是她自己先动的。她不是在模仿我。",
    DISOBEY: "我故意没照她的动作做……她还在继续。她知道我在看。",
    OTHER_FEASIBLE: "它在跟着我们的验证方法改变画面。"
  };
  const deliveryByIntent = {
    CHECK_TIMECODE:
      "现实林岚先压着声音确认动作先后，发现屏幕抢先后呼吸停顿半拍，后半句明显加重；保持偏低声线，但不能平淡。",
    COMPARE_FEED:
      "现实林岚快速来回确认两块屏幕，语速从谨慎转为急促，第二句带压不住的紧张；保持年轻女性偏低声线。",
    CUT_POWER:
      "现实林岚看到断电后十三号仍亮时明显受惊：先短促吸气，语速突然加快，音量比平时抬高一档，尾音带真实害怕和难以置信，但仍是女性偏低声线；未来林岚则冷静、低沉、疲惫，形成强烈反差。",
    WAIT_AND_WATCH:
      "现实林岚开头压低声音，发现自己没动而屏幕人物自行行动后呼吸变紧，最后一句带逐渐升高的恐惧；不能从头到尾平铺直叙。",
    DISOBEY:
      "现实林岚先带试探和戒备，屏幕人物回看时声音明显发紧，最后一句放轻但更害怕，像担心被屏幕听见；不能冷静播报。",
    OTHER_FEASIBLE:
      "现实林岚先专注执行，异常出现时语速加快并带困惑和警觉；保持偏低声线，但表演必须有情绪转折。"
  };
  const dialogueByIntent = {
    CHECK_TIMECODE: `现实林岚画外音：“${replyByIntent.CHECK_TIMECODE}”`,
    COMPARE_FEED: `现实林岚画外音：“${replyByIntent.COMPARE_FEED}”`,
    CUT_POWER:
      "对白一，现实林岚在手机后方：“怎么断电了屏幕依旧亮着！” 对白二，未来林岚在十三号屏幕内：“没用的。”",
    WAIT_AND_WATCH: `现实林岚画外音：“${replyByIntent.WAIT_AND_WATCH}”`,
    DISOBEY: `现实林岚画外音：“${replyByIntent.DISOBEY}”`,
    OTHER_FEASIBLE: `现实林岚画外音：“${replyByIntent.OTHER_FEASIBLE}”`
  };
  const actionByIntent = {
    CHECK_TIMECODE:
      "0至2秒保持十三号监视器四边边框和下方现实控制台同时可见；2至5秒，十三号屏幕内部的未来林岚先缓慢抬起左手，约一秒后现实林岚只有一只空手从画面下缘做出同样动作；5至8秒保持两个动作错位的结果并说出结论。不要生成可读时间数字。",
    COMPARE_FEED:
      "0至3秒手机只做一次很小的横向平移，同时完整框住十三号监视器和相邻监视器；3至6秒十三号屏幕中的未来林岚先抬手，相邻屏幕延迟后才出现相同动作；6至8秒稳定保持两块屏幕边框并说出结论。",
    CUT_POWER:
      `第0至1秒保持首帧宽景，中央十三号监视器正在稳定播放未来林岚，亮度固定为冷灰绿色；第1至4秒后置镜头向下压到下方控制台，未来林岚的脸完全离开画面，一只空手从画面下缘伸入，只操作检修记录标注的C-04总控回路，把C-04左下方粗黑色总电源插头从墙面插座中完整拔出，插头和插座清楚分离；严禁触碰十三号监视器机身、按钮或电源线。第4至6.5秒镜头继续对准已拔出的C-04插头和失去指示灯的黑暗控制台，由画面外、靠近记录设备的现实林岚说对白一，此时画面里没有任何人脸或嘴部；不要表现任何监视器关机过程；第6.5至7.5秒镜头快速而自然地重新抬起；第7.5至10秒中央十三号监视器必须与第0秒完全相同，保持同样的冷灰绿色亮度并继续播放同一个未来林岚，从未黑屏、从未断电、没有雪花，她抬眼后说对白二并与口型精确同步。左右设备状态不重要，不要展示逐台熄灭。严禁关闭中央十三号监视器，严禁让它变黑，严禁按下十三号机器自身的开关。必须按对白一、对白二的顺序完成，不得交换归属或重叠。${hasBreakerMap ? "玩家已经发送青河电视台2014年检修记录作为证据：C-04控制11至16号监视器墙，十三号备用电源已经拆除；必须严格按该证据操作。" : ""}`,
    WAIT_AND_WATCH:
      "手机全程固定对准十三号监视器，现实控制室和现实林岚保持不动；2秒后只有屏幕内部的未来林岚自行转身并操作设备，最后保持监视器边框完整并说出结论。",
    DISOBEY:
      "手机全程固定对准十三号监视器，现实控制室和现实林岚故意保持不动；屏幕内部的未来林岚却提前完成原本预测的动作并回头看向监控镜头，最后说出结论。",
    OTHER_FEASIBLE:
      `现实林岚只用一只空手执行玩家提出的安全单步验证“${sanitizeForPrompt(message)}”，十三号屏幕在动作发生前先显示同一结果，或在动作完成后保留一个不可能由普通监控产生的差异；全程只表现这一项验证，结尾保持十三号监视器边框完整并说出结论。`
  };
  const reply = replyByIntent[intent];
  const voiceConstraint =
    intent === "CUT_POWER"
      ? `声音角色约束：本段只有两个依次出现的女性声源，并且都是林岚。对白一属于现实林岚，是手机附近的直接人声；对白二属于未来林岚，是十三号监视器内部的窄频扬声器人声。两者保持同一核心女性音色，禁止交换归属或声音重叠。只能说对白清单中的两句中文台词，禁止朗读、翻译或复述任何提示词说明；禁止英文对白、少女腔、男声、旁白和其他说话者。`
      : linLanVoiceConstraint;
  const prompt = `第0秒逐帧延续输入参考图：横屏16:9后置摄像头直接输出的废弃控制室宽景，现实画面中完整保留十三号老式监视器、下方控制台和相邻屏幕。输入参考图本身就是最终直播画面，不要在画面内部添加任何拍摄设备。未来林岚只能存在于十三号监视器玻璃内部，现实控制室中不得出现她的脸、身体、影子或倒影。

这是单条完整的${intent === "CUT_POWER" ? "10" : "8"}秒验证结果视频，不存在第二段结果视频。${actionByIntent[intent]}

拍摄硬约束：全程保持同一台后置摄像头的第一人称直接输出，不翻转前置、不切镜、不跳到第三人称。记录设备始终在画框之外；禁止设备外壳、持机双手、第二层取景框、相机界面、快门按钮、录制标记、弹幕、字幕、可读文字或平台界面。仅在执行验证动作时允许林岚的一只空手从画面下缘短暂进入；未来林岚绝不能走出十三号屏幕边框。

情绪表演：${deliveryByIntent[intent]}

对白清单，只允许说以下中文台词，不得改写或替换：${dialogueByIntent[intent]}

${voiceConstraint} 声音内容：与动作同步的插头摩擦或设备操作声、屏幕断电声、年轻女性呼吸和控制室低电流；现实林岚是手机附近的直接人声，未来林岚只在断电分支中通过十三号监视器窄频扬声器发声；声音由H3与画面同次原生生成，不要音乐。保持低饱和灰绿、暗褐、旧黄色调、自然铅笔轮廓、纸面摩擦感和克制手绘明暗；禁止写实3D、赛璐璐、怪物、血迹和攻击。`;
  return {
    intent,
    reply,
    duration: intent === "CUT_POWER" ? 10 : 8,
    prompt,
    referencePath: path.join(mediaRoot, "runtime-references", "RT-02-wide-control-console-composite.jpg")
  };
}

function buildIdentityReplyPlan(message) {
  const intent = classifyIdentityExplanation(message);
  const replyByIntent = {
    DENY: "你上一次也是这么说的。",
    ADMIT_OR_REMEMBER: "这次，你记得比上一次多。",
    LOOP_THEORY: "你终于开始怀疑时间了。",
    LEAVE_WARNING: "你每次都让她离开，可最后还是会回来。",
    QUESTION_CHANNEL: "名字不是写上去的，是频道留下来的。",
    OTHER: "你每一次，都会换一种说法。"
  };
  const reply = replyByIntent[intent];
  const prompt = `横屏16:9，这是记录设备直接输出的无界面后置摄像头画面。第0秒逐帧延续输入参考图中的废弃电视台控制室宽景：中央十三号老式监视器、右侧相邻黑屏、下方积灰控制台及所有边框位置完全固定。现实摄像机在完整10秒内不移动、不变焦、不切镜，现实控制室像静止照片一样不变；只有两块监视器玻璃内部的像素允许运动。

这是唯一一条用户名回应Runtime，必须在本条10秒视频内完整完成回应和跨屏异常，禁止生成后续续接视频。未来林岚始终只能存在于监视器玻璃内部，现实控制室中不得出现她的身体、脸、影子或倒影。

第0至0.8秒：未来林岚只出现在中央十三号屏幕内，像刚听见玩家在画框外说出“${sanitizeForPrompt(message)}”一样短暂垂眼。
第0.8至3.8秒：她在十三号屏幕内克制地抬眼，只说“${reply}”，嘴部与普通话精确同步；说完立即闭嘴。
第3.8至5.8秒：同一个未来林岚在十三号屏幕内部转身并持续向画面右侧走，在第5.8秒前完整走出十三号屏幕内部画面的右边缘；她绝不能跨过实体监视器边框进入现实控制室。
第5.8至6.8秒：十三号屏幕保持亮着并显示空控制室；右侧相邻黑屏出现短促冷白扫描线后自行亮起。
第6.8至9.3秒：同一个未来林岚只在右侧相邻监视器内部从左侧走入，走两步后停下并侧头看向屏幕内部走廊深处，不再说话。十三号屏幕同时保持无人，画面中任何时刻最多只能有一个未来林岚。
第9.3至10秒：稳定保持“十三号屏幕无人、右侧屏幕出现未来林岚”的结果，建立她不是离开而是移动到另一块屏幕的异常。

${futureLinLanVoiceConstraint} 声音内容：0.8至3.8秒未来林岚经十三号监视器窄频扬声器只说“${reply}”；之后只有屏幕内部由左向右移动的脚步、右侧监视器启动电流、现实林岚紧张呼吸和控制室低电流声，无第二句对白。音轨由H3同次原生生成，不要音乐。

严格保持输入图中的同一人物画风、脸型、黑色碎刘海、低马尾、橄榄灰绿旧外套、比例和铅笔纹理，完整10秒内不得改变画风、年龄、服装或五官。禁止字幕、对白文字、弹幕气泡、用户名、姓名标签、头像、平台UI、手机本体、拍摄设备、相机取景框、第三人称切镜、人物出现在监视器外、两块屏幕同时出现两个人物、写实3D、日漫赛璐璐、怪物、血迹和攻击。`;
  return {
    intent,
    reply,
    duration: 10,
    maskSubtitleBand: true,
    prompt,
    referencePath: path.join(mediaRoot, "runtime-references", "RT-02-wide-control-console-composite.jpg")
  };
}

function buildMotherReplyPlan(message) {
  const intent = classifyMotherMessage(message);
  const replyByIntent = {
    SAFETY: "我很安全。可你不该在这里。",
    IDENTITY: "我是林秋。可她记错了这一晚。",
    LEAVE_WARNING: "别碰母带。离开这里。",
    PRIVATE_QUESTION: "因为我以前见过你。",
    LOOP_THEORY: "重复的不是录像，是你。",
    OTHER: "我听见你了。你来过这里。"
  };
  const reply = replyByIntent[intent];
  const prompt = `横屏16:9手机后置摄像头原始画面。第0秒逐帧延续输入PRE关键帧：现实手机完整拍到老式返看监视器四边边框，林秋正面坐在十二年前的主持台后。完整8秒固定机位、固定焦段、不切镜、不推进。严格保持首帧中的林秋脸型、短黑发、细框眼镜、深棕旧西装、身体比例、主持台、背景、铅笔勾线和低饱和灰褐色彩，不得重新设计人物。

玩家输入“${sanitizeForPrompt(message)}”只用于选择回应，不能显示或朗读。0至1.5秒林秋闭嘴倾听，缓慢抬眼。1.5至5.5秒全片只有林秋一人说话，并且只能完整、清楚地说一句：“${reply}”口型逐字同步。5.5至8秒她闭嘴，双手保持在主持台附近，恢复稳定凝视。

${linQiuVoiceConstraint} 声音同时保留轻微磁带嘶声、CRT电流和演播厅远处混响，不要音乐。禁止林岚说话，禁止第二说话者，禁止把对白改写成其他句子，禁止口齿含混、无意义音节、乱码语言、英文、重复台词或额外语气词。

画面中绝对禁止生成任何字幕、对白文字、滚动文字、弹幕、名字标签、平台UI、水印或新的节目标题。林秋不得走出屏幕，不得看向身后或指向电视。禁止新增物件、第三人称、手机本体、怪物、血迹、写实3D和赛璐璐。`;
  return {
    intent,
    reply,
    duration: 8,
    prompt,
    maskSubtitleBand: true,
    subtitleMask: { x: 190, y: 570, width: 900, height: 140 },
    tapeAudio: true,
    referencePath: path.join(mediaRoot, "runtime-references", "RT-03-lin-qiu-from-PRE-A3-05.jpg")
  };
}

function buildUnsentMessagePlan(evidenceTags = []) {
  const hasMessage = evidenceTags.includes("LIN_QIU_UNSENT_MESSAGE");
  const reply = "我看到了。那我先不碰播出机。她说返看机不接播出线路……我先看带子最后一分钟。";
  const prompt = `横屏16:9手机后置摄像头原始直播画面。第0秒逐帧延续输入参考图：十三号CRT黑屏居中，周围旧控制台指示灯、设备边框、灰尘、暗绿灰褐手绘质感和构图必须完全不变。完整10秒保持同一台后置摄像头和同一构图，不切镜、不翻到自拍、不生成林岚的脸或第二个人，不出现手机本体、平台UI或可读文字。

${hasMessage ? "玩家刚把“林秋21:03未发送的值班留言”作为可验证证据发到直播。" : "林岚刚收到一条关于21:03未发送留言的恢复记录。"}林岚始终在镜头后方，压住紧张，只说：“${reply}”不得在画面中生成说话者、口型、对白气泡、字幕或任何文字。画面只允许极轻微的自然手持呼吸漂移，最后仍稳定对准十三号CRT，为下一条插线的预制视频衔接。

林岚不是已经知道真相，也不是决定播放母带；她只是因为证据改变行动：暂时不接播出线路，先用返看机验证最后一分钟。红衣女人、林秋、未来林岚和任何第二个人都不得出现，屏幕不得自行亮起，不新增惊吓。${linLanVoiceConstraint} 声音内容只有林岚这一句对白、近距离紧张呼吸、衣料与母带盒轻响、控制室低电流；不要音乐。禁止字幕、弹幕、对白文字、名字标签、水印、怪物、血迹、写实3D和日漫赛璐璐。`;
  return {
    intent: "RETURN_VIEWER",
    reply,
    duration: 10,
    prompt,
    referencePath: path.join(mediaRoot, "runtime-references", "RT-04-from-A4.jpg")
  };
}

function buildBeliefReplyPlan(message) {
  const intent = classifyBelief(message);
  const replyByIntent = {
    TRUST_SCREEN: "相信屏幕里的她……好。母带先留着，但我现在不放。",
    TRUST_FUTURE: "相信未来的我……好，我先不碰母带。",
    TRUST_EVIDENCE: "谁都别信，只按证据行动……好。在弄清楚以前，我不播。",
    UNDECIDED: "你也没办法确定……我也是。那就先不替任何一边做决定，等下一条证据。"
  };
  const reply = replyByIntent[intent];
  const performanceByIntent = {
    TRUST_SCREEN: "她听到仍有救母可能时眼神动摇，低头看一眼母带，但克制住立刻播放的冲动。",
    TRUST_FUTURE: "她因未来自己的警告而压住冲动，慢慢把母带从播出设备旁收回。",
    TRUST_EVIDENCE: "她从情绪中强迫自己冷静下来，先确认母带盒与返看设备，再明确不播放。",
    UNDECIDED: "她承认自己也无法确定，握紧母带片刻后将它平放在控制台上等待新证据。"
  };
  const prompt = `横屏16:9手机前置摄像头原始直播画面。第0秒逐帧延续输入参考图中的林岚正面自拍：人物脸型、短黑发、齐刘海、圆框眼镜、橄榄灰旧外套、手中零号母带和旧控制室背景完全一致。完整10秒保持同一连续自拍，不切镜、不出现第三人称或手机本体。

玩家刚表达的判断是“${sanitizeForPrompt(message)}”，只用于决定林岚回应，不得显示或朗读玩家原话。0至1秒林岚安静听完；1至8秒她只能说：“${reply}”口型与普通话准确同步。表演：${performanceByIntent[intent]}8至10秒她闭嘴看向画外播出设备，保留矛盾但不执行不可逆行动。

本段只能表达当前倾向，绝对不能播放或毁掉母带、跟随屏幕人物、断电、离开控制室。红衣女人、林秋、未来林岚及任何第二个人不得出现；监视器不得突然亮起或制造额外惊吓。${linLanVoiceConstraint} 声音内容只有林岚对白、近距离呼吸、母带盒轻响和控制室低电流；不要音乐。禁止字幕、弹幕、可读文字、水印、血迹、怪物、写实3D和日漫赛璐璐。`;
  return {
    intent,
    reply,
    duration: 10,
    prompt,
    referencePath: path.join(mediaRoot, "runtime-references", "RT-05-from-A4.jpg")
  };
}

function buildFinalDecisionPlan(message) {
  const intent = classifyFinalDecision(message);
  const replyByIntent = {
    PLAY_TAPE: "好……我播放母带。",
    SHUT_DOWN: "好……我断电，把母带毁掉。",
    CLARIFY: "我没听明白……你要我播放母带，还是彻底停播？"
  };
  const reply = replyByIntent[intent];
  const actionByIntent = {
    PLAY_TAPE: "她含着泪听完，低头看向怀里的母带，经过一次艰难吞咽后作出播放决定；不在本段实际插入母带。",
    SHUT_DOWN: "她含着泪听完，抱紧母带，眼神从犹豫转为决绝；不在本段实际断电或毁带。",
    CLARIFY: "她仍然泪流满面，困惑地看着镜头，请玩家只明确一个最终行动。"
  };
  const prompt = `横屏16:9手机前置摄像头原始直播画面。第0秒逐帧延续输入参考图中PRE-A5-05的最终尾帧：林岚短黑直发、齐刘海、圆框眼镜、橄榄灰旧外套、被泪水打湿的脸、怀里的零号母带和废弃控制室背景必须完全一致。

这是最终决定后的短回应，不是完整结局。玩家输入“${sanitizeForPrompt(message)}”只用于确定最终行动，绝对不能显示、朗读或变成弹幕。林岚先无声听完，${actionByIntent[intent]}她只能说：“${reply}”口型与自然普通话精确同步，说完后闭嘴看向即将执行行动的画外方向。

本段不得执行结局动作：禁止插入或播放母带、禁止红衣女人出现、禁止离开控制室、禁止断电、毁带、屏幕换人或新增惊吓。保持参考帧的原创手绘都市悬疑画风、人物五官、眼镜、服装、泪痕、暗绿灰褐色调和控制室空间。${linLanVoiceConstraint} 声音只有林岚这一句回应、含泪呼吸、轻微吞咽、衣料和母带盒摩擦、控制室低电流；不要音乐。

绝对禁止字幕、对白文字、弹幕气泡、用户名、头像、平台UI、手机外壳、水印、第二个人、红衣鬼影、写实真人、精致3D或日漫赛璐璐。`;
  return {
    intent,
    reply,
    duration: 8,
    prompt,
    referencePath: path.join(mediaRoot, "runtime-references", "RT-06-from-PRE-A5-05.jpg")
  };
}

function buildEndingRuntimePlan(promptId, message) {
  const endingStyle = `横屏16:9手机直播原始画面。输入首帧是上一节点的真实连续帧，必须逐帧延续其人物、机位、曝光、控制室或走廊空间、设备位置、低饱和暗绿灰褐色调、自然铅笔勾线、纸面摩擦纹理和克制手绘明暗。禁止重新设计人物、场景或画风；禁止写实真人、精致3D、塑料皮肤、日漫赛璐璐、怪物化和血腥。画面是无界面的手机摄像头直接输出，绝对禁止字幕、对白文字、弹幕气泡、用户名、头像、关注按钮、礼物图标、录制标记、时间码、水印、第二层取景框和手机本体。`;
  const playerReason = sanitizeForPrompt(message);
  const actionByPromptId = {
    "RTE-E1-01": `这是E1《换人》第一段，完整10秒连续完成播放母带和换人。
0至1秒逐帧延续林岚泪流满面的前置近景；她不再说话，只看一眼怀里的零号母带。
1至2秒手机自然翻到后置摄像头，禁止跳切和第三人称，镜头对准播出机与监视器墙。
2至4秒只有林岚双手从画面下缘进入，把同一盘零号母带完整插入播出机空槽；播出机机械启动。
4至6秒监视器内的林秋放下话筒，从主持位起身；现实手机右后方传来三次由远到近的低跟鞋声，现实画面中绝不出现红衣女人。
6至7.5秒林岚把手机稳定放到控制台形成固定低机位，画面能够同时看到林岚背影、播出机和监视器。
7.5至8.5秒监视器墙同步黑屏。
8.5至10秒屏幕恢复时，现实机位前的林岚已经完全消失；主持位屏幕内部出现同一个林岚，现实地面只留下空母带盒。禁止表现消失过程，必须利用黑屏遮挡完成换人。`,
    "RTE-E1-02": `这是E1《换人》第二段，逐帧延续第一段生成尾帧，固定手机机位、现实林岚为空、屏幕内林岚和地面母带盒必须保持一致。
0至2秒屏幕内的林岚惊恐拍打玻璃但没有声音；现实控制室保持空。
2至5秒林秋从监视器侧面的暗处进入现实画面，她保持短发、眼镜、深棕旧西装和十二年前主持人形象。她经过手机附近时只低声说：“谢谢你……帮我换出来。”口型和原生普通话同步。
5至7秒林秋不看镜头，连续走向控制室出口并完整离画。
7至10秒固定机位只剩空控制室和黑屏监视器；监视器玻璃反光中逐渐显出一个坐在导播椅上的暗砖红衣女人轮廓。她不移动、不抬手、不说话，脸始终被反光和噪点遮住。`,
    "RTE-E3-01": `这是E3《停播》第一段，完整10秒连续完成断电、毁带和出口显形。
0至1秒逐帧延续林岚泪流满面的前置近景；她不再说话，眼神从悲伤转为决绝。
1至2秒手机自然翻到后置摄像头并对准总控电源，不得跳切。
2至4秒只有林岚双手从画面下缘进入，明确拉下总电源开关；控制室照明和全部监视器同步熄灭。
4至6秒低照度手机画面中，林岚取出同一盘零号母带，用力折断外壳并拉断内部磁带；动作清楚但不出现血腥。
6至7秒保持黑暗与紧张呼吸。
7至10秒手机缓慢抬向出口，暗砖红衣女人才在低照度画面中显出静止轮廓。她站在出口侧边，没有挡住门、不靠近、不抬手、不说话。`,
    "RTE-E3-02": `这是E3《停播》第二段，逐帧延续第一段生成尾帧，低照度控制室、出口和红衣女人位置必须完全一致。
0至2秒红衣女人没有靠近，只缓慢向侧面退开一步，明确让出通往侧门的道路。
2至6秒林岚保持手机后置第一人称视角，连续从她身旁经过并走向出口。经过时手机画面仍能看见红衣女人，但现实墙面上属于她的影子提前淡化并完全消失。
6至7.5秒身后传来一声极轻的女性叹息；林岚回看半秒，手机画面中的红衣女人也已经消失，原位置只剩空墙。
7.5至10秒卷闸门停止下降，侧门保持可通行。林岚连续越过室内外门槛走到安全空地，画面出现真实夜风和室外暗光，绝不返回电视台。`
  };
  const reply = promptId === "RTE-E1-02" ? "谢谢你……帮我换出来。" : "";
  const prompt = `${endingStyle}

玩家最终决定的理由是“${playerReason}”，只用于确认本结局分支，不能显示、朗读或改写成额外对白。

${actionByPromptId[promptId]}

声音必须由H3与画面同次原生生成：保持连续空间底噪、脚步、衣料、设备机械声、人物呼吸和各段指定声音；除E1第二段林秋唯一一句固定台词外，其他段落禁止任何人物说话。不要背景音乐。人物只能按分段要求出现，禁止额外角色、复制人物、突然换脸、服装变化、空间重构、瞬移穿模、现实突脸、攻击或追逐。`;
  return {
    intent: promptId,
    reply,
    duration: 10,
    prompt,
    referencePath: path.join(mediaRoot, "runtime-references", "RT-06-from-PRE-A5-05.jpg")
  };
}

function buildPastEchoPlan(message) {
  const echo = sanitizeForPrompt(message) || "我还在";
  const spokenLine = `我听过这句话：“${echo}”`;
  const prompt = `横屏16:9手机后置摄像头原始画面。第0秒逐帧延续输入PRE关键帧：现实手机完整拍到老式返看监视器四边边框，林秋坐在十二年前的主持台后。完整10秒固定机位、固定焦段、不切镜、不推进，严格保持首帧中的人物脸型、短黑发、细框眼镜、深棕旧西装、主持台、背景、铅笔纹理和低饱和色彩。

这是旧录像复述一条未来弹幕的异常，不是新行动指令。林秋必须把旧弹幕“${echo}”逐字完整念出，但不得执行弹幕内容。

0至1.2秒林秋闭嘴，监视器出现一次轻微磁带跟踪抖动。1.2至8.5秒全片只有林秋一人说话，并且只能清楚说出完整一句：“${spokenLine}”口型逐字同步，“${echo}”不得省略、概括或改写。说完后她闭嘴直视固定录像机，音轨短暂掉音后恢复。

${linQiuVoiceConstraint} 声音同时保留CRT电流、轻微磁带嘶声和一次短暂掉音，不要音乐。禁止林岚说话，禁止第二说话者，禁止口齿含混、无意义音节、乱码语言、英文、重复台词或额外语气词。

画面中绝对禁止生成任何字幕、对白文字、滚动文字、弹幕、名字标签、平台UI、水印或新的节目标题。禁止林秋走出屏幕、看向或指向身后电视、执行旧弹幕、出现第二块监视器、移动椅子、第三人称、手机本体、怪物、血迹、写实3D和赛璐璐。`;
  return {
    intent: "PAST_ECHO",
    reply: spokenLine,
    duration: 10,
    prompt,
    maskSubtitleBand: true,
    subtitleMask: { x: 190, y: 570, width: 900, height: 140 },
    tapeAudio: true,
    referencePath: path.join(mediaRoot, "runtime-references", "RT-03-lin-qiu-from-PRE-A3-05.jpg")
  };
}

function buildChairDirectionPlan() {
  const prompt = `横屏16:9手机直播原始画面，第0秒逐帧延续输入首帧：现实手机后置摄像头完整拍到一号演播厅舞台左侧的老式返看监视器，林秋停在屏幕内部。0至2秒监视器画面出现一次短促同步错位，现实林岚在镜头外听到场地中央传来木椅腿轻擦地面的声音。2至6秒手机在同一现实演播厅内连续、自然地从监视器向右后方转动，不切镜、不瞬移，最终拍到场地中央那把唯一旧木椅。椅子已经从原本面向舞台变成正面朝向手机；椅面上的无标签零号母带仍在原位，除此之外舞台、地面接缝、灯光、主持台和所有物件完全不变。6至8秒镜头停稳确认异常。8至10秒林岚将同一部手机自然翻到前置自拍，她保持短黑直发、齐刘海、圆框眼镜和橄榄灰外套，身后仍能辨认朝向手机的椅子；她短促吸气后用偏低、发紧的年轻女性普通话说：“我没碰过它……是我发完弹幕以后，它自己转过来的。”口型与原生语音精确同步。

声音与画面由H3同次生成并包含原生音轨：木椅腿短促摩擦、空旷演播厅混响、林岚紧张呼吸和唯一一句对白；不要音乐。严格保持低舞台、旧主持台、唯一木椅、椅面母带、左侧返看监视器和右侧后台门的既有空间关系。玩家的弹幕没有提到椅子，禁止声称玩家命令椅子转动。禁止母带移动或被拿起、出现第二把椅子、林秋走出现实屏幕、第三人称、跳切、字幕、平台UI、手机本体、怪物、血迹、攻击、写实3D和日漫赛璐璐。`;
  return {
    intent: "CHAIR_DIRECTION",
    reply: "我没碰过它……是我发完弹幕以后，它自己转过来的。",
    duration: 10,
    prompt,
    referencePath: path.join(mediaRoot, "runtime-references", "RTE-A3-from-PRE-A3-05.jpg")
  };
}

function buildA3IncidentReactionPlan() {
  const reply = "现场没人……画面里却还有一个。如果当年站在那里的是妈妈……";
  const prompt = `横屏16:9手机前置摄像头原始自拍画面。第0秒逐帧延续输入PRE-A3-04前置关键帧：林岚近距离面对手机，保持同一张偏窄脸、黑色齐刘海短发、圆框眼镜、灰黄肤色、橄榄灰旧外套、曝光、焦段、背景位置、自然铅笔纹理和低饱和手绘质感。完整10秒固定为同一部手机的前置摄像头，不切镜、不翻转后置、不拉远成第三人称，手机本体、手指和第二层取景框不得入画。

前情只用于表演：林岚刚读完一份零号频道试播事故记录。记录显示母带接入后，现场主持位人员识别为0，播出画面人员识别为1，随后一号演播厅值班员失去联系。画面中不得生成或朗读这份记录，不得出现文字、日志页面或解释性UI。

0至1.5秒，林岚没有立刻看镜头；她低头消化刚读到的内容，呼吸变浅，眼球轻微移动，像在反复确认那两个人数。1.5至5秒，她慢慢抬眼看向镜头，声音压低、发紧，只说：“现场没人……画面里却还有一个。”说“一个”时视线短暂越过手机，看向画外演播厅主持位。5至8.5秒，她仍保持前置自拍构图，眼眶因恐惧与想到母亲而微微发红，迟疑地继续：“如果当年站在那里的是妈妈……”最后几个字越来越轻，话没有说完。8.5至10秒她闭嘴，轻轻吞咽，不得替玩家说出交换、替换、附身、救出或死亡等结论。

${linLanVoiceConstraint} 声音必须由H3与画面同次原生生成，只有林岚两句连续台词、近距离压抑呼吸、轻微吞咽与空旷演播厅底噪，不要音乐。禁止第二说话者、林秋、未来林岚、红衣女人、鬼影、母带自动移动、突脸、攻击、字幕、弹幕、用户名、平台UI、水印、写实真人、精致3D和日漫赛璐璐。`;
  return {
    intent: "INCIDENT_REACTION",
    reply,
    duration: 10,
    prompt,
    referencePath: path.join(mediaRoot, "runtime-references", "RT-03-from-PRE-A3-04.jpg")
  };
}

function classifyConversationalDetour(promptId, message) {
  if (!["RT-00", "RT-01", "RT-02", "RT-02B", "RT-03", "RT-05", "RT-06"].includes(promptId)) {
    return null;
  }
  if (classifyPlotIntent(promptId, message) !== null) return null;
  if (/(去死|自杀|杀了|杀掉|捅|砍|炸掉|放火|跳楼)/.test(message)) return "HOSTILE";
  if (/(傻[逼比]|蠢货|废物|垃圾|脑残|有病|神经病|妈的|他妈|操你|滚开|闭嘴|贱人|白痴)/i.test(message)) {
    return "INSULT";
  }
  if (/(漂亮|好看|可爱|厉害|真棒|牛啊|牛逼|喜欢你|爱你|加油|辛苦了)/.test(message)) {
    return "PRAISE";
  }
  if (/(没事吧|还好吗|害怕吗|怕不怕|你冷吗|累不累|注意安全|保护好自己|担心你)/.test(message)) {
    return "CONCERN";
  }
  if (/(哈哈|笑死|开玩笑|逗你的|唱(首|个)?歌|跳(个)?舞|讲笑话)/.test(message)) {
    return "JOKE";
  }
  if (/(什么意思|没听懂|看不懂|怎么回事|发生什么|我该说什么|要我干嘛)/.test(message)) {
    return "CONFUSED";
  }
  return "OFF_TOPIC";
}

function classifyPlotIntent(promptId, message) {
  if (promptId === "RT-00") return classifyAlert(message);
  if (promptId === "RT-01") return classifyDirection(message);
  if (promptId === "RT-02") return classifyVerification(message);
  if (promptId === "RT-02B") return classifyIdentityExplanation(message);
  if (promptId === "RT-03") return classifyMotherMessage(message);
  if (promptId === "RT-05") return classifyBelief(message);
  if (promptId === "RT-06") return classifyFinalDecision(message);
  return null;
}

function buildConversationalResponsePlan(promptId, message, category) {
  const replyByCategory = {
    INSULT: "你说话一定要这么难听吗？……算了，先说正事。",
    PRAISE: "现在夸我也没用……不过，谢谢。先帮我看看眼前怎么办。",
    CONCERN: "我还撑得住。谢谢你，但现在得先做决定。",
    JOKE: "你还有心情开玩笑？……先帮我把眼前这关过了。",
    HOSTILE: "这不是开玩笑。我不会照做的。说点现在能做的。",
    CONFUSED: "我也没完全弄明白。你先告诉我，现在最该做什么？",
    OFF_TOPIC: "现在说这个？……我没跟上。你想让我怎么做？"
  };
  const contextByPrompt = {
    "RT-00": {
      reference: "RT-00-continuity-from-SYS-A1-00.jpg",
      speaker: "林岚",
      visual: "保持林岚前置自拍近景。她先按玩家话语表现短暂、真实的情绪反应，再重新警觉地看向镜头；不回头、不调查电视，也不触发后续异常。",
      voice: linLanVoiceConstraint
    },
    "RT-01": {
      reference: "RT-01-continuity-from-INS-A1-06G.jpg",
      speaker: "林岚",
      visual: "保持林岚前置自拍近景。她紧张地看一眼画外岔口，再看回镜头；不选择房间、不移动路线。",
      voice: linLanVoiceConstraint
    },
    "RT-02": {
      reference: "RT-02-wide-control-console-composite.jpg",
      speaker: "现实林岚的画外音",
      visual: "保持后置摄像头对准十三号监视器和控制台。现实林岚只在镜头后说话，不执行验证、不操作设备，未来林岚也不行动。",
      voice: linLanVoiceConstraint
    },
    "RT-02B": {
      reference: "RT-02-wide-control-console-composite.jpg",
      speaker: "未来林岚",
      visual: "保持现实后置镜头与控制室完全不动。未来林岚只存在于十三号监视器内部，听完后作出克制回应；不跨屏、不触发路线变化。",
      voice: futureLinLanVoiceConstraint
    },
    "RT-03": {
      reference: "RT-03-lin-qiu-from-PRE-A3-05.jpg",
      speaker: "林秋",
      visual: "保持返看监视器四边边框和林秋主持位构图。林秋只在旧录像屏幕内部回应，不提供新线索、不改变剧情状态。",
      voice: linQiuVoiceConstraint
    },
    "RT-05": {
      reference: "RT-05-from-A4.jpg",
      speaker: "林岚",
      visual: "保持林岚手持零号母带的前置自拍。她只回应玩家语气，不选择相信任何一方，也不播放、放下或毁掉母带。",
      voice: linLanVoiceConstraint
    },
    "RT-06": {
      reference: "RT-06-from-PRE-A5-05.jpg",
      speaker: "林岚",
      visual: "保持林岚含泪抱着母带的前置自拍。她只回应玩家这句话，不作最终决定，也不执行任何结局动作。",
      voice: linLanVoiceConstraint
    }
  };
  const context = contextByPrompt[promptId];
  const reply = replyByCategory[category];
  const prompt = `横屏16:9手机直播原始画面，第0秒严格延续输入参考图，保持人物、机位、场景、曝光、服装、五官、屏幕边框和低饱和手绘质感完全一致。玩家刚说“${sanitizeForPrompt(message)}”，这句话没有回答当前剧情问题，因此本段只进行不影响剧情的角色回应。

${context.visual}

${context.speaker}根据玩家语气自然反应，只能说：“${reply}”口型或画外音与普通话准确同步。回应要像正在直播中的真人：被冒犯时不客气，受到关心时会稍微软化，听到玩笑时短暂无奈，跑题时真实困惑；但始终保持当前紧张处境，不把玩家原话照读出来。

${context.voice} 完整6秒内不得推进剧情、执行玩家指令、发现新证据、替玩家选择路线或触发结局。禁止字幕、对白文字、弹幕、平台UI、手机本体、新人物、鬼影、惊吓、切镜、空间变化、写实3D和日漫赛璐璐。声音只有指定对白、人物呼吸、衣料和当前空间底噪，不要音乐。`;
  return {
    intent: `SOCIAL_${category}`,
    reply,
    duration: 6,
    prompt,
    maskSubtitleBand: promptId === "RT-03",
    tapeAudio: promptId === "RT-03",
    referencePath: path.join(mediaRoot, "runtime-references", context.reference)
  };
}

function classifyMotherMessage(message) {
  const normalized = message.replace(/\s+/g, "");
  if (/(离开|快走|快跑|别查|不要继续|别继续|别碰|远离|报警|先出去)/.test(normalized)) {
    return "LEAVE_WARNING";
  }
  if (/(循环|轮回|重复|重来|上一轮|上一次|十二年|未来|过去|时间错乱|时间线)/.test(normalized)) {
    return "LOOP_THEORY";
  }
  if (/(安全吗|安全么|没事吧|还好吗|受伤|活着吗|有没有危险|在哪里)/.test(normalized)) {
    return "SAFETY";
  }
  if (/(你是谁|是不是林秋|真的是妈妈|真假|身份|林秋|妈妈|母亲|女儿|林岚)/.test(normalized)) {
    return "IDENTITY";
  }
  if (/[？?]|(为什么|怎么|记得|认识|见过|知道|发生了什么)/.test(normalized)) {
    return "PRIVATE_QUESTION";
  }
  return null;
}

function classifyBelief(message) {
  const normalized = message.replace(/\s+/g, "");
  if (
    /(无法|不能|没法|不确定|不知道|不清楚).{0,6}(判断|确定|决定|下结论|相信谁)?/.test(normalized) ||
    /(证据|线索|信息|事实).{0,5}(不足|不够|太少|不全|不完整|还少|缺失)/.test(normalized) ||
    /(还没|尚未|暂时没有).{0,5}(证据|线索|答案|结论)/.test(normalized) ||
    /(现在|目前|暂时|还).{0,5}(不能|无法|没法|不好).{0,5}(判断|确定|决定|下结论)/.test(normalized) ||
    /(继续|接着|再|先).{0,4}(查|调查|找|观察|看看|搜集|确认)/.test(normalized) ||
    /(再等等|先等等|都不信|先不信|先不判断|先不决定|别急着下结论)/.test(normalized)
  ) {
    return "UNDECIDED";
  }
  if (
    /(只|先|应该|更|宁愿).{0,5}(信|相信|按照|依据|根据).{0,5}(证据|事实|验证|时间码|返看)/.test(normalized) ||
    /(证据|事实|验证|时间码|返看).{0,6}(更可靠|不会骗人|为准|行动|判断)/.test(normalized)
  ) {
    return "TRUST_EVIDENCE";
  }
  if (
    /(相信|听|跟|站).{0,5}(未来|以后的?你|未来的?林岚)/.test(normalized) ||
    /(未来|以后的?你|未来的?林岚|自己).{0,5}(可信|不会骗|没必要骗|说得对)/.test(normalized)
  ) {
    return "TRUST_FUTURE";
  }
  if (
    /(相信|听|救|帮|站).{0,5}(屏幕|妈妈|母亲|林秋|她)/.test(normalized) ||
    /(屏幕|妈妈|母亲|林秋).{0,5}(可信|是真的|不会骗|需要救|能出来)/.test(normalized)
  ) {
    return "TRUST_SCREEN";
  }
  return null;
}

function classifyFinalDecision(message) {
  const normalized = message.replace(/\s+/g, "");
  const shutDown =
    /(彻底停播|停止播出|停掉|断电|切断.{0,4}电源|关掉.{0,4}电源|毁掉|毁带|毁了它|折断|烧掉|砸掉|不要播|别播|不能播|不播放|保命|先自保)/.test(
      normalized
    );
  const play =
    !/(不要播|别播|不能播)/.test(message) &&
    /(播放|播母带|放入|放进去|插入|接入|启动母带|救.{0,4}(妈妈|母亲|林秋|她)|让.{0,4}(出来|离开录像|获救)|换她出来)/.test(
      normalized
    );
  const matches = [
    shutDown ? "SHUT_DOWN" : null,
    play ? "PLAY_TAPE" : null
  ].filter(Boolean);
  if (matches.length === 1) return matches[0];
  if (
    matches.length > 1 ||
    /(不知道|不确定|无法决定|不能决定|没法决定|都行|随便|你决定|怎么办|再想想|等等)/.test(normalized)
  ) {
    return "CLARIFY";
  }
  return null;
}

function classifyAlert(message) {
  const normalized = message.replace(/\s+/g, "");
  if (/(快走|快跑|赶紧走|赶快走|赶紧跑|马上离开|赶紧离开|快离开|逃出去|撤离)/.test(normalized)) {
    return "URGENT_LEAVE";
  }
  if (
    /(别|不要|先别|千万别).{0,6}(回头|转身|看后面|看背后|看电视)/.test(normalized)
  ) {
    return "AVOID_LOOKING";
  }
  if (
    /(看|注意|小心|检查|瞧).{0,5}(背后|后面|身后|电视|屏幕)|背后.{0,5}(有人|有东西|亮了|不对)|电视.{0,5}(亮了|不对|有人|异常)|屏幕.{0,5}(亮了|不对|有人|异常)|回头|转身/.test(
      normalized
    )
  ) {
    return "DIRECT_ALERT";
  }
  return null;
}

function classifyDirection(message) {
  const normalized = message.replace(/\s+/g, "");
  const matches = [
    /(控制室|机房|导播室|监控室|十三号)/.test(normalized) ? "CONTROL_ROOM" : null,
    /(演播厅|舞台|摄影棚|直播间|一号厅)/.test(normalized) ? "STUDIO" : null,
    /(大厅|门厅|大厅电视|原来的电视|刚才的电视|先检查电视|检查四周|留在原地)/.test(normalized)
      ? "LOBBY"
      : null,
    /(离开|出去|出口|快走|快跑|回去|报警|撤|别进去了|回家)/.test(normalized) ? "LEAVE" : null
  ].filter(Boolean);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return "OTHER";
  return null;
}

function classifyVerification(message) {
  const normalized = message.replace(/\s+/g, "");
  if (
    /(断电|关电|关闭.{0,8}电源|关掉.{0,8}电源|把.{0,8}电源关掉|切断.{0,8}电源|拔电|拔掉.{0,8}(电源|插头)|拔下.{0,8}(电源|插头)|总闸|拉闸|电源开关)/.test(
      normalized
    )
  ) {
    return "CUT_POWER";
  }
  if (/(时间码|时间|时钟|几点|快.*分钟|慢.*分钟|先后顺序)/.test(normalized)) return "CHECK_TIMECODE";
  if (/(比较|对比|两块|多个|其他屏幕|旁边屏幕|直播画面|手机画面|不同画面)/.test(normalized)) {
    return "COMPARE_FEED";
  }
  if (/(故意不|不要照|别照|反着|相反|违背|不执行|不跟着|做不一样的动作)/.test(normalized)) {
    return "DISOBEY";
  }
  if (/(等|等待|先别动|保持不动|不动|观察|看看它|让她先动)/.test(normalized)) return "WAIT_AND_WATCH";
  if (
    /(试试|验证|检查|测试|对着|拍下|录下|遮住|挥手|抬手|走一步|做个动作|问她|喊她)/.test(normalized)
  ) {
    return "OTHER_FEASIBLE";
  }
  return null;
}

function classifyIdentityExplanation(message) {
  const normalized = message.replace(/\s+/g, "");
  if (/(离开|快走|快跑|别查|不要继续|别继续|报警|先出去)/.test(normalized)) return "LEAVE_WARNING";
  if (/(循环|轮回|上一轮|上一次|时间错乱|时间线|未来|重复|重来)/.test(normalized)) return "LOOP_THEORY";
  if (/(为什么|怎么会|谁写的|谁留下).{0,6}(频道|名字|用户名|纸上)?|频道.{0,5}(留下|记录)|名字.{0,5}(出现|写上|留下)/.test(normalized)) {
    return "QUESTION_CHANNEL";
  }
  if (/(不认识|没来过|没有来过|从没来过|不是我|我不知道|毫无印象|否认)/.test(normalized)) return "DENY";
  if (/(我记得|记起来|来过|认识|可能是我|也许是我|好像见过|有印象)/.test(normalized)) {
    return "ADMIT_OR_REMEMBER";
  }
  return null;
}

function sanitizeForPrompt(message) {
  return message.replace(/[\r\n<>]/g, " ").replace(/\s+/g, " ").slice(0, 160);
}

function extractVideoUrl(payload) {
  return (
    payload?.video_url ||
    payload?.url ||
    payload?.content?.url ||
    payload?.task?.content?.url ||
    payload?.data?.[0]?.url ||
    null
  );
}

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["completed", "complete", "succeeded", "success"].includes(value)) return "completed";
  if (["failed", "fail", "cancelled", "canceled"].includes(value)) return "failed";
  return value || "queued";
}

function authHeaders() {
  return { Authorization: `Bearer ${process.env.LITELLM_KEY}` };
}

async function upstreamError(response) {
  return new Error(`H3接口返回${response.status}：${await safeResponseText(response)}`);
}

async function safeResponseText(response) {
  try {
    return (await response.text()).slice(0, 600);
  } catch {
    return "无法读取错误正文";
  }
}

function readableError(error) {
  return error instanceof Error ? error.message : "未知Runtime生成错误";
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
