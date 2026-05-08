# Mumble Voice Lab for Godot

Godot 4.6 addon for generating game-ready Mumble Voice Lab dialogue assets from
the editor.

This `0.2.0` release is Windows-first and includes a bundled renderer at
`addons/mumble_voice_lab/bin/win-x64/mvl-renderer-win-x64.exe`, so normal Godot
users do not need Node/npm. The Node CLI mode remains available as a developer
fallback.

## Setup

1. Copy `addons/mumble_voice_lab` into a Godot 4.6 project.
2. Enable **Mumble Voice Lab** in `Project > Project Settings > Plugins`.
3. Open the **Mumble Voice Lab** dock.
4. Keep renderer mode on **Auto** for the bundled Windows renderer.
5. Generate dialogue into `res://mumble_voice_lab/generated`.

The addon creates:

- `*.wav`
- `*.mumble.json`
- `*.tres` `MumbleDialogueClip` resources

## Runtime

Add an `AudioStreamPlayer` and `MumbleVoicePlayer` to your scene. Assign a
generated `MumbleDialogueClip` to `MumbleVoicePlayer.dialogue_clip`, then call
`play()`.

Signals:

- `text_changed(text: String)`
- `reveal_event(event: Dictionary)`
- `playback_complete`

The previous preview fields, `audio_stream` and `schedule_path`, are still
supported for compatibility.

## Batch Input

CSV:

```csv
id,text,preset,presetFile,emotion,style,intensity,seed
guard-warning,"Gate opening in three seconds!",robot-guard,,angry,shout,85,
```

JSON can be either an array or an object with an `items` array.

## Troubleshooting

- On Windows, **Auto** mode should find the bundled renderer.
- On macOS/Linux, this release shows a clear "renderer not bundled" message. Use
  **Node CLI fallback** for development on those platforms.
- If Node CLI fallback is selected, set **CLI root** to the Mumble Voice Lab
  repository folder containing `package.json` and `scripts/mvl.ts`.
- If audio is silent, confirm your scene has an active audio output device, the
  `AudioStreamPlayer` is assigned, and the generated WAV plays outside Godot.

## License

Mumble Voice Lab is Apache-2.0. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.
