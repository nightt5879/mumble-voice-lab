import { execFile } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const godotBin =
  process.env.GODOT_BIN ??
  "D:\\wanxiang\\Godot_v4.6.1-stable_win64.exe\\Godot_v4.6.1-stable_win64_console.exe";
const projectPath =
  process.env.MVL_GODOT_TEST_PROJECT ??
  "C:\\Users\\14692\\Documents\\GodotProjects\\MumbleVoiceLabGodotPluginTest";
const addonSource = resolve(root, "integrations/godot/addons/mumble_voice_lab");
const addonTarget = resolve(projectPath, "addons/mumble_voice_lab");
const smokeScript = resolve(projectPath, "tests/mumble_voice_lab_smoke.gd");

async function runGodot(args: string[]) {
  const { stdout, stderr } = await execFileAsync(godotBin, args, {
    cwd: projectPath,
    maxBuffer: 1024 * 1024 * 30,
  });
  const output = `${stdout}\n${stderr}`.trim();
  if (output) console.log(output);
}

async function prepareProject() {
  await rm(projectPath, { recursive: true, force: true });
  await mkdir(dirname(addonTarget), { recursive: true });
  await cp(addonSource, addonTarget, { recursive: true });
  await mkdir(dirname(smokeScript), { recursive: true });
  await writeFile(
    resolve(projectPath, "project.godot"),
    `; Engine configuration file.\nconfig_version=5\n\n[application]\nconfig/name="MumbleVoiceLabGodotPluginTest"\n\n[editor_plugins]\nenabled=PackedStringArray("res://addons/mumble_voice_lab/plugin.cfg")\n`,
    "utf8",
  );
  await writeFile(
    smokeScript,
    `extends SceneTree

class FakeAudioPlayer:
\textends Node
\tvar stream
\tvar playing := false
\tvar playback_position := 0.0

\tfunc play() -> void:
\t\tplaying = true

\tfunc stop() -> void:
\t\tplaying = false

\tfunc get_playback_position() -> float:
\t\treturn playback_position


func _init() -> void:
\tquit(_run())


func _fail(message: String) -> int:
\tpush_error(message)
\treturn 1


func _run() -> int:
\tvar renderer := ProjectSettings.globalize_path("res://addons/mumble_voice_lab/bin/win-x64/mvl-renderer-win-x64.exe")
\tif not FileAccess.file_exists(renderer):
\t\treturn _fail("Bundled renderer missing: " + renderer)

\tvar out_res := "res://mumble_voice_lab/generated"
\tvar out_abs := ProjectSettings.globalize_path(out_res)
\tDirAccess.make_dir_recursive_absolute(out_abs)
\tvar wav_path := out_abs.path_join("godot-smoke.wav")
\tvar schedule_path := out_abs.path_join("godot-smoke.mumble.json")
\tvar output: Array = []
\tvar code := OS.execute(renderer, PackedStringArray([
\t\t"render",
\t\t"--text",
\t\t"Godot smoke test ready!",
\t\t"--preset",
\t\t"cute-npc",
\t\t"--id",
\t\t"godot-smoke",
\t\t"--name",
\t\t"godot-smoke",
\t\t"--wav",
\t\twav_path,
\t\t"--schedule",
\t\tschedule_path,
\t]), output, true, false)
\tif code != 0:
\t\treturn _fail("Renderer failed: " + "\\n".join(output))

\tvar parsed = JSON.parse_string(FileAccess.get_file_as_string(schedule_path))
\tif typeof(parsed) != TYPE_DICTIONARY:
\t\treturn _fail("Schedule JSON did not parse.")
\tif parsed.get("schema", "") != "mumble-voice-lab/schedule":
\t\treturn _fail("Unexpected schedule schema.")
\tif parsed.get("schemaVersion", "") != "1.0":
\t\treturn _fail("Unexpected schedule version.")

\tvar clip_script = load("res://addons/mumble_voice_lab/runtime/mumble_dialogue_clip.gd")
\tvar player_script = load("res://addons/mumble_voice_lab/runtime/mumble_voice_player.gd")
\tif clip_script == null or player_script == null:
\t\treturn _fail("Runtime scripts failed to load.")

\tvar clip = clip_script.new()
\tclip.text = parsed.get("text", "")
\tclip.duration = float(parsed.get("duration", 0.0))
\tclip.schedule_path = ProjectSettings.localize_path(schedule_path)
\tclip.audio_stream = AudioStreamWAV.new()

\tvar fake := FakeAudioPlayer.new()
\tvar player = player_script.new()
\tfake.name = "FakeAudioPlayer"
\tplayer.name = "MumbleVoicePlayer"
\tget_root().add_child(fake)
\tget_root().add_child(player)
\tplayer.audio_player_path = NodePath("../FakeAudioPlayer")
\tplayer.dialogue_clip = clip

\tvar reveal_count := [0]
\tvar completed := [false]
\tplayer.reveal_event.connect(func(_event: Dictionary) -> void: reveal_count[0] += 1)
\tplayer.playback_complete.connect(func() -> void: completed[0] = true)
\tplayer._ready()
\tif player._resolve_audio_player() == null:
\t\treturn _fail("Fake audio player did not resolve.")
\tif not player._load_schedule():
\t\treturn _fail("Player could not load schedule.")
\tif player._reveal_events.size() == 0:
\t\treturn _fail("Player loaded zero reveal events.")
\tplayer.play()
\tfor event in parsed.get("revealEvents", []):
\t\tfake.playback_position = float(event.get("time", 0.0)) + 0.002
\t\tplayer._process(0.016)
\tif player._event_index == 0:
\t\treturn _fail("Player event index did not advance. playback_position=%s reveal_count=%s events=%s" % [str(fake.playback_position), str(reveal_count[0]), str(player._reveal_events.size())])
\tfake.playing = false
\tplayer._process(0.016)

\tif int(reveal_count[0]) == 0:
\t\treturn _fail("No reveal events emitted.")
\tif not bool(completed[0]):
\t\treturn _fail("Playback complete signal did not emit.")

\tprint("[godot-smoke] passed")
\treturn 0
`,
    "utf8",
  );
}

async function main() {
  await prepareProject();
  await runGodot(["--headless", "--path", projectPath, "--import", "--quit"]);
  const scripts = [
    "res://addons/mumble_voice_lab/plugin.gd",
    "res://addons/mumble_voice_lab/editor/mumble_voice_lab_dock.gd",
    "res://addons/mumble_voice_lab/runtime/mumble_dialogue_clip.gd",
    "res://addons/mumble_voice_lab/runtime/mumble_voice_player.gd",
  ];
  for (const script of scripts) {
    await runGodot(["--headless", "--path", projectPath, "--check-only", "--script", script]);
  }
  await runGodot(["--headless", "--path", projectPath, "--script", "res://tests/mumble_voice_lab_smoke.gd"]);
  console.log("[test-godot-plugin] passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
