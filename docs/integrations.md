# Engine Integration Alpha

Mumble Voice Lab V1.4.0 adds an editor-time asset pipeline for game engines. The
shared contract is simple: the CLI renders a WAV file plus a schedule JSON file,
and engine plugins import those generated files as normal project assets.

This release is an alpha for engine workflows. It is appropriate for local game
projects, internal tooling, and manual validation. It is not yet packaged as a
Unity Asset Store or Godot Asset Library release.

## Status

| Layer | Status | Notes |
| --- | --- | --- |
| Web tool | Stable | Existing browser studio, WAV export, preset JSON export/import. |
| CLI renderer | Alpha | Requires local Node/npm and this repository checkout. |
| Schedule schema | Stable alpha | `mumble-voice-lab/schedule` `1.0` is the engine interchange format. |
| Unity package | Verified alpha | Local UPM package has been batchmode smoke-tested and manually checked in Play Mode. |
| Godot addon | Experimental preview | Shares the CLI and runtime shape, but needs a Godot editor closed-loop test before "verified" wording. |

## Prerequisites

- Node/npm installed locally.
- From this repository root, run `npm install`.
- Engine plugins need the repository root path as their **CLI root**.
- Alpha packaging calls `npx tsx scripts/mvl.ts`; a no-Node renderer bundle is planned for a later release.

## CLI

Single render from the repository root:

```bash
npm run mvl -- render --text "Good morning, traveler! Ready?" --preset cute-npc --out-dir out
```

Useful options:

```bash
npm run mvl -- render \
  --text "Gate opening in three seconds!" \
  --preset robot-guard \
  --emotion angry \
  --style shout \
  --intensity 85 \
  --seed 42 \
  --out-dir out \
  --json
```

Outputs:

- `*.wav`
- `*.mumble.json`
- optional manifest JSON when `--manifest` is provided

Batch generation accepts JSON arrays, JSON objects with an `items` array, or CSV.

```csv
id,text,preset,presetFile,emotion,style,intensity,seed
guard-warning,"Gate opening in three seconds!",robot-guard,,angry,shout,85,
merchant-hello,"Fresh goods, just arrived!",talkative-merchant,,happy,normal,70,123
```

```bash
npm run mvl -- batch --input dialogue.csv --out-dir out
```

## Schedule Schema 1.0

Generated schedules use:

```json
{
  "schema": "mumble-voice-lab/schedule",
  "schemaVersion": "1.0",
  "generatorVersion": "1.4.0",
  "id": "guard-warning",
  "text": "Gate opening in three seconds!",
  "preset": {
    "id": "robot-guard",
    "name": "Robot Guard",
    "swatch": "#38bdf8",
    "params": {}
  },
  "expression": {
    "emotion": "angry",
    "style": "shout",
    "intensity": 85
  },
  "duration": 1.25,
  "sampleRate": 44100,
  "channels": 2,
  "events": [],
  "revealEvents": []
}
```

The actual file also includes `createdAt`, `expressionVersion`, `params`,
`resolvedParams`, and `analysis`. Engine runtimes should treat `events` as audio
timing metadata and `revealEvents` as the subtitle/typewriter sync source.

## Unity

Package path:

```text
integrations/unity/com.nightt5879.mumble-voice-lab
```

Install as a local Unity Package Manager package:

1. Open Unity Package Manager.
2. Choose **Add package from disk...**.
3. Select `integrations/unity/com.nightt5879.mumble-voice-lab/package.json`.
4. Open `Tools > Mumble Voice Lab`.
5. Set **CLI root** to this repository root.
6. Choose an output folder under `Assets`, enter text, select preset/expression, and click **Generate Asset**.

The editor generates:

- WAV imported as `AudioClip`
- schedule JSON imported as `TextAsset`
- `MumbleDialogueClip` ScriptableObject referencing both files

Runtime usage:

1. Add an `AudioSource` to a GameObject.
2. Add `MumbleVoicePlayer`.
3. Assign the generated `MumbleDialogueClip`.
4. Call `Play()`.
5. Connect `onTextChanged`, `onReveal`, and `onPlaybackComplete` for UI or gameplay hooks.

Batch generation:

- Use a CSV file with `id,text,preset,presetFile,emotion,style,intensity,seed`.
- Or use a JSON array / `{ "items": [...] }`.
- The Unity package delegates to `npm run mvl -- batch` and imports all generated assets.

### Unity Manual Closed-Loop Test

Use a disposable Unity project rather than committing test project files to this
repository.

1. Install the local UPM package.
2. Run `npm install` in this repository.
3. Create or open a manual test scene with an `AudioListener`.
4. Generate one clip from `Tools > Mumble Voice Lab`.
5. Add `AudioSource` + `MumbleVoicePlayer` to a GameObject.
6. Assign the generated `MumbleDialogueClip`.
7. Enter Play Mode and confirm the sound plays.
8. Watch `onTextChanged` output in UI or logs and confirm reveal timing advances with playback.
9. Stop playback and confirm it resets cleanly.

Batchmode smoke example:

```powershell
& "C:\Program Files\Unity\Hub\Editor\6000.3.14f1\Editor\Unity.exe" `
  -batchmode -quit `
  -projectPath "C:\Users\14692\Documents\UnityProjects\MumbleVoiceLabPluginTest" `
  -executeMethod MumbleVoiceLabPluginSmoke.Run `
  -logFile "C:\Users\14692\Documents\UnityProjects\MumbleVoiceLabPluginTest-smoke.log"
```

### Unity No-Sound Checklist

- Confirm the scene has exactly one active `AudioListener`, usually on the main camera.
- Confirm the Game view **Mute Audio** toggle is off.
- Confirm the Unity editor and system output device volume are not muted.
- Confirm the `AudioSource` has a generated `AudioClip`, volume above 0, and spatial blend set appropriately. For UI/dialogue tests, 2D playback is simplest.
- Confirm `MumbleVoicePlayer.Play()` is called after the `MumbleDialogueClip` is assigned.
- Confirm the generated WAV plays when opened directly outside Unity.

## Godot

Addon path:

```text
integrations/godot/addons/mumble_voice_lab
```

Preview setup:

1. Copy `addons/mumble_voice_lab` into a Godot 4 project.
2. Enable **Mumble Voice Lab** in `Project > Project Settings > Plugins`.
3. Set **CLI root** to this repository root.
4. Run `npm install` in this repository.
5. Generate WAV + schedule files into `res://mumble_voice_lab/generated`.

Runtime usage:

1. Add `MumbleVoicePlayer` with an `AudioStreamPlayer`.
2. Assign the generated WAV as `audio_stream`.
3. Assign the generated schedule JSON path.
4. Call `play()`.
5. Connect `text_changed`, `reveal_event`, and `playback_complete`.

Godot remains preview for V1.4.0 unless a separate Godot 4 test project verifies:

- addon enable/disable
- dock loading
- asset generation
- runtime playback
- reveal signals
- exported project resource loading

## Release QA Checklist

- `npm run test:cli`
- `npm run build`
- `npm run mvl -- render --text "你好 adventurer，ready?" --preset cute-npc --out-dir tmp/release-smoke --json`
- Unity batchmode smoke test in the disposable test project.
- Unity manual Play Mode check: audible WAV playback plus reveal text.
- Godot closed-loop test before changing the addon status from preview to verified.

## Current Limits

- Requires local Node/npm for alpha engine packages.
- Generates editor-time assets; it does not synthesize arbitrary player-entered text at runtime.
- Unity is verified as a local UPM alpha, not store packaged.
- Godot is experimental preview until a Godot editor closed-loop test is completed.
- No-Node renderer packaging, signed binaries, and store packaging are future work.
