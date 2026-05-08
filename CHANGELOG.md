# Changelog

## v1.5.0 - Godot Store Ready

V1.5.0 moves the Godot addon from preview to a Windows-first store-ready
candidate. Unity remains alpha.

### Added

- Added a Windows no-Node renderer at
  `integrations/godot/addons/mumble_voice_lab/bin/win-x64/mvl-renderer-win-x64.exe`.
- Added `MumbleDialogueClip` Godot resources and `.tres` generation.
- Added `build:renderer:win`, `test:renderer`, and `test:godot` scripts.
- Added Godot Asset Library materials: addon-local `README.md`, `LICENSE`,
  `THIRD_PARTY_NOTICES.md`, and `icon.png`.

### Changed

- Godot addon version is now `0.2.0`.
- Godot dock defaults to Auto mode, using the bundled Windows renderer first.
- Node CLI remains available as a developer fallback.
- `MumbleVoicePlayer` now prefers `MumbleDialogueClip` while keeping
  `audio_stream + schedule_path` compatibility.

### Verified

- Node CLI tests.
- Web production build.
- Windows renderer parity against Node CLI schedule output.
- Godot 4.6.1 headless import, script parse, renderer generation, reveal signals,
  and playback completion smoke test.

## v1.4.0 - Engine Integration Alpha

V1.4.0 introduces the first game-engine integration workflow. The browser tool
remains the stable surface, while the CLI and Unity package are alpha surfaces
intended for local project validation.

### Stable

- Web studio, realtime preview, WAV export, preset JSON export/import, and the
  V1.3.0 My Presets workflow remain supported.
- Schedule JSON export now uses `schema: "mumble-voice-lab/schedule"` and
  `schemaVersion: "1.0"` for engine import.

### Alpha

- Added `npm run mvl -- render` for single-line WAV + schedule generation.
- Added `npm run mvl -- batch` for JSON/CSV dialogue batch generation.
- Added the local Unity UPM package at
  `integrations/unity/com.nightt5879.mumble-voice-lab`.
- Added Unity runtime APIs:
  `MumbleDialogueClip`, `MumblePresetAsset`, `MumbleVoicePlayer`,
  `onTextChanged`, `onReveal`, and `onPlaybackComplete`.
- Added Unity editor tooling at `Tools > Mumble Voice Lab` for single and batch
  generation.

### Preview

- Added a Godot 4 addon preview at `integrations/godot/addons/mumble_voice_lab`.
- Godot uses the same CLI and schedule JSON protocol as Unity.
- Godot should remain labeled preview until a Godot editor closed-loop test is
  completed.

### Known Limits

- Engine packages require local Node/npm in this alpha.
- Runtime engine playback uses generated assets only.
- Player runtime free-text synthesis, no-Node renderer bundles, and store
  packaging are planned follow-up work.
