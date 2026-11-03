# 序章、第一幕与第二幕视频资产

## 已整理目录

- `prologue/`：桌面编号1、2的序章素材；
- `act-01/`：第一幕预制视频与等待素材；
- `act-02/`：第二幕三条合并PRE与两个交互等待循环；
- `runtime-references/`：RT-00、RT-01、RT-02和单段RT-02B使用的参考图；
- `generated/`：游戏运行时生成并规格化后的H3视频缓存。

所有项目内MP4均已统一为1920×1080、24fps、H.264视频和AAC音频。桌面原文件未修改。

## 第一幕实际播放顺序

```text
01
→ 02
→ PRE-A1-01
→ INT-A1-00
→ SYS-A1-00循环并生成RT-00
→ RT-00
→ PRE-A1-02+PRE-A1-03
→ PRE-A1-04
→ PRE-A1-05
→ INT-A1-01
→ INS-A1-06G播放一次并生成RT-01
→ 等待INS-A1-06G完整结束
→ RT-01
→ 路线Runtime抵达控制室
→ PRE-A2-02+PRE-A2-03+PRE-A2-04
→ INT-A2-01并生成RT-02及RTP-A2-07A～D之一
→ PRE-A2-05+PRE-A2-06
→ INT-A2-02并生成单条10秒RT-02B
→ PRE-A2-09+PRE-A2-10
→ 第三幕制作边界
```

## 关键文件

- `first-act-assembly-manifest.json`：程序可读取的节点编排；
- `first-act-runtime-prompts.md`：Runtime全局风格前缀、参考图规则及RT-00/RT-01动态提示词；
- `runtime-references/PROVENANCE.md`：H3参考图与生成资产来源记录。

## 接入注意

- `SYS-A1-00`可以循环；
- `PRE-A1-06`已从游戏流程移除；
- `INS-A1-06G`只能播放一次，播放结束后保持尾帧；即使RT-01提前生成完成，也必须等本镜完整结束后才能切入；
- `SYS-A2-01-wait`和`SYS-A2-02-wait`为静态连续帧循环，只遮挡Runtime生成时间；
- 玩家提交后应立即请求Runtime视频，等待素材仅用于遮挡生成时间；
- Runtime参考图必须取自玩家最后实际看到的镜头状态。
