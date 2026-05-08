# Changelog

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
