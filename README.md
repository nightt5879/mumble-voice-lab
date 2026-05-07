# Mumble Voice Lab

**中文** | [English](README.en.md)

面向游戏项目的浏览器角色碎碎念 / gibberish 语音生成器。输入一句台词，选择角色、情绪和说话风格，即可实时试听，并导出 deterministic WAV + JSON schedule。

**在线体验：** [nightt5879.github.io/mumble-voice-lab](https://nightt5879.github.io/mumble-voice-lab/?v=1.1.0-continuity-presets)

**GitHub 仓库：** [github.com/nightt5879/mumble-voice-lab](https://github.com/nightt5879/mumble-voice-lab)

**当前版本：** V1.1.0 continuity/preset update，优化连续发音、降低爆音风险，并加入更多角色音色。

Mumble Voice Lab **不是 TTS**，不会真正朗读文字内容。它只借用文字长度、标点、中英文节奏、短语结构和句尾语调，生成短促的类音节 blip，让角色听起来像正在用自己的语言说话。

适合 cozy RPG、独立游戏、视觉小说、怪物 / 生物游戏、NPC 对话系统原型，以及任何需要“角色在说话，但不是现实语言朗读”的项目。

## 在线试听

想快速感受不同角色、情绪、说话风格、中文、英文和中英混合效果，可以直接打开在线试听页：

**[打开 12 条样例试听页](https://nightt5879.github.io/mumble-voice-lab/showcase.html?v=1.1.0-continuity-presets)**

试听页里包含 Cute NPC、Robot Guard、Tiny Creature、Tired Villager、Monster 等角色；工具内还新增 Soft Mascot、Talkative Merchant、Forest Spirit、Deep Boss 等 V1.1.0 音色方向。

## 功能亮点

- 纯浏览器运行，无后端。
- 使用 Web Audio API 实时生成角色 mumble / gibberish 语音。
- 支持中文、英文和中英混写，例如 `你好 adventurer，ready?`。
- 中文支持分词、声调微韵律、语气词和标点节奏。
- 英文使用 syllable count 估算类音节数量。
- 角色 preset、情绪、说话风格和强度可叠加。
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

## Roadmap

### 1. 优化发声连贯性

V1.1.0 已优化 blip 之间的衔接、包络、淡入淡出和整体流畅度。低频怪物、高频小生物、机器人调制音色在连续播放时会更少出现“啪”“咔”和硬切感。

### 2. 支持更多音色

目前已有可爱 NPC、机器人守卫、小生物、疲惫村民、怪物等基础角色音色。V1.1.0 新增软萌吉祥物、话多商人、森林精灵、低沉 Boss 等少量高质量 preset，覆盖更多常用游戏角色方向。

### 3. 支持接入游戏开发

后续会加强“从网页工具到游戏项目”的工作流。目标是让生成的声音参数、JSON schedule、WAV 文件和角色 preset 更容易被游戏项目复用，方便接入 RPG、视觉小说、对话系统、Unity、Godot 或 Web 游戏原型中。

## 本地开发

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

重新生成在线试听页样例：

```bash
npm run samples
```

## 开源协议

Copyright 2026 nightt5879.

代码使用 [Apache License 2.0](LICENSE) 开源。

使用 Mumble Voice Lab 生成的音频、JSON schedule 和其他输出内容，可以自由用于个人、商业和开源游戏项目。
