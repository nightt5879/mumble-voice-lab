# Mumble Voice Lab

**中文** | [English](#english)

面向游戏项目的浏览器角色碎碎念 / gibberish 语音生成器。输入一句台词，选择角色、情绪和说话风格，即可实时试听，并导出 deterministic WAV + JSON schedule。

**在线 Demo:** [nightt5879.github.io/mumble-voice-lab](https://nightt5879.github.io/mumble-voice-lab/)

Mumble Voice Lab **不是 TTS**，不会真正朗读文字内容。它只借用文字长度、标点、中英文节奏、短语结构和句尾语调，生成短促的类音节 blip，让角色听起来像正在用自己的语言说话。适合 cozy RPG、独立游戏、视觉小说、怪物/生物游戏和对话系统原型。

## 直接试听

GitHub 仓库 README 会过滤内嵌音频播放器标签，所以这里提供可以直接打开播放的 WAV 链接；浏览器打开后会显示音频播放控件。想看更完整的 12 条角色、情绪、中英混合 showcase，可以打开 [在线试听页](https://nightt5879.github.io/mumble-voice-lab/listen.html)。

| 角色 / 表达 | 台词 | 试听 |
| --- | --- | --- |
| Cute NPC / Happy | `早上好，旅行者！准备出发了吗？` | [播放 WAV](https://nightt5879.github.io/mumble-voice-lab/samples/cute-npc-happy-zh.wav) |
| Robot Guard / Formal | `Good morning, traveler! Ready?` | [播放 WAV](https://nightt5879.github.io/mumble-voice-lab/samples/robot-guard-formal-en.wav) |
| Monster / Scared | `你听到了吗？刚才那边好像有什么声音。` | [播放 WAV](https://nightt5879.github.io/mumble-voice-lab/samples/monster-scared-zh.wav) |

## 功能亮点

- 纯浏览器运行，无后端。
- 使用 Web Audio API 实时生成角色 mumble / gibberish 语音。
- 支持中文、英文和中英混写，例如 `你好 adventurer，ready?`。
- 中文支持分词、声调微韵律、语气词和标点节奏。
- 英文使用 syllable count 估算类音节数量。
- 角色 preset、情绪、说话风格和强度可叠加。
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
你好 adventurer，ready?
```

## 本地开发

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

重新生成 README 试听样例：

```bash
npm run samples
```

## 开源协议

Copyright 2026 nightt5879.

代码使用 [Apache License 2.0](LICENSE) 开源。

使用 Mumble Voice Lab 生成的音频、JSON schedule 和其他输出内容，可以自由用于个人、商业和开源游戏项目。

---

## English

**Mumble Voice Lab** is a browser-based character mumble / gibberish voice generator for games. Type a line, choose a character, tune emotion and speaking style, preview instantly, then export deterministic WAV + JSON schedules.

**Live Demo:** [nightt5879.github.io/mumble-voice-lab](https://nightt5879.github.io/mumble-voice-lab/)

Mumble Voice Lab is **not TTS**. It does not pronounce real words. Instead, it borrows text length, punctuation, Chinese/English rhythm, phrase shape, and sentence endings to create short syllable-like blips that feel like a character is speaking in their own language.

## Listen

GitHub repository READMEs strip embedded audio player tags, so these links open playable WAV files directly in the browser. For the full 12-clip showcase with character presets, emotions, Chinese, English, and mixed-language examples, open the [online listen page](https://nightt5879.github.io/mumble-voice-lab/listen.html).

| Character / expression | Line | Listen |
| --- | --- | --- |
| Cute NPC / Happy | `早上好，旅行者！准备出发了吗？` | [Play WAV](https://nightt5879.github.io/mumble-voice-lab/samples/cute-npc-happy-zh.wav) |
| Robot Guard / Formal | `Good morning, traveler! Ready?` | [Play WAV](https://nightt5879.github.io/mumble-voice-lab/samples/robot-guard-formal-en.wav) |
| Monster / Scared | `你听到了吗？刚才那边好像有什么声音。` | [Play WAV](https://nightt5879.github.io/mumble-voice-lab/samples/monster-scared-zh.wav) |

## Features

- Runs entirely in the browser, with no backend.
- Generates game-like mumble voices with the Web Audio API.
- Supports Chinese, English, and mixed lines such as `你好 adventurer，ready?`.
- Chinese rhythm uses segmentation, subtle tone shaping, particles, and punctuation pauses.
- English uses syllable counting to estimate pseudo-syllable events.
- Character presets can be layered with emotion, speaking style, and intensity.
- Deterministic output: same text + preset + seed + expression gives the same schedule.
- Exports playable WAV files and reusable JSON schedules.
- Bilingual UI: 中文 / English.

## Try These Lines

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
你好 adventurer，ready?
```

## Local Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Regenerate README audio samples:

```bash
npm run samples
```

## License

Copyright 2026 nightt5879.

Code is released under the [Apache License 2.0](LICENSE).

Audio files, JSON schedules, and other outputs generated with Mumble Voice Lab may be used freely in personal, commercial, and open-source game projects.
