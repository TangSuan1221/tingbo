# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated for this prototype: React, TypeScript and Vite for the browser game, with a local Node.js server that protects the MiniMax API key and proxies H3 video generation.

## Users

Players trying a short Chinese suspense interactive-film demo on desktop or landscape mobile web. They watch Lin Lan's livestream and type natural-language bullet comments to influence her immediate response and next action.

Writers and developers also use the local `/narrative.html` blueprint editor to inspect and revise the playable story graph without editing a static document.

## Product Purpose

Turn the existing pre-rendered prologue, first-two-act clips and Studio One footage into a playable first-person phone mystery. Success means the player can watch the authored sequence, submit free-text comments, leave the livestream to investigate controlled phone apps, return with evidence, wait inside the fiction while H3 generates a matching response, and continue without breaking the phone-camera viewpoint.

## Positioning

The player's own sentence becomes the cause of a newly generated in-character livestream response, while authored pre-rendered footage preserves narrative pacing and visual continuity.

## Operating Context

- Full-viewport 16:9 experience that opens on a game cover, then enters a VEIL browser forum prologue;
- pre-rendered video nodes, waiting loops, free-text interaction nodes and H3 runtime video nodes;
- a simulated phone desktop, fictional archive browser and evidence attachment flow in the second- and third-act investigations;
- a third-act replay/search/dial/voicemail chain that can recover extension `0313`, timecode `21:03` and the Zero Channel transfer rule;
- a separate narrative blueprint workspace with chapter navigation, an infinite pan/zoom canvas, editable nodes and conditional connections;
- local development server holding the H3 credential;
- current playable scope runs from the prologue through `PRE-A3-06`, the fourth- and fifth-act investigation, final decision, and the authored E1/E3 endings.

## Capabilities and Constraints

- Uses the provided ForgeAX-compatible `POST /v1/videos` H3 endpoint;
- model is `minimax-h3-max`, duration is 5 seconds and prototype output size is 480p;
- Runtime generation must include the project style prefix and the preceding shot's continuity reference image;
- Runtime speech, footsteps and ambience must be generated natively by H3 in the same pass as the image; a video without an H3 audio track is rejected rather than patched with separate TTS or frontend sound;
- all live footage follows Lin Lan's front/rear phone-camera logic;
- no gore, monsters or explicit violence;
- A3-06以后允许出现与林秋轮廓相似的红衣女鬼影；第四幕允许一次“一帧内直接越过屏框并贴满手机画面”的突脸，视觉出现、CRT爆响与林岚尖叫同步，但现实监视器玻璃不得破裂、鬼影不得实体穿出屏幕或攻击镜头，整张脸始终保持马赛克与高斯模糊；
- dynamic player text is rendered by game UI, not baked into generated video;
- the final decision supports only E1《换人》and E3《停播》; E3 returns to the Qinghe Local Board thread, posts a powered-off control-room image and automatically adds the current player's username reply;
- archive search uses a closed fictional index rather than the public internet;
- evidence tags can override ambiguous free-text classification when the player has found a precise in-world record;
- leaving the livestream does not pause its waiting footage; the live feed remains active behind the phone surface;
- API credentials must never be sent to or embedded in the browser bundle;
- current source assets are 1920×1080 at 24fps.
- the narrative blueprint distinguishes story, interaction, evidence and ending nodes through both labels and non-color visual structure;
- blueprint edits persist locally and can be exported or imported as JSON; they do not mutate the runtime state machine automatically.

## Brand Commitments

- Product name: 《停播之后：零号频道》;
- original low-saturation Chinese urban suspense setting;
- approved Lin Lan appearance, round glasses, clothing and Qinghe TV Station lobby assets;
- quiet, oppressive, pencil-textured illustrated game presentation;
- no anime, cel shading, glossy 3D realism or arbitrary third-person camera.

## Evidence on Hand

- `停播之后-零号频道-策划案.md`;
- `停播之后-预制视频拆分清单.md`;
- `assets/videos/first-act-assembly-manifest.json`;
- `assets/videos/first-act-runtime-prompts.md`;
- supplied prologue, first-act and waiting-loop MP4 files;
- approved character, storyboard and Runtime reference images under `assets/`.

## Product Principles

1. Interaction appears early and visibly changes Lin Lan's response.
2. Waiting for generation remains part of the livestream fiction.
3. Authored and generated footage meet at explicit camera and scene anchors.
4. Free text is accepted, but every act converges safely back to a producible main line.
5. Suspense and micro-horror come from timing, sound, screens, impossible continuity and brief paranormal apparitions rather than violence.
6. A route choice must change immediate movement, the next narrative node and persistent evidence; leaving is a valid early ending and never silently redirects to the control room.
7. External investigation must return to the livestream as an actionable evidence attachment, not remain optional lore.

