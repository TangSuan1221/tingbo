# 剧情知识库与 AI 回应

本地 Node 后端的自由输入链路：弹幕与当前节点对话历史 → 按节点检索知识 → 文本模型语义判断、新写对白和选择动作 → 校验结构与允许的动作 → 拼装视频提示词 → H3 原生音画生成 → 播放。

`story-knowledge.mjs` 是可编辑的小型结构化知识库，依据策划案、预制视频拆分清单和当前程序节点人工整理；不需要向量数据库。只发送当前节点信息，避免把整部剧本和未来真相交给早期角色。`actions` 的文本是可执行动作与连续性约束，不是预设回复。

`dialogue-planner.mjs` 调用兼容 OpenAI 格式的 `/v1/chat/completions`。默认模型 `auto`，默认复用 ForgeAX 地址与服务端密钥；可用 `DIALOGUE_MODEL`、`DIALOGUE_BASE_URL`、`DIALOGUE_API_KEY` 单独配置。凭据不进入前端。H3 仍使用 `/v1/videos`、`minimax-h3-max`。

自由对话覆盖 RT-00、RT-01、RT-02、RT-02B、RT-03、RT-05、RT-06。RT-04 是证据驱动的固定事件，其余自动异常和已制作的PRE继续按剧情编排。造化宿主桥接版通过 `VAG_AI_REQUEST` 的 `llm/messages` 调用宿主文本推理，再经 `videos`、`videos/status`、`videos/content` 生成和播放视频。两端共用 `dialogue-core.mjs` 中的知识检索、提示词、决策校验及镜头编排；浏览器包不包含本地鉴权代码或密钥。线上推理失败会停止，不提交视频或使用预设回复。

模型只返回新写的 `reply`、允许的 `intent` 和 `advance`，不公开内部推理。STAY 保持节点，播放后重新开放输入；只有明确行动才推进。前端按节点保留最近六轮成功对话，重开或刷新页面后清空。生成失败不把失败回复记入历史，不自动改用预设台词。

任务状态增加 `phase`（reasoning/video）、`dialogueSource`、`dialogueModel`、`knowledgeVersion`、`advance`，可从原有任务查询接口检查。模型超时或格式无效会明确失败，可重试。结构校验限制动作范围，但自然语言的事实正确性仍需实际试玩评估。

验证：`node --test server/dialogue-planner.test.mjs`、`npm run typecheck`。真实文本推理和H3生成会调用外部接口。
