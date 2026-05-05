# Mumble Voice Lab

Browser-based character mumble and gibberish voice design for games. Type a line, pick a character, tune the expression, and export deterministic WAV + JSON schedules.

**Live demo:** [nightt5879.github.io/mumble-voice-lab](https://nightt5879.github.io/mumble-voice-lab/)

Mumble Voice Lab is not TTS. It does not pronounce real words. Instead, it borrows timing, punctuation, Chinese/English rhythm, and phrase shape to create short syllable-like blips that feel like a cozy RPG, visual novel, creature game, or indie dialogue voice.

## Listen

These short WAV clips are generated examples from the project sound palette.

| Character / expression | Line | Preview |
| --- | --- | --- |
| Cute NPC / Happy | `早上好，旅行者！准备出发了吗？` | <audio controls src="public/samples/cute-npc-happy-zh.wav"></audio><br>[Open WAV](public/samples/cute-npc-happy-zh.wav) |
| Robot Guard / Formal | `Good morning, traveler! Ready?` | <audio controls src="public/samples/robot-guard-formal-en.wav"></audio><br>[Open WAV](public/samples/robot-guard-formal-en.wav) |
| Monster / Scared | `你听到了吗？刚才那边好像有什么声音。` | <audio controls src="public/samples/monster-scared-zh.wav"></audio><br>[Open WAV](public/samples/monster-scared-zh.wav) |

## What It Does

- Generates game-like mumble voices in the browser with the Web Audio API.
- Supports Chinese, English, and mixed lines like `你好 adventurer，ready?`.
- Uses text length and punctuation for timing, pauses, and phrase endings.
- Uses `jieba-wasm`, `pinyin-pro`, and `syllable` for better Chinese/English rhythm.
- Adds character presets, emotion, speaking style, and intensity controls.
- Keeps output deterministic: same text + preset + seed + expression gives the same event schedule.
- Exports playable WAV files and reusable JSON schedules for game projects.
- Provides a bilingual UI: 中文 / English.

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

## GitHub Pages

This repo includes a GitHub Pages workflow at `.github/workflows/pages.yml`.

After pushing to `main`, enable GitHub Pages in the repository settings:

1. Open **Settings -> Pages**.
2. Set **Source** to **GitHub Actions**.
3. Visit `https://nightt5879.github.io/mumble-voice-lab/`.

## License

Copyright 2026 nightt5879.

Code is released under the [Apache License 2.0](LICENSE).

Audio files, JSON schedules, and other outputs generated with Mumble Voice Lab may be used freely in personal, commercial, and open-source game projects.
