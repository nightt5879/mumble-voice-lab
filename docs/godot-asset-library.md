# Godot Asset Library Submission Notes

Use these values for the first Windows-first submission candidate.

- Asset Name: `Mumble Voice Lab`
- Category: `Addons`
- Godot Version: `4.6`
- Version: `0.2.0`
- License: `Apache-2.0`
- Repository: `https://github.com/nightt5879/mumble-voice-lab`
- Addon path: `addons/mumble_voice_lab`
- Icon URL format:
  `https://raw.githubusercontent.com/nightt5879/mumble-voice-lab/<branch>/integrations/godot/addons/mumble_voice_lab/icon.png`

Suggested description:

```text
Mumble Voice Lab generates game-ready mumble/gibberish dialogue assets from the
Godot editor. It creates WAV audio, schedule JSON, and MumbleDialogueClip
resources for subtitle/typewriter reveal timing. This Windows-first release
includes a bundled renderer, so normal users do not need Node/npm. macOS and
Linux users can use the Node CLI fallback for development.
```

Before submitting:

1. Run `npm run build:renderer:win`.
2. Run `npm run test:cli`, `npm run test:renderer`, `npm run test:godot`, and `npm run build`.
3. Run `npm run package:godot` to prepare `dist-godot-assetlib/addons/mumble_voice_lab`.
4. Create a submission branch or tag from that prepared folder.
5. Use a raw GitHub URL for `icon.png`.
