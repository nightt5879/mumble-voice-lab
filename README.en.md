# Mumble Voice Lab

[中文](README.md) | **English**

Mumble Voice Lab is a browser-based character mumble / gibberish voice generator for games. Type a line, choose a character, tune emotion and speaking style, preview instantly, then export deterministic WAV + JSON schedules.

**Live Demo:** [nightt5879.github.io/mumble-voice-lab](https://nightt5879.github.io/mumble-voice-lab/?v=1.2.0-cozy)

**GitHub Repository:** [github.com/nightt5879/mumble-voice-lab](https://github.com/nightt5879/mumble-voice-lab)

**Current version:** V1.2.0 cozy redesign, with a sticker-style visual system, expressive per-character avatars for all nine presets, a single-screen compact layout, a new Crowd Chatter panel, and showcase samples regenerated through the live audio pipeline.

Mumble Voice Lab is **not TTS**. It does not pronounce real words. Instead, it borrows text length, punctuation, Chinese/English rhythm, phrase shape, and sentence endings to create short syllable-like blips that feel like a character is speaking in their own language.

It is designed for cozy RPGs, indie games, visual novels, creature games, NPC dialogue prototypes, and any project that needs expressive character dialogue sounds without real speech synthesis.

## Listen Online

To quickly hear the range of character presets, emotions, speaking styles, Chinese, English, and mixed-language lines, open the online listening page:

**[Open the 12-clip listening showcase](https://nightt5879.github.io/mumble-voice-lab/showcase.html?v=1.2.0-cozy)**

Each card on the showcase now leads with the matching V1.2.0 character avatar. The lineup includes Cute NPC, Robot Guard, Tiny Creature, Tired Villager, and Monster presets; the full tool also ships Soft Mascot, Talkative Merchant, Forest Spirit, and Deep Boss voice directions.

## Features

- Runs entirely in the browser, with no backend.
- Generates game-like mumble voices with the Web Audio API.
- Supports Chinese, English, and mixed lines such as `你好 adventurer，ready?`.
- Chinese rhythm uses segmentation, subtle tone shaping, particles, and punctuation pauses.
- English uses syllable counting to estimate pseudo-syllable events.
- Character presets can be layered with emotion, speaking style, and intensity.
- V1.2.0 cozy sticker visual system: 2px ink outlines, hard-offset shadows, warm paper canvas, with one expressive SVG avatar per character preset.
- V1.2.0 Crowd Chatter panel: pick any subset of the nine presets, write multiple lines per row, and play them all together for a tavern-room feel.
- V1.1.0 smooths ring modulation, envelopes, and adjacent syllable timing to reduce pops and hard cuts in low/high presets.
- Advanced parameters include short descriptions for pitch, rhythm, roughness, brightness, continuity, and level controls.
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
你好 adventurer，今天的 quest 准备好了吗？
```

## Roadmap

### 1. Improve playback continuity (shipped in V1.1.0)

V1.1.0 improves transitions, envelopes, fades, and adjacent syllable timing. Low monster voices, high tiny voices, and modulated robot voices should produce fewer clicks, pops, and hard cuts during connected playback.

### 2. Add more voice colors (shipped in V1.1.0)

The project includes basic presets such as Cute NPC, Robot Guard, Tiny Creature, Tired Villager, and Monster. V1.1.0 added a smaller set of higher-quality presets: Soft Mascot, Talkative Merchant, Forest Spirit, and Deep Boss.

### 3. Full UI overhaul + crowd scenes (shipped in V1.2.0)

V1.2.0 rebuilt the whole studio: a cozy sticker-style visual system, nine distinct SVG character avatars, and a single-screen compact layout. A new Crowd Chatter panel lets you pick any subset of presets, type multiple lines per row, and fire them all on the same tick — speakers are deterministically staggered by 0–0.18s to avoid hard sync, and the mix is auto-attenuated to keep the limiter quiet. The 12 showcase samples are also regenerated through the real v1.1 audio pipeline so what you hear is what the live demo produces.

### 4. Improve game development integration

Future work will strengthen the workflow from browser tool to game project. The goal is to make generated parameters, JSON schedules, WAV files, and character presets easier to reuse in RPGs, visual novels, dialogue systems, Unity, Godot, and web game prototypes.

## Local Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Regenerate online listening samples:

```bash
npm run samples
```

## License

Copyright 2026 nightt5879.

Code is released under the [Apache License 2.0](LICENSE).

Audio files, JSON schedules, and other outputs generated with Mumble Voice Lab may be used freely in personal, commercial, and open-source game projects.
