# Mumble Voice Lab

**中文** | [English](README.en.md)

面向游戏项目的浏览器角色碎碎念 / gibberish 语音生成器。输入一句台词，选择角色、情绪和说话风格，即可实时试听，并导出 deterministic WAV + JSON schedule。

**在线体验：** [nightt5879.github.io/mumble-voice-lab](https://nightt5879.github.io/mumble-voice-lab/?v=1.4.0-engine-alpha)

**GitHub 仓库：** [github.com/nightt5879/mumble-voice-lab](https://github.com/nightt5879/mumble-voice-lab)

**当前版本：** V1.4.0 Engine Integration Alpha，新增 CLI renderer、schedule schema 1.0、已闭环验证的 Unity 本地 UPM 插件 alpha，以及 Godot addon preview，用于编辑器内生成游戏资产。

Mumble Voice Lab **不是 TTS**，不会真正朗读文字内容。它只借用文字长度、标点、中英文节奏、短语结构和句尾语调，生成短促的类音节 blip，让角色听起来像正在用自己的语言说话。

适合 cozy RPG、独立游戏、视觉小说、怪物 / 生物游戏、NPC 对话系统原型，以及任何需要“角色在说话，但不是现实语言朗读”的项目。

## 在线试听

想快速感受不同角色、情绪、说话风格、中文、英文和中英混合效果，可以直接打开在线试听页：

**[打开 12 条样例试听页](https://nightt5879.github.io/mumble-voice-lab/showcase.html?v=1.4.0-engine-alpha)**

试听页里包含 Cute NPC、Robot Guard、Tiny Creature、Tired Villager、Monster 等角色，每张卡片配上 V1.2.0 引入的角色虚拟形象；工具内还有 Soft Mascot、Talkative Merchant、Forest Spirit、Deep Boss 等音色方向。

## 功能亮点

- 纯浏览器运行，无后端。
- 使用 Web Audio API 实时生成角色 mumble / gibberish 语音。
- 支持中文、英文和中英混写，例如 `你好 adventurer，ready?`。
- 中文支持分词、声调微韵律、语气词和标点节奏。
- 英文使用 syllable count 估算类音节数量。
- 角色 preset、情绪、说话风格和强度可叠加。
- V1.4.0 Engine Integration Alpha：通过 CLI 生成可进游戏项目的 WAV + schedule JSON，Unity 本地 UPM 插件可导入并用 reveal events 同步字幕 / 打字机效果。
- V1.3.0 新增"我的角色"自定义库：调好参数一键保存到本地（localStorage），下次打开还在；可导出为 JSON 配置文件分享 / 备份，也可从文件导入别人的调音。
- V1.2.0 全新 cozy 贴纸视觉系统：2px 墨线 + 硬偏移阴影 + 暖纸底色，9 个角色配独特 SVG 虚拟形象。
- V1.2.0 新增"多人同时讲话"面板：勾选多个角色、每行一句台词，一键全员同时开口，制造人声鼎沸场景。
- V1.1.0 优化了 ring modulation、包络和连续音节衔接，降低低频/高频 preset 的爆音和硬切感。
- 高级参数附带简短说明，便于判断会影响音高、节奏、粗糙度、亮度、连续性还是音量。
- 同文本 + 同 preset + 同 seed + 同 expression 会生成相同 schedule。
- 支持导出 WAV 和 JSON，方便游戏项目复用。
- UI 支持中文 / English 切换。

## 可以复制测试的台词

```text
早上好，旅行者！准备出发了吗？
```

```text
等一下啊，我们真的要进去吗？
```

```text
Good morning, traveler! Ready?
```

```text
你好 adventurer，今天的 quest 准备好了吗？
```

## 游戏引擎接入 Alpha

V1.4.0 是第一版面向引擎的发布。它适合本地项目测试和内部管线验证，但还不是 Unity Asset Store / Godot Asset Library 级别的商店稳定包。

- CLI renderer：`npm run mvl -- render --text "Good morning!" --preset cute-npc --out-dir out` 会生成 WAV 和 `mumble-voice-lab/schedule` 1.0 JSON。
- Unity verified alpha：把 `integrations/unity/com.nightt5879.mumble-voice-lab` 作为本地 UPM package 加进 Unity，先在仓库根目录执行 `npm install`，再打开 `Tools > Mumble Voice Lab`，设置 CLI root 为本仓库路径，即可单条或批量生成对白资产。
- Godot experimental preview：把 `integrations/godot/addons/mumble_voice_lab` 复制到 Godot 4 项目，复用同一套 CLI 和 schedule 协议；在完成 Godot 编辑器闭环测试前只标记为 preview。
- 运行时范围：引擎里播放的是已生成资产，`MumbleVoicePlayer` 负责派发 reveal events 给字幕 / 打字机 UI。玩家运行时输入任意文字并实时合成不属于这版 alpha。
- 打包限制：alpha 版依赖本机 Node/npm；免 Node renderer 打包是下一阶段目标。

详细接入、人工 QA 和常见问题见 [docs/integrations.md](docs/integrations.md)。发布记录见 [CHANGELOG.md](CHANGELOG.md)。

## Roadmap

### 1. 优化发声连贯性（V1.1.0 完成）

V1.1.0 已优化 blip 之间的衔接、包络、淡入淡出和整体流畅度。低频怪物、高频小生物、机器人调制音色在连续播放时会更少出现“啪”“咔”和硬切感。

### 2. 支持更多音色（V1.1.0 完成）

目前已有可爱 NPC、机器人守卫、小生物、疲惫村民、怪物等基础角色音色。V1.1.0 新增软萌吉祥物、话多商人、森林精灵、低沉 Boss 等少量高质量 preset，覆盖更多常用游戏角色方向。

### 3. 完整 UI 升级与多人场景（V1.2.0 完成）

V1.2.0 重做了整套界面：cozy 贴纸视觉系统、9 个角色独立 SVG 虚拟形象、单屏紧凑布局。新增"多人同时讲话"面板，可勾选任意角色组合 + 每人多句台词，一键全员开口，起声 0–0.18s 错开避免硬同步，混音自动减幅防削峰。试听页样例也用真实 v1.1 音频管线重新生成，所听即所得。

### 4. 我的角色：自定义保存与配置分享（V1.3.0 完成）

V1.3.0 让 demo 变成"真正可用的工具"。在高级面板调好参数后可一键保存为"我的角色"，自动持久化到 localStorage，下次打开还在；任意角色（包括官方 preset）可导出为 `mumble-voice-lab/preset` 1.0 schema 的 JSON 文件，方便分享、备份和跨设备同步；同样的文件支持点"导入配置"加回库。已保存的卡片接在官方 preset 之后，带星形角标 + hover 浮现导出 / 删除按钮。

### 5. 游戏引擎接入 alpha（V1.4.0 完成）

V1.4.0 已交付第一版“从网页工具到游戏引擎”的实际工作流：CLI renderer、`mumble-voice-lab/schedule` 1.0 文件、Unity 本地 UPM 插件 alpha、运行时 reveal-event 播放，以及 Godot addon preview。下一步是免 Node renderer 打包、Godot 编辑器闭环验证，以及 Unity/Godot 商店发布包装。

## 本地开发

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

用 CLI 生成可进游戏项目的 WAV + schedule JSON：

```bash
npm run mvl -- render --text "Good morning, traveler! Ready?" --preset cute-npc --out-dir out
npm run mvl -- batch --input dialogue.csv --out-dir out
```

Unity / Godot alpha 接入文档见 [docs/integrations.md](docs/integrations.md)。

重新生成在线试听页样例：

```bash
npm run samples
```

## 开源协议

Copyright 2026 nightt5879.

代码使用 [Apache License 2.0](LICENSE) 开源。

使用 Mumble Voice Lab 生成的音频、JSON schedule 和其他输出内容，可以自由用于个人、商业和开源游戏项目。
