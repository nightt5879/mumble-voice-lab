# Engine Integration

Mumble Voice Lab V1.5.0 adds a Windows-first Godot store-ready candidate on top
of the V1.4.0 engine alpha workflow. The
shared contract is simple: the CLI renders a WAV file plus a schedule JSON file,
and engine plugins import those generated files as normal project assets.

Unity remains a local UPM alpha. Godot is now prepared as a Windows-first Godot
Asset Library submission candidate, pending official manual review.

## Status

| Layer | Status | Notes |
| --- | --- | --- |
| Web tool | Stable | Existing browser studio, WAV export, preset JSON export/import. |
| CLI renderer | Alpha | Node/npm renderer remains available for development and Unity alpha workflows. |
| Schedule schema | Stable alpha | `mumble-voice-lab/schedule` `1.0` is the engine interchange format. |
| Unity package | Verified alpha | Local UPM package has been batchmode smoke-tested and manually checked in Play Mode. |
| Godot addon | Store-ready candidate | Godot 4.6 Windows-first addon includes bundled renderer, `.tres` dialogue clips, and headless closed-loop tests. |

## Prerequisites

- Node/npm is required for web development, CLI development, Unity alpha, and Godot Node CLI fallback.
- From this repository root, run `npm install` before using the Node CLI path.
- Godot Windows users can use the bundled renderer without Node/npm.
- Unity alpha still needs the repository root path as its **CLI root**.

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
  "generatorVersion": "1.5.0",
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

Windows-first setup:

1. Copy `addons/mumble_voice_lab` into a Godot 4.6 project.
2. Enable **Mumble Voice Lab** in `Project > Project Settings > Plugins`.
3. Keep renderer mode on **Auto** to use the bundled Windows renderer.
4. Generate WAV + schedule JSON + `MumbleDialogueClip` `.tres` files into `res://mumble_voice_lab/generated`.
5. Use **Node CLI fallback** only for development or non-Windows testing.

Runtime usage:

1. Add `MumbleVoicePlayer` with an `AudioStreamPlayer`.
2. Assign the generated `MumbleDialogueClip`.
3. Call `play()`, or enable `play_on_ready` only when automatic scene-entry playback is wanted.
4. Connect `text_changed`, `reveal_event`, and `playback_complete`.

The previous preview fields, `audio_stream` and `schedule_path`, remain supported.

Godot V1.5.0 verification uses an external disposable project at
`C:\Users\14692\Documents\GodotProjects\MumbleVoiceLabGodotPluginTest` and Godot
`D:\wanxiang\Godot_v4.6.1-stable_win64.exe\Godot_v4.6.1-stable_win64_console.exe`.

Verified:

- addon enable/disable
- dock loading and script parsing
- bundled renderer asset generation
- `MumbleDialogueClip` resource loading
- reveal signals
- playback complete signal
- manual Play Mode playback in `ManualTest.tscn`, including audible WAV output and visible reveal text

Not yet verified:

- exported Windows project resource loading, because export templates are not required for the editor store candidate
- macOS/Linux bundled renderers

## Release QA Checklist

- `npm run test:cli`
- `npm run build`
- `npm run build:renderer:win`
- `npm run test:renderer`
- `npm run test:godot`
- `npm run mvl -- render --text "你好 adventurer，ready?" --preset cute-npc --out-dir tmp/release-smoke --json`
- Unity batchmode smoke test in the disposable test project.
- Unity manual Play Mode check: audible WAV playback plus reveal text.
- Godot manual Play Mode check: audible WAV playback plus reveal text.

## Current Limits

- Unity still requires local Node/npm for the alpha package.
- Generates editor-time assets; it does not synthesize arbitrary player-entered text at runtime.
- Unity is verified as a local UPM alpha, not store packaged.
- Godot bundled renderer is Windows-only in V1.5.0; macOS/Linux use Node CLI fallback.
- Signed binaries, macOS/Linux renderers, and formal Asset Library review are future work.
