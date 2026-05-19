# Mumble Voice Lab

<p align="center">
  <img src="docs/assets/readme/mvl-hero.svg" width="920" alt="Mumble Voice Lab v1.5 hero">
</p>

<p align="center">
  <b>给游戏角色生成 mumble / gibberish 碎碎念音效。</b><br>
  不是 TTS，不朗读真实文字，而是把台词节奏变成可爱的角色语音、WAV 和字幕 reveal 时间轴。
</p>

<p align="center">
  <a href="https://github.com/nightt5879/mumble-voice-lab/releases/tag/v1.5.0"><img alt="Release" src="https://img.shields.io/badge/release-v1.5.0_godot_store--ready-f472b6?style=for-the-badge&labelColor=2a1f17"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache_2.0-fde68a?style=for-the-badge&labelColor=2a1f17"></a>
  <a href="#状态--反馈"><img alt="Godot" src="https://img.shields.io/badge/godot-windows--first-38bdf8?style=for-the-badge&labelColor=2a1f17"></a>
  <a href="#状态--反馈"><img alt="Unity" src="https://img.shields.io/badge/unity-alpha-f59e0b?style=for-the-badge&labelColor=2a1f17"></a>
</p>

<p align="center">
  <a href="https://nightt5879.github.io/mumble-voice-lab/?v=1.5.0-godot-store-ready"><b>▶ 在线体验</b></a>
  &nbsp;·&nbsp;
  <a href="https://nightt5879.github.io/mumble-voice-lab/showcase.html?v=1.5.0-godot-store-ready">♪ 12 条试听样例</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/nightt5879/mumble-voice-lab/releases/tag/v1.5.0">v1.5.0 Release</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/nightt5879/mumble-voice-lab/releases/download/v1.5.0/mumble-voice-lab-godot-0.2.0.zip">⤓ Godot 插件 zip</a>
  &nbsp;·&nbsp;
  <a href="docs/integrations.md">§ 引擎接入文档</a>
</p>

<p align="center">
  <b>中文</b> · <a href="README.md">English</a>
</p>

<p align="center">
  <img src="docs/assets/readme/divider-cute.svg" width="760" alt="">
</p>

## Studio 一览

<p align="center">
  <img src="docs/assets/readme/studio-screenshot.png" width="920" alt="Studio 界面：composer + 角色 preset + 实时预览">
</p>

<p align="center">
  <sub>左侧 Composer 输入台词、调情绪/风格/强度；右侧实时预览 blip 时间轴和分析数据；下方是 9 个角色 preset，再下面是 Sound Lab 高级参数抽屉。</sub>
</p>

---

## 这是什么？

**Mumble Voice Lab** 是一个面向游戏项目的浏览器角色碎碎念语音生成器。输入一句台词，选择角色、情绪和说话风格，就能实时试听并导出 **deterministic WAV + `mumble-voice-lab/schedule` JSON**。

它适合 cozy RPG、独立游戏、视觉小说、怪物 / 生物游戏、NPC 对话系统原型，以及任何需要"角色像在说话，但不是现实语言朗读"的项目。

> [!TIP]
> 占位台词可以中英混合，比如 `你好 adventurer，今天的 quest 准备好了吗？` —— 引擎会按字符密度和标点节奏生成 blip。

---

## 功能亮点

<table>
  <tr>
    <td width="50%" valign="top">
      <p><img src="docs/assets/readme/feature-not-tts.svg" width="150" alt=""></p>
      <p><b>不是 TTS</b><br>不合成真实朗读，而是根据文本长度、标点、中英文节奏和句尾语气生成类音节 blip。</p>
    </td>
    <td width="50%" valign="top">
      <p><img src="docs/assets/readme/feature-wav-json.svg" width="230" alt=""></p>
      <p><b>WAV + schedule JSON</b><br>导出可直接进游戏项目的音频，以及包含 <code>events</code> / <code>revealEvents</code> 的时间轴文件。</p>
    </td>
  </tr>
  <tr>
    <td valign="top">
      <p><img src="docs/assets/readme/feature-seed.svg" width="150" alt=""></p>
      <p><b>可复现输出</b><br>同文本 + 同 preset + 同 seed + 同 expression 会生成相同 schedule。</p>
    </td>
    <td valign="top">
      <p><img src="docs/assets/readme/feature-expression.svg" width="150" alt=""></p>
      <p><b>角色、情绪、风格叠加</b><br>preset 负责音色，emotion / style / intensity 负责表演状态。</p>
    </td>
  </tr>
  <tr>
    <td valign="top">
      <p><img src="docs/assets/readme/feature-reveal.svg" width="150" alt=""></p>
      <p><b>字幕 reveal events</b><br>运行时可以按时间点派发字幕、打字机效果和对话 UI 更新。</p>
    </td>
    <td valign="top">
      <p><img src="docs/assets/readme/feature-game-ready.svg" width="180" alt=""></p>
      <p><b>面向游戏资产</b><br>先在编辑器生成资产，游戏运行时只播放已生成 WAV 并同步文本。</p>
    </td>
  </tr>
</table>

---

## V1.5 引擎接入

<p align="center">
  <img src="docs/assets/readme/engine-flow.svg" width="620" alt="Editor → WAV / JSON → game flow">
</p>

| Unity alpha | Godot Windows-first | 编辑器生成面板 |
|---|---|---|
| <img src="docs/assets/readme/engine-unity-window.svg" width="245" alt=""><br>本地 UPM package。当前仍依赖本机 Node/npm，通过 `npx tsx scripts/mvl.ts` 调 CLI 生成资产。 | <img src="docs/assets/readme/engine-godot-window.svg" width="245" alt=""><br>Godot addon `0.2.0`。Windows 默认使用内置 `mvl-renderer-win-x64.exe`，普通用户不需要安装 Node。 | <img src="docs/assets/readme/engine-plugin-dock.svg" width="170" alt=""><br>在编辑器里输入文本、选择 preset / emotion / style，生成 `WAV + .mumble.json + MumbleDialogueClip .tres`。 |

> [!NOTE]
> **当前边界很明确：** 引擎运行时播放的是已生成资产；`MumbleVoicePlayer` 负责根据 `revealEvents` 同步字幕 / 打字机效果。玩家运行时输入任意文字并实时合成，不属于这版目标。

---

## 工作流程

<table>
  <tr>
    <td width="33%" valign="top" align="center">
      <img src="docs/assets/readme/workflow-01-input.svg" width="260" alt=""><br>
      <b>1. 输入台词</b><br>
      <sub>写一句 NPC 台词，可以是中文、英文或中英混合。</sub>
    </td>
    <td width="33%" valign="top" align="center">
      <img src="docs/assets/readme/workflow-02-analysis.svg" width="260" alt=""><br>
      <b>2. 分析节奏</b><br>
      <sub>根据文本长度、标点、短语和语言特征估算类音节事件。</sub>
    </td>
    <td width="33%" valign="top" align="center">
      <img src="docs/assets/readme/workflow-03-generate.svg" width="260" alt=""><br>
      <b>3. 生成 mumble 声音</b><br>
      <sub>用 preset + expression 生成角色化 blip 序列。</sub>
    </td>
  </tr>
  <tr>
    <td valign="top" align="center">
      <img src="docs/assets/readme/workflow-04-export.svg" width="260" alt=""><br>
      <b>4. 导出资产</b><br>
      <sub>写出 WAV 和 schedule JSON，批量对白也会生成 manifest。</sub>
    </td>
    <td valign="top" align="center">
      <img src="docs/assets/readme/workflow-05-sync.svg" width="260" alt=""><br>
      <b>5. 同步字幕</b><br>
      <sub><code>revealEvents</code> 给 UI 精确的 reveal 时间点。</sub>
    </td>
    <td valign="top" align="center">
      <img src="docs/assets/readme/workflow-06-gameplay.svg" width="260" alt=""><br>
      <b>6. 游戏中播放</b><br>
      <sub>Unity / Godot runtime 播放音频并派发 reveal 事件。</sub>
    </td>
  </tr>
</table>

---

## 快速开始

| 场景 | 用法 |
|---|---|
| **Web 工具** | 打开 [在线体验](https://nightt5879.github.io/mumble-voice-lab/?v=1.5.0-godot-store-ready)，输入台词后直接试听和导出。 |
| **CLI** | `npm run mvl -- render --text "Good morning, traveler! Ready?" --preset cute-npc --out-dir out` |
| **批量生成** | `npm run mvl -- batch --input dialogue.csv --out-dir out` |
| **Unity alpha** | 把 `integrations/unity/com.nightt5879.mumble-voice-lab` 作为本地 UPM package 加进 Unity，运行 `npm install`，再打开 `Tools > Mumble Voice Lab`。 |
| **Godot 0.2.0** | 下载 release 里的 Godot zip，或复制 `integrations/godot/addons/mumble_voice_lab` 到 Godot 4.6 项目，在插件面板启用。 |

<details>
<summary><b>Sound Lab · 高级参数（点开查看）</b></summary>

应用内的 Sound Lab 抽屉暴露 6 组可调参数（pitch · rhythm · roughness · brightness · continuity · level），以及 `pitchFallAtEnd` 这类全局开关。导出的 schedule JSON 会保留所有覆写值，所以同一段台词可以反复 reload 出完全相同的输出。

完整参数表见 [`docs/integrations.md`](docs/integrations.md#sound-lab-parameters)。

</details>

---

## 状态 & 反馈

| <img src="docs/assets/readme/ui-warning.svg" width="40" align="center"> | <img src="docs/assets/readme/ui-issue.svg" width="40" align="center"> | <img src="docs/assets/readme/ui-download.svg" width="40" align="center"> |
|---|---|---|
| **平台覆盖** | **反馈渠道** | **发布口径** |
| Godot Windows 已验证内置 renderer、headless 测试和人工播放；macOS / Linux 暂未内置 renderer，可用 Node CLI fallback 做开发测试。 | 复杂的 Unity / Godot 工程里可能遇到路径、导入、导出或运行时问题，欢迎在 [issue 区](https://github.com/nightt5879/mumble-voice-lab/issues) 提交复现步骤。 | Web 工具和导出协议稳定 · Unity `alpha` · Godot `windows-first store-ready candidate`，最终 Asset Library 审核以官方为准。 |

---

## 版本轨迹

| 版本 | 重点 |
|---|---|
| `V1.1.0` | 优化 blip 之间的衔接、包络、淡入淡出和整体流畅度。 |
| `V1.2.0` | 引入 cozy 贴纸视觉系统、角色头像和多人同时讲话面板。 |
| `V1.3.0` | 新增"我的角色"自定义 preset 保存、导出和导入。 |
| `V1.4.0` | 新增 CLI renderer、`schedule` JSON 1.0、Unity 本地 UPM 插件 alpha 和 Godot preview。 |
| **`V1.5.0`** ← 当前 | Godot 0.2.0 Windows-first：内置 renderer、`.tres` 对白资源、headless 闭环测试和 Asset Library 材料。 |

详细发布记录见 [CHANGELOG.md](CHANGELOG.md)，引擎接入和 QA 步骤见 [docs/integrations.md](docs/integrations.md)。

---

## 本地开发

```bash
# 安装依赖并启动 Vite
npm install
npm run dev
```

```bash
# 生产构建（输出到 dist/）
npm run build
```

```bash
# 重新生成在线试听页样例（12 条）
npm run samples
```

---

## 开源协议

Copyright 2026 nightt5879.

代码使用 [Apache License 2.0](LICENSE) 开源。

使用 Mumble Voice Lab 生成的音频、JSON schedule 和其他输出内容，可以自由用于个人、商业和开源游戏项目。

<p align="center">
  <img src="docs/assets/readme/divider-cute.svg" width="600" alt="">
</p>

<p align="center"><sub><i>cozy handmade tool · 2px ink · sticker shadow · 1 page</i></sub></p>
