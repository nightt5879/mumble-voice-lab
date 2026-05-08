# Mumble Voice Lab for Godot

Experimental Godot 4 addon preview for generating Mumble Voice Lab WAV and
schedule JSON files. It shares the V1.4.0 CLI/schedule protocol with the Unity
package, but should remain marked preview until a Godot editor closed-loop test is
completed.

## Setup

1. Copy `addons/mumble_voice_lab` into a Godot project.
2. Enable **Mumble Voice Lab** in `Project > Project Settings > Plugins`.
3. In the dock, set **CLI root** to the repository folder containing `package.json` and `scripts/mvl.ts`.
4. Run `npm install` in that repository folder.

The addon calls:

```bash
npx tsx scripts/mvl.ts render
```

Generated files are written to `res://mumble_voice_lab/generated` by default.

## Runtime

Use `MumbleVoicePlayer` with an `AudioStreamPlayer` node. Assign the generated
WAV as `audio_stream`, assign the generated schedule JSON path, then call `play()`.
Connect `text_changed` for typewriter text and `reveal_event` for per-token hooks.

## Preview Verification Checklist

Before calling this addon verified:

- enable/disable the addon in a Godot 4 project
- confirm the dock loads
- generate WAV + schedule JSON assets
- play a generated asset through `MumbleVoicePlayer`
- confirm `text_changed`, `reveal_event`, and `playback_complete` signals fire
- export a test project and confirm generated resources still load

## Current Limits

- Requires local Node/npm and this repository checkout.
- Runtime playback uses generated assets only.
- No store packaging or no-Node renderer bundle is included in this preview.
