# Mumble Voice Lab

[中文](README.md) | **English**

Mumble Voice Lab is a browser-based character mumble / gibberish voice generator for games. Type a line, choose a character, tune emotion and speaking style, preview instantly, then export deterministic WAV + JSON schedules.

**Live Demo:** [nightt5879.github.io/mumble-voice-lab](https://nightt5879.github.io/mumble-voice-lab/?v=1.0.2-theme-cache)

**GitHub Repository:** [github.com/nightt5879/mumble-voice-lab](https://github.com/nightt5879/mumble-voice-lab)

**Current version:** V1.0.2 theme/cache patch, fixing stronger light/dark contrast and cache-busted GitHub Pages links.

Mumble Voice Lab is **not TTS**. It does not pronounce real words. Instead, it borrows text length, punctuation, Chinese/English rhythm, phrase shape, and sentence endings to create short syllable-like blips that feel like a character is speaking in their own language.

It is designed for cozy RPGs, indie games, visual novels, creature games, NPC dialogue prototypes, and any project that needs expressive character dialogue sounds without real speech synthesis.

## Listen Online

To quickly hear the range of character presets, emotions, speaking styles, Chinese, English, and mixed-language lines, open the online listening page:

**[Open the 12-clip listening showcase](https://nightt5879.github.io/mumble-voice-lab/showcase.html?v=1.0.2-theme-cache)**

The showcase includes Cute NPC, Robot Guard, Tiny Creature, Tired Villager, and Monster presets, plus expression directions such as Happy, Whisper, Shout, Chant, Nervous, Sleepy, Sad, Scared, and Angry.

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
你好 adventurer，今天的 quest 准备好了吗？
```

## Roadmap

### 1. Improve playback continuity

Current mumble voices can sometimes feel slightly choppy between characters or syllable blips. Future work will focus on smoother transitions, envelopes, fades, and overall continuity so character dialogue feels more natural and expressive.

### 2. Add more voice colors

The project currently includes basic presets such as Cute NPC, Robot Guard, Tiny Creature, Tired Villager, and Monster. Future versions will add more voice directions, including softer characters, more mechanical voices, deeper monsters, stranger tiny creatures, and presets for different game styles.

### 3. Improve game development integration

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
