import { execFile } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
const projectFile = resolve(projectPath, "project.godot");
const smokeScript = resolve(projectPath, "tests/mumble_voice_lab_smoke.gd");
const manualScript = resolve(projectPath, "manual_test.gd");
const manualScene = resolve(projectPath, "ManualTest.tscn");
const manualClip = resolve(projectPath, "mumble_voice_lab/generated/godot-smoke.tres");

async function runGodot(args: string[]) {
  const { stdout, stderr } = await execFileAsync(godotBin, args, {
    cwd: projectPath,
    maxBuffer: 1024 * 1024 * 30,
  });
  const output = `${stdout}\n${stderr}`.trim();
  if (output) console.log(output);
}

function projectConfig(includeMainScene: boolean) {
  return `; Engine configuration file.\nconfig_version=5\n\n[application]\nconfig/name="MumbleVoiceLabGodotPluginTest"${includeMainScene ? '\nrun/main_scene="res://ManualTest.tscn"' : ""}\n\n[editor_plugins]\nenabled=PackedStringArray("res://addons/mumble_voice_lab/plugin.cfg")\n`;
}

async function prepareProject() {
  await rm(projectPath, { recursive: true, force: true });
  await mkdir(dirname(addonTarget), { recursive: true });
  await cp(addonSource, addonTarget, { recursive: true });
  await mkdir(dirname(smokeScript), { recursive: true });
  await writeFile(projectFile, projectConfig(false), "utf8");
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

async function prepareManualScene() {
  const schedulePath = resolve(projectPath, "mumble_voice_lab/generated/godot-smoke.mumble.json");
  const parsed = JSON.parse(await readFile(schedulePath, "utf8")) as { text?: string; duration?: number };
  const text = parsed.text ?? "Godot smoke test ready!";
  const duration = Number.isFinite(parsed.duration) ? parsed.duration : 0;

  await writeFile(
    manualScript,
    `extends Node

@onready var _voice_player: MumbleVoicePlayer = $MumbleVoicePlayer
@onready var _reveal_label: Label = $CanvasLayer/Panel/Margin/VBox/RevealText
@onready var _status_label: Label = $CanvasLayer/Panel/Margin/VBox/StatusText

func _ready() -> void:
\t_reveal_label.text = ""
\t_status_label.text = "Preparing Mumble Voice Lab playback..."

\tif _voice_player.dialogue_clip == null:
\t\t_status_label.text = "No MumbleDialogueClip assigned."
\t\treturn

\tvar schedule_path := _voice_player.dialogue_clip.schedule_path
\tif not FileAccess.file_exists(schedule_path):
\t\t_status_label.text = "Missing schedule JSON: " + schedule_path
\t\treturn

\t_voice_player.text_changed.connect(_on_text_changed)
\t_voice_player.reveal_event.connect(_on_reveal_event)
\t_voice_player.playback_complete.connect(_on_playback_complete)

\tawait get_tree().process_frame
\t_status_label.text = "Playing generated WAV and reveal schedule..."
\t_voice_player.play()


func _on_text_changed(text: String) -> void:
\t_reveal_label.text = text


func _on_reveal_event(event: Dictionary) -> void:
\t_status_label.text = "Reveal event at %.3fs" % float(event.get("time", 0.0))


func _on_playback_complete() -> void:
\t_status_label.text = "Playback complete."
`,
    "utf8",
  );

  await writeFile(
    manualClip,
    `[gd_resource type="Resource" script_class="MumbleDialogueClip" load_steps=3 format=3]

[ext_resource type="Script" path="res://addons/mumble_voice_lab/runtime/mumble_dialogue_clip.gd" id="1_clip"]
[ext_resource type="AudioStream" path="res://mumble_voice_lab/generated/godot-smoke.wav" id="2_audio"]

[resource]
script = ExtResource("1_clip")
text = ${JSON.stringify(text)}
duration = ${duration.toFixed(3)}
audio_stream = ExtResource("2_audio")
schedule_path = "res://mumble_voice_lab/generated/godot-smoke.mumble.json"
`,
    "utf8",
  );

  await writeFile(
    manualScene,
    `[gd_scene load_steps=5 format=3]

[ext_resource type="Script" path="res://manual_test.gd" id="1_manual"]
[ext_resource type="Script" path="res://addons/mumble_voice_lab/runtime/mumble_voice_player.gd" id="2_player"]
[ext_resource type="Resource" path="res://mumble_voice_lab/generated/godot-smoke.tres" id="3_clip"]

[node name="ManualTest" type="Node"]
script = ExtResource("1_manual")

[node name="AudioStreamPlayer" type="AudioStreamPlayer" parent="."]

[node name="MumbleVoicePlayer" type="Node" parent="."]
script = ExtResource("2_player")
audio_player_path = NodePath("../AudioStreamPlayer")
dialogue_clip = ExtResource("3_clip")

[node name="CanvasLayer" type="CanvasLayer" parent="."]

[node name="Panel" type="PanelContainer" parent="CanvasLayer"]
offset_left = 32.0
offset_top = 32.0
offset_right = 928.0
offset_bottom = 220.0

[node name="Margin" type="MarginContainer" parent="CanvasLayer/Panel"]
theme_override_constants/margin_left = 24
theme_override_constants/margin_top = 20
theme_override_constants/margin_right = 24
theme_override_constants/margin_bottom = 20

[node name="VBox" type="VBoxContainer" parent="CanvasLayer/Panel/Margin"]
theme_override_constants/separation = 12

[node name="Title" type="Label" parent="CanvasLayer/Panel/Margin/VBox"]
text = "Mumble Voice Lab Godot Manual Test"

[node name="RevealText" type="Label" parent="CanvasLayer/Panel/Margin/VBox"]
custom_minimum_size = Vector2(820, 56)
text = ""
autowrap_mode = 3

[node name="StatusText" type="Label" parent="CanvasLayer/Panel/Margin/VBox"]
text = "Waiting..."
`,
    "utf8",
  );

  await writeFile(projectFile, projectConfig(true), "utf8");
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
  await prepareManualScene();
  await runGodot(["--headless", "--path", projectPath, "--import", "--quit"]);
  await runGodot(["--headless", "--path", projectPath, "--check-only", "--script", "res://manual_test.gd"]);
  console.log("[test-godot-plugin] passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
