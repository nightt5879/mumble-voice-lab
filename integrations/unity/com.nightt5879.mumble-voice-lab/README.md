# Mumble Voice Lab for Unity

Alpha Unity package for generating and playing Mumble Voice Lab dialogue assets.
This is a local UPM package for V1.4.0 Engine Integration Alpha. It is verified
for project-level testing, but it is not a Unity Asset Store package yet.

## Alpha Workflow

1. Install this folder as a local Unity Package Manager package.
2. In the repository root, run `npm install`.
3. Open `Tools > Mumble Voice Lab`.
4. Set **CLI root** to the repository folder containing `package.json` and `scripts/mvl.ts`.
5. Enter dialogue text, choose a preset/expression, and click **Generate Asset**.

The editor window calls:

```bash
npx tsx scripts/mvl.ts render
```

It creates:

- a WAV file imported as `AudioClip`
- a `mumble-voice-lab/schedule` JSON file imported as `TextAsset`
- a `MumbleDialogueClip` ScriptableObject that references both

## Runtime

Add `MumbleVoicePlayer` to a GameObject with an `AudioSource`, assign a generated
`MumbleDialogueClip`, then call `Play()`. Use `onTextChanged` for typewriter text
and `onReveal` for per-token timing hooks.

## Batch Input

The batch button accepts JSON arrays or CSV files with these fields:

```csv
id,text,preset,presetFile,emotion,style,intensity,seed
guard-warning,"Gate opening in three seconds!",robot-guard,,angry,shout,85,
```

JSON can be either an array or an object with an `items` array.

## Manual Closed-Loop Test

Use a disposable Unity project for verification:

1. Add this folder through Package Manager > **Add package from disk...**.
2. Select this package's `package.json`.
3. Open `Tools > Mumble Voice Lab`.
4. Set **CLI root** to the Mumble Voice Lab repository root.
5. Generate a single test line into a folder under `Assets`.
6. Confirm Unity imports a WAV, a schedule JSON, and a `MumbleDialogueClip`.
7. Add an `AudioSource` and `MumbleVoicePlayer` to a GameObject.
8. Assign the generated `MumbleDialogueClip`.
9. Enter Play Mode, call `Play()`, and confirm audio plus reveal text events.

## No-Sound Checklist

- The scene must have an active `AudioListener`.
- The Game view **Mute Audio** toggle must be off.
- Unity editor volume, Windows/macOS output volume, and the selected audio device must be audible.
- The `AudioSource` should reference the generated clip, have volume above 0, and use 2D spatial blend for basic dialogue tests.
- `MumbleVoicePlayer.Play()` must run after the dialogue clip is assigned.
- If Unity is still silent, open the generated WAV outside Unity to confirm the renderer produced audible audio.

## Alpha Limits

- Requires local Node/npm and this repository checkout.
- Runtime playback uses generated assets only. It does not synthesize arbitrary player-entered text at runtime.
- A no-Node renderer bundle and store-ready packaging are planned future work.
