export type NodeType = "story" | "interaction" | "evidence" | "ending";
export type AssetStatus = "new-runtime" | "new-pre";

export type StoryNode = {
  id: string;
  code: string;
  title: string;
  type: NodeType;
  assetStatus?: AssetStatus;
  chapter: string;
  description: string;
  notes: string;
  storyboard?: string;
  x: number;
  y: number;
};

export type StoryEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

export const chapters = [
  { id: "prologue", label: "序章", title: "直播接入" },
  { id: "act1", label: "第一幕", title: "未来警告" },
  { id: "act2", label: "第二幕", title: "提前发生的直播" },
  { id: "act3", label: "第三幕", title: "最后一期节目" },
  { id: "act4", label: "第四幕", title: "镜头里多出来的人" },
  { id: "act5", label: "第五幕", title: "最后一次开播" }
] as const;

export const initialNodes: StoryNode[] = [
  {
    id: "web-cover",
    code: "WEB-G00",
    title: "进入《停播之后》",
    type: "story",
    chapter: "prologue",
    description: "从游戏封面进入青河同城论坛，看到旧电视台明日拆除、今晚仍亮灯的置顶帖。",
    notes: "",
    x: 120,
    y: 120
  },
  {
    id: "web-attachments",
    code: "WEB-INT-01",
    title: "查看两份附件",
    type: "interaction",
    chapter: "prologue",
    description: "分别查看停播公告与北口夜景照片，两项均完成后解锁直播入口。",
    notes: "必需交互：公告 + 照片",
    x: 120,
    y: 330
  },
  {
    id: "web-optional",
    code: "WEB-OPTIONAL",
    title: "浏览本地支线帖子",
    type: "interaction",
    chapter: "prologue",
    description: "可选查看封路公告与旧收音机帖子，补充拆除清场和无标签磁带背景。",
    notes: "不阻断主线",
    x: -210,
    y: 530
  },
  {
    id: "web-join",
    code: "WEB-INT-02",
    title: "输入用户名并接入",
    type: "interaction",
    chapter: "prologue",
    description: "用户名将写入十二年前的停播记录，成为第二幕的时间悖论证据。",
    notes: "输入 2～12 个字符",
    x: 120,
    y: 560
  },
  {
    id: "pre-g",
    code: "PRE-G-01 / 02",
    title: "信号接通 · 大厅建立",
    type: "story",
    chapter: "prologue",
    description: "林岚进入废弃电视台，直播建立大厅、旧电视、封锁线与探索目的。",
    notes: "",
    x: 120,
    y: 790
  },
  {
    id: "a1-tv",
    code: "PRE-A1-01",
    title: "身后电视突然亮起",
    type: "story",
    chapter: "act1",
    description: "直播观众先发现异常，林岚本人尚未注意。",
    notes: "",
    x: 650,
    y: 120
  },
  {
    id: "a1-alert",
    code: "INT-A1-00 · RT-00",
    title: "教学弹幕：提醒林岚",
    type: "interaction",
    chapter: "act1",
    description: "玩家第一次自由输入，明确指出她身后的电视异常。",
    notes: "例：快看你身后的电视",
    x: 650,
    y: 330
  },
  {
    id: "a1-warning",
    code: "PRE-A1-02+03",
    title: "未来林岚发出警告",
    type: "story",
    chapter: "act1",
    description: "电视中的林岚说“不要让我进去”；同步测试证明不是镜像。",
    notes: "",
    x: 650,
    y: 560
  },
  {
    id: "a1-disconnect",
    code: "PRE-A1-04+05",
    title: "观众断线 · 请求判断",
    type: "story",
    chapter: "act1",
    description: "只剩玩家仍能发言，林岚展示控制室、演播厅、大厅与出口。",
    notes: "",
    x: 650,
    y: 790
  },
  {
    id: "a1-route",
    code: "INT-A1-01",
    title: "选择调查路线",
    type: "interaction",
    chapter: "act1",
    description: "玩家自由输入控制室、演播厅、大厅或离开；控制室直入主线，另外两条进入取证支线。",
    notes: "去控制室直连 PRE-A2-02+03+04；演播厅/大厅触发 RT-01-R2",
    x: 650,
    y: 1020
  },
  {
    id: "a1-route-runtime-new",
    code: "RT-01-R2",
    title: "支线路线回应与前往取证点",
    type: "story",
    assetStatus: "new-runtime",
    chapter: "act1",
    description: "玩家选择演播厅或大厅时，H3理解原话，林岚即时回应并转身前往对应取证点。",
    notes: "新增 Runtime · 6～8秒 · 演播厅 / 大厅两种路线",
    storyboard: `### 0～2秒｜后置手机｜确认玩家指令

延续等待镜头尾帧，手机仍朝向大厅与走廊交界处。林岚读完玩家弹幕，停顿后用画外音确认：“好，我先去那里看看，你别断线。”

### 2～6秒｜后置手机｜前往玩家指定地点

演播厅路线：镜头转向演播厅门，手电扫过门牌与门缝，林岚谨慎靠近。

大厅路线：镜头回转大厅，依次带到黑屏电视、前台和出口，林岚走向前台。

### 6～8秒｜后置手机｜停在取证入口

镜头在演播厅门口或大厅前台停稳，保留稳定尾帧接下一条Pre。全程不切前置，不提前发现证据，也不进入控制室。`,
    x: 1030,
    y: 1020
  },
  {
    id: "a1-evidence-studio-new",
    code: "PRE-BR-STUDIO-01",
    title: "演播厅：手写场记",
    type: "evidence",
    assetStatus: "new-pre",
    chapter: "act1",
    description: "林岚在演播厅门口发现十二年前写有“小岚”的旧场记纸。",
    notes: "新增 Pre · REAR · 6～8秒 · 不进入演播厅深处",
    storyboard: `### 0～2秒｜后置手机｜检查演播厅门口

延续Runtime尾帧。手电扫过门框、地面电缆和积灰纸张，一张泛黄场记纸被风轻轻掀动。林岚只停在门口，不进入演播厅深处。

### 2～5秒｜后置手机｜拾起场记纸

林岚蹲下拾起纸张，掸去灰尘后举到镜头前。画面只保留表格和手写痕迹，具体日期与“小岚”由程序证据卡显示。

### 5～8秒｜后置手机｜确认异常

林岚低声说：“十二年前的场记……为什么会写着我的小名？”镜头停在纸张与门缝同框的位置，随后打开证据卡。

全程不切前置，不展示舞台、空椅、母带或林秋。`,
    x: 1410,
    y: 1020
  },
  {
    id: "a1-evidence-lobby-new",
    code: "PRE-BR-LOBBY-01",
    title: "大厅：拆除巡检照片",
    type: "evidence",
    assetStatus: "new-pre",
    chapter: "act1",
    description: "林岚找到拆除前巡检照片，发现照片中的出口位置与当前空间不一致。",
    notes: "新增 Pre · REAR · 6～8秒 · 照片细节由程序叠加",
    storyboard: `### 0～2秒｜后置手机｜翻查大厅前台

延续Runtime尾帧。镜头同时带到旧前台、黑屏CRT和远处出口。林岚翻动散落文件，抽出一张带折痕的巡检照片。

### 2～5秒｜后置手机｜对照出口位置

林岚把照片举到镜头前，再缓慢移开，让照片中的门洞与现实出口同框。她来回比对，两处位置明显不一致。

### 5～8秒｜后置手机｜保存证据

林岚说：“照片里的出口不在这里……是照片错了，还是这里变了？”她拍下照片，镜头停在前台与远处出口的稳定构图，随后打开证据卡。

全程不切前置；大厅电视保持黑屏，出口无人，不增加新的惊吓。`,
    x: 1410,
    y: 1280
  },
  {
    id: "a1-return-control-new",
    code: "PRE-BR-RETURN-01",
    title: "控制室传来设备启动声",
    type: "story",
    assetStatus: "new-pre",
    chapter: "act1",
    description: "取证后，控制室方向突然传来一连串旧监视器启动声，走廊灯逐段熄灭；林岚判断异常源在那里，决定先去确认并停在门外。",
    notes: "新增 Pre · REAR · 6～8秒 · 台词：只有控制室还有设备在响，我先过去看看 · 尾帧衔接 PRE-A2-02",
    storyboard: `### 0～2秒｜后置手机｜控制室传来启动声

证据卡关闭后回到直播。镜头先朝下拍林岚收好证据，再抬向公共走廊。控制室方向连续传来旧CRT通电声，她立刻停步并转向声源。

### 2～5秒｜后置手机｜走廊灯逐段熄灭

通往控制室的日光灯由远及近依次熄灭，最后只剩门缝附近的微弱冷光。林岚说：“只有控制室还有设备在响……我先过去看看。”

### 5～8秒｜后置手机｜抵达控制室门外

镜头跟随林岚穿过走廊，在关闭的控制室门前停稳。她没有推门，也不切换前置摄像头。

尾帧正对控制室门并保持约0.5秒，下一条PRE-A2-02从同一方向越过门槛进入控制室。`,
    x: 1790,
    y: 1020
  },
  {
    id: "early-ending",
    code: "ENDING-EARLY-LEAVE",
    title: "提前结局《失联》",
    type: "ending",
    chapter: "act1",
    description: "林岚真正离开电视台，主线提前结束。",
    notes: "当前源码使用完成面板，无专属预制片",
    x: 1030,
    y: 1340
  },
  {
    id: "a2-predict",
    code: "PRE-A2-02+03+04",
    title: "13号屏预测弹幕",
    type: "story",
    chapter: "act2",
    description: "关闭的监视器中只有13号屏工作，它像是提前知道玩家要说什么。",
    notes: "三条调查路线汇合点",
    x: 2170,
    y: 120
  },
  {
    id: "a2-verify",
    code: "INT-A2-01 · RT-02",
    title: "设计验证方法",
    type: "interaction",
    chapter: "act2",
    description: "玩家提出对比屏幕、断电、等待或故意违背预测，林岚执行验证。",
    notes: "",
    x: 2170,
    y: 350
  },
  {
    id: "a2-breaker",
    code: "WEB-A2-BREAKER",
    title: "可选：检修记录",
    type: "evidence",
    chapter: "act2",
    description: "上滑离开直播，查监视器墙供电改造记录，并把 BREAKER_MAP 发送回直播。",
    notes: "强化切断控制台电源的验证结果",
    x: 2550,
    y: 380
  },
  {
    id: "a2-record",
    code: "PRE-A2-05+06",
    title: "十二年前的用户名",
    type: "evidence",
    chapter: "act2",
    description: "停播记录写着“唯一观众已接入”，并出现玩家本局用户名。",
    notes: "",
    x: 2170,
    y: 610
  },
  {
    id: "a2-identity",
    code: "INT-A2-02 · RT-02B",
    title: "解释时间悖论",
    type: "interaction",
    chapter: "act2",
    description: "玩家解释自己为何出现在十二年前的纸上，未来林岚随后跨屏移动。",
    notes: "",
    x: 2170,
    y: 840
  },
  {
    id: "a2-studio",
    code: "PRE-A2-09+10",
    title: "无人演播厅传来“小岚”",
    type: "story",
    chapter: "act2",
    description: "另一块监视器亮起，母亲般的声音把林岚引向一号演播厅。",
    notes: "",
    x: 2170,
    y: 1070
  },
  {
    id: "a3-tape",
    code: "PRE-A3-01+02",
    title: "演播厅与零号母带",
    type: "story",
    chapter: "act3",
    description: "林岚发现空椅、返看监视器，以及椅面上的无标签母带。",
    notes: "",
    x: 2830,
    y: 120
  },
  {
    id: "a3-mother",
    code: "PRE-A3-03+04",
    title: "十二年前的林秋提问",
    type: "story",
    chapter: "act3",
    description: "《晚安青河》旧录像中，林秋问屏幕外的人：她的女儿现在安全吗？",
    notes: "",
    x: 2830,
    y: 350
  },
  {
    id: "a3-message",
    code: "INT-A3-00 · RT-03",
    title: "跨时空自由回应",
    type: "interaction",
    chapter: "act3",
    description: "玩家原话被转告给林秋，提交时同时决定本局随机异常。",
    notes: "原话可被后续异常回调",
    x: 2830,
    y: 580
  },
  {
    id: "a3-loop",
    code: "PRE-A3-05",
    title: "“上一次也是你”",
    type: "story",
    chapter: "act3",
    description: "林秋确认玩家并非第一次出现在这段节目里。",
    notes: "",
    x: 2830,
    y: 810
  },
  {
    id: "a3-event",
    code: "A3-DYNAMIC-EVENT",
    title: "随机异常",
    type: "story",
    chapter: "act3",
    description: "种子抽取过去弹幕回声或椅子转向，随后回到同一调查节点。",
    notes: "PAST_ECHO 约55% / CHAIR_DIRECTION 约45%",
    x: 2830,
    y: 1040
  },
  {
    id: "a3-investigation",
    code: "INT-A3-01",
    title: "0313 → 21:03 调查链",
    type: "interaction",
    chapter: "act3",
    description: "搜索节目资料、保存0313分机、拨号听留言，再把21:03时间码发回直播。",
    notes: "多次失败后可确认跳过",
    x: 2830,
    y: 1270
  },
  {
    id: "a3-evidence",
    code: "SYS-A3-02",
    title: "21:03 隐藏记录",
    type: "evidence",
    chapter: "act3",
    description: "返看录像恢复零号母带尚未送达时的隐藏记录。",
    notes: "",
    x: 2830,
    y: 1500
  },
  {
    id: "a3-skip",
    code: "SYS-A3-03",
    title: "跳过调查：录像循环",
    type: "story",
    chapter: "act3",
    description: "玩家主动跳过调查，记录 MISSED_A3_ARCHIVE 并继续主线。",
    notes: "",
    x: 3210,
    y: 1430
  },
  {
    id: "a3-archive",
    code: "INT-A3-02",
    title: "阅读事故附件",
    type: "interaction",
    chapter: "act3",
    description: "确认“现场0人、画面1人”；可保存并触发林岚回应，也可稍后处理。",
    notes: "",
    x: 2830,
    y: 1730
  },
  {
    id: "a3-return",
    code: "PRE-A3-06",
    title: "带母带返回控制室",
    type: "story",
    chapter: "act3",
    description: "门内红衣手臂主动关门，林岚确认现场可能还有另一个存在。",
    notes: "",
    x: 2830,
    y: 1960
  },
  {
    id: "a4-calibrate",
    code: "PRE-A4-01+02+03",
    title: "13号屏校准谜题",
    type: "interaction",
    chapter: "act4",
    description: "视频暂停后拖动图块；累计放对第3块即继续，并触发唯一一次越框突脸。",
    notes: "",
    x: 3490,
    y: 120
  },
  {
    id: "a4-identity",
    code: "PRE-A4-04+05",
    title: "两个“母亲”",
    type: "story",
    chapter: "act4",
    description: "屏幕林秋催促播放母带，林岚指出她与手机里的红衣女人长相相同。",
    notes: "",
    x: 3490,
    y: 350
  },
  {
    id: "a4-warning",
    code: "PRE-A4-06",
    title: "未来林岚留下21:03",
    type: "story",
    chapter: "act4",
    description: "“别放进去”后的关键后果被截断，只留下未发送留言的调查入口。",
    notes: "",
    x: 3490,
    y: 580
  },
  {
    id: "a4-search",
    code: "INT-A4-00",
    title: "查找未发送留言",
    type: "interaction",
    chapter: "act4",
    description: "搜索并打开林秋21:03恢复留言，必须点击“发送到直播”才能推进。",
    notes: "",
    x: 3490,
    y: 810
  },
  {
    id: "a4-unsent",
    code: "WEB-A4-01 · RT-04",
    title: "过去林秋的安全警告",
    type: "evidence",
    chapter: "act4",
    description: "留言要求不要立刻播放母带，并断开播出线路查看最后一分钟。",
    notes: "",
    x: 3490,
    y: 1040
  },
  {
    id: "a4-double",
    code: "PRE-A4-07+08",
    title: "母带中的双重林岚",
    type: "story",
    chapter: "act4",
    description: "未来画面支持换人风险，林秋残缺求救声又保留救母可能。",
    notes: "",
    x: 3490,
    y: 1270
  },
  {
    id: "a4-belief",
    code: "INT-A4-01 · RT-05",
    title: "形成暂时判断",
    type: "interaction",
    chapter: "act4",
    description: "选择相信屏幕林秋、未来林岚、可验证证据，或暂时无法判断。",
    notes: "只记录立场，不执行最终动作",
    x: 3490,
    y: 1500
  },
  {
    id: "a5-memory",
    code: "PRE-A5-01+02",
    title: "私人记忆与母亲求救",
    type: "story",
    chapter: "act5",
    description: "屏幕林秋说出只有母女知道的记忆，并请求播放母带救她。",
    notes: "",
    x: 4150,
    y: 120
  },
  {
    id: "a5-conflict",
    code: "PRE-A5-03",
    title: "未来林岚警告“换人”",
    type: "story",
    chapter: "act5",
    description: "两块屏幕分别要求救母与自保，林岚被夹在播出机之间。",
    notes: "",
    x: 4150,
    y: 350
  },
  {
    id: "a5-afterimage",
    code: "PRE-A5-04",
    title: "熄屏后的红衣余像",
    type: "story",
    chapter: "act5",
    description: "林秋坐姿余像变成站立红衣女人，身份仍无法被证实。",
    notes: "",
    x: 4150,
    y: 580
  },
  {
    id: "a5-question",
    code: "PRE-A5-05",
    title: "林岚交出最终决定",
    type: "story",
    chapter: "act5",
    description: "播放可能换人，停播可能永远放弃母亲；代价被明确交给玩家。",
    notes: "",
    x: 4150,
    y: 810
  },
  {
    id: "a5-decision",
    code: "INT-A5-00 · RT-06",
    title: "最终行动",
    type: "interaction",
    chapter: "act5",
    description: "自由弹幕被识别为播放母带或切断电源；模糊回答会追问。",
    notes: "",
    x: 4150,
    y: 1040
  },
  {
    id: "ending-e1",
    code: "PRE-E1-01 / 02",
    title: "结局 E1《换人》",
    type: "ending",
    chapter: "act5",
    description: "林岚被留在监视器主持位，林秋走入现实，红衣女人仍在反光中。",
    notes: "",
    x: 3910,
    y: 1320
  },
  {
    id: "ending-e3",
    code: "PRE-E3-01 / 02",
    title: "结局 E3《停播》",
    type: "ending",
    chapter: "act5",
    description: "林岚断电毁带并离开电视台，随后返回青河同城论坛。",
    notes: "",
    x: 4390,
    y: 1320
  },
  {
    id: "ending-forum",
    code: "UI-E3-ENDING-FORUM",
    title: "《停播》论坛尾声",
    type: "ending",
    chapter: "act5",
    description: "熄灭的13号屏仍映出人影，玩家用户名留下“里面好像还有人在直播”。",
    notes: "",
    x: 4390,
    y: 1570
  }
];

const chain = (...ids: string[]): StoryEdge[] =>
  ids.slice(0, -1).map((from, index) => ({
    id: `edge-${from}-${ids[index + 1]}`,
    from,
    to: ids[index + 1]
  }));

export const initialEdges: StoryEdge[] = [
  ...chain("web-cover", "web-attachments", "web-join", "pre-g", "a1-tv", "a1-alert", "a1-warning", "a1-disconnect", "a1-route"),
  { id: "edge-attachments-optional", from: "web-attachments", to: "web-optional", label: "可选" },
  { id: "edge-optional-join", from: "web-optional", to: "web-join", label: "返回" },
  { id: "edge-route-control-direct", from: "a1-route", to: "a2-predict", label: "去控制室｜直接进入现有 PRE" },
  { id: "edge-route-runtime-new", from: "a1-route", to: "a1-route-runtime-new", label: "演播厅 / 大厅" },
  { id: "edge-runtime-studio-new", from: "a1-route-runtime-new", to: "a1-evidence-studio-new", label: "演播厅" },
  { id: "edge-runtime-lobby-new", from: "a1-route-runtime-new", to: "a1-evidence-lobby-new", label: "大厅" },
  { id: "edge-studio-return-new", from: "a1-evidence-studio-new", to: "a1-return-control-new", label: "取证后听见异响" },
  { id: "edge-lobby-return-new", from: "a1-evidence-lobby-new", to: "a1-return-control-new", label: "取证后听见异响" },
  { id: "edge-return-a2-new", from: "a1-return-control-new", to: "a2-predict", label: "决定去控制室" },
  { id: "edge-route-early", from: "a1-route", to: "early-ending", label: "立即离开" },
  ...chain("a2-predict", "a2-verify", "a2-record", "a2-identity", "a2-studio", "a3-tape"),
  { id: "edge-verify-breaker", from: "a2-verify", to: "a2-breaker", label: "可选查档" },
  { id: "edge-breaker-record", from: "a2-breaker", to: "a2-record", label: "发送证据" },
  ...chain("a3-tape", "a3-mother", "a3-message", "a3-loop", "a3-event", "a3-investigation"),
  { id: "edge-invest-evidence", from: "a3-investigation", to: "a3-evidence", label: "完成调查" },
  { id: "edge-invest-skip", from: "a3-investigation", to: "a3-skip", label: "确认跳过" },
  ...chain("a3-evidence", "a3-archive", "a3-return", "a4-calibrate"),
  { id: "edge-skip-return", from: "a3-skip", to: "a3-return", label: "汇合" },
  ...chain("a4-calibrate", "a4-identity", "a4-warning", "a4-search", "a4-unsent", "a4-double", "a4-belief", "a5-memory", "a5-conflict", "a5-afterimage", "a5-question", "a5-decision"),
  { id: "edge-decision-e1", from: "a5-decision", to: "ending-e1", label: "播放母带" },
  { id: "edge-decision-e3", from: "a5-decision", to: "ending-e3", label: "切断电源" },
  { id: "edge-e3-forum", from: "ending-e3", to: "ending-forum", label: "返回论坛" }
];
