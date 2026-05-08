@tool
extends VBoxContainer

const PRESETS := [
	"cute-npc",
	"robot-guard",
	"soft-mascot",
	"talkative-merchant",
	"tiny-creature",
	"forest-spirit",
	"tired-villager",
	"monster",
	"deep-boss",
]

const EMOTIONS := ["neutral", "happy", "angry", "sad", "nervous", "sleepy", "surprised", "scared"]
const STYLES := ["normal", "whisper", "shout", "mutter", "formal", "chant"]
const MODE_AUTO := 0
const MODE_BUNDLED := 1
const MODE_NODE_CLI := 2
const BUNDLED_RENDERER := "res://addons/mumble_voice_lab/bin/win-x64/mvl-renderer-win-x64.exe"

var renderer_mode_option: OptionButton
var cli_root_edit: LineEdit
var output_edit: LineEdit
var text_edit: TextEdit
var preset_option: OptionButton
var emotion_option: OptionButton
var style_option: OptionButton
var intensity_slider: HSlider
var batch_input_edit: LineEdit
var status_label: Label
var log_text: TextEdit
var output_dialog: FileDialog
var batch_dialog: FileDialog


func _ready() -> void:
	if get_child_count() > 0:
		return
	_build_ui()
	_update_renderer_status()


func _build_ui() -> void:
	size_flags_vertical = Control.SIZE_EXPAND_FILL

	add_child(_label("Renderer"))
	renderer_mode_option = OptionButton.new()
	renderer_mode_option.add_item("Auto (bundled Windows renderer)", MODE_AUTO)
	renderer_mode_option.add_item("Bundled renderer", MODE_BUNDLED)
	renderer_mode_option.add_item("Node CLI fallback", MODE_NODE_CLI)
	renderer_mode_option.item_selected.connect(func(_index: int) -> void: _update_renderer_status())
	add_child(renderer_mode_option)

	add_child(_label("CLI root (Node CLI fallback only)"))
	cli_root_edit = LineEdit.new()
	cli_root_edit.text = _find_cli_root()
	add_child(cli_root_edit)

	add_child(_label("Output folder"))
	var output_row := HBoxContainer.new()
	output_edit = LineEdit.new()
	output_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	output_edit.text = "res://mumble_voice_lab/generated"
	output_row.add_child(output_edit)
	var output_browse := Button.new()
	output_browse.text = "Browse"
	output_browse.pressed.connect(func() -> void: output_dialog.popup_centered_ratio(0.65))
	output_row.add_child(output_browse)
	add_child(output_row)

	add_child(_label("Dialogue text"))
	text_edit = TextEdit.new()
	text_edit.text = "Good morning, traveler! Ready?"
	text_edit.custom_minimum_size = Vector2(0, 96)
	add_child(text_edit)

	preset_option = _option("Preset", PRESETS)
	emotion_option = _option("Emotion", EMOTIONS)
	style_option = _option("Style", STYLES)

	add_child(_label("Intensity"))
	intensity_slider = HSlider.new()
	intensity_slider.min_value = 0
	intensity_slider.max_value = 100
	intensity_slider.step = 1
	intensity_slider.value = 65
	add_child(intensity_slider)

	var button_row := HBoxContainer.new()
	var status_button := Button.new()
	status_button.text = "Check"
	status_button.pressed.connect(_update_renderer_status)
	button_row.add_child(status_button)
	var generate_button := Button.new()
	generate_button.text = "Generate WAV + JSON + Clip"
	generate_button.pressed.connect(_generate_single)
	button_row.add_child(generate_button)
	add_child(button_row)

	add_child(HSeparator.new())
	add_child(_label("Batch JSON/CSV path"))
	var batch_row := HBoxContainer.new()
	batch_input_edit = LineEdit.new()
	batch_input_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	batch_input_edit.placeholder_text = "res://dialogue.csv"
	batch_row.add_child(batch_input_edit)
	var batch_browse := Button.new()
	batch_browse.text = "Browse"
	batch_browse.pressed.connect(func() -> void: batch_dialog.popup_centered_ratio(0.65))
	batch_row.add_child(batch_browse)
	add_child(batch_row)

	var batch_button := Button.new()
	batch_button.text = "Batch Generate"
	batch_button.pressed.connect(_generate_batch)
	add_child(batch_button)

	status_label = Label.new()
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(status_label)

	log_text = TextEdit.new()
	log_text.editable = false
	log_text.custom_minimum_size = Vector2(0, 120)
	log_text.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	add_child(log_text)

	var copy_button := Button.new()
	copy_button.text = "Copy Log"
	copy_button.pressed.connect(func() -> void: DisplayServer.clipboard_set(log_text.text))
	add_child(copy_button)

	output_dialog = FileDialog.new()
	output_dialog.file_mode = FileDialog.FILE_MODE_OPEN_DIR
	output_dialog.access = FileDialog.ACCESS_RESOURCES
	output_dialog.dir_selected.connect(func(path: String) -> void: output_edit.text = path)
	add_child(output_dialog)

	batch_dialog = FileDialog.new()
	batch_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	batch_dialog.access = FileDialog.ACCESS_RESOURCES
	batch_dialog.filters = PackedStringArray(["*.json, *.csv ; Dialogue batch files"])
	batch_dialog.file_selected.connect(func(path: String) -> void: batch_input_edit.text = path)
	add_child(batch_dialog)


func _label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	return label


func _option(label_text: String, values: Array) -> OptionButton:
	add_child(_label(label_text))
	var option := OptionButton.new()
	for value in values:
		option.add_item(value)
	add_child(option)
	return option


func _generate_single() -> void:
	var command_info: Dictionary = _resolve_renderer_command()
	if not command_info.ok:
		_set_status(command_info.error)
		return

	var output_res: String = _output_res_folder()
	var output_abs: String = ProjectSettings.globalize_path(output_res)
	DirAccess.make_dir_recursive_absolute(output_abs)
	var preset: String = PRESETS[preset_option.selected]
	var id: String = _safe_id("%s-%s" % [preset, Time.get_datetime_string_from_system(true)])
	var wav_path: String = output_abs.path_join(id + ".wav")
	var schedule_path: String = output_abs.path_join(id + ".mumble.json")
	var args: PackedStringArray = _renderer_args(command_info, [
		"render",
		"--text",
		text_edit.text,
		"--preset",
		preset,
		"--emotion",
		EMOTIONS[emotion_option.selected],
		"--style",
		STYLES[style_option.selected],
		"--intensity",
		str(int(intensity_slider.value)),
		"--id",
		id,
		"--name",
		id,
		"--wav",
		wav_path,
		"--schedule",
		schedule_path,
	])
	var output: Array = []
	var code := OS.execute(command_info.command, args, output, true, false)
	if code != 0:
		_set_status("Generation failed:\n" + "\n".join(output))
		return

	var clip_path := _create_dialogue_clip(id, text_edit.text, wav_path, schedule_path, output_res)
	EditorInterface.get_resource_filesystem().scan()
	_set_status("Generated %s.wav, %s.mumble.json, and %s" % [id, id, clip_path])
	_set_log("\n".join(output))


func _generate_batch() -> void:
	var command_info: Dictionary = _resolve_renderer_command()
	if not command_info.ok:
		_set_status(command_info.error)
		return

	var input_path := batch_input_edit.text.strip_edges()
	if input_path.is_empty():
		_set_status("Batch input path is required.")
		return

	var output_res: String = _output_res_folder()
	var output_abs: String = ProjectSettings.globalize_path(output_res)
	DirAccess.make_dir_recursive_absolute(output_abs)
	var manifest_path: String = output_abs.path_join("mumble-batch-manifest.json")
	var args: PackedStringArray = _renderer_args(command_info, [
		"batch",
		"--input",
		_global_path(input_path),
		"--out-dir",
		output_abs,
		"--manifest",
		manifest_path,
		"--preset",
		PRESETS[preset_option.selected],
		"--emotion",
		EMOTIONS[emotion_option.selected],
		"--style",
		STYLES[style_option.selected],
		"--intensity",
		str(int(intensity_slider.value)),
	])
	var output: Array = []
	var code := OS.execute(command_info.command, args, output, true, false)
	if code != 0:
		_set_status("Batch failed:\n" + "\n".join(output))
		return

	var created := _create_batch_clips(manifest_path, output_res)
	EditorInterface.get_resource_filesystem().scan()
	_set_status("Batch complete: created %d dialogue clips." % created)
	_set_log("\n".join(output))


func _resolve_renderer_command() -> Dictionary:
	var mode: int = renderer_mode_option.selected
	if mode == MODE_AUTO or mode == MODE_BUNDLED:
		if OS.get_name() != "Windows":
			return {
				"ok": false,
				"error": "Bundled renderer is Windows-only in this release. Switch to Node CLI fallback for this platform.",
			}
		var bundled_path: String = ProjectSettings.globalize_path(BUNDLED_RENDERER)
		if FileAccess.file_exists(bundled_path):
			return { "ok": true, "command": bundled_path, "prefix": PackedStringArray() }
		return {
			"ok": false,
			"error": "Bundled renderer not found: " + BUNDLED_RENDERER,
		}

	var cli_root := cli_root_edit.text.strip_edges()
	if not FileAccess.file_exists(cli_root.path_join("scripts/mvl.ts")):
		return { "ok": false, "error": "CLI root must contain scripts/mvl.ts" }
	return {
		"ok": true,
		"command": _npx_command(),
		"prefix": PackedStringArray(["tsx", cli_root.path_join("scripts/mvl.ts")]),
	}


func _renderer_args(command_info: Dictionary, values: Array) -> PackedStringArray:
	var args := PackedStringArray()
	for value in command_info.get("prefix", PackedStringArray()):
		args.append(str(value))
	for value in values:
		args.append(str(value))
	return args


func _create_batch_clips(manifest_path: String, output_res: String) -> int:
	var manifest := _read_json(manifest_path)
	var items: Array = manifest.get("items", [])
	var created := 0
	for item in items:
		if typeof(item) != TYPE_DICTIONARY:
			continue
		var id: String = _safe_id(str(item.get("id", "mumble-dialogue")))
		var text: String = str(item.get("text", ""))
		var wav_path: String = str(item.get("wavPath", ""))
		var schedule_path: String = str(item.get("schedulePath", ""))
		if wav_path.is_empty() or schedule_path.is_empty():
			continue
		_create_dialogue_clip(id, text, wav_path, schedule_path, output_res)
		created += 1
	return created


func _create_dialogue_clip(id: String, fallback_text: String, wav_path: String, schedule_path: String, output_res: String) -> String:
	var schedule := _read_json(schedule_path)
	var clip := MumbleDialogueClip.new()
	clip.text = str(schedule.get("text", fallback_text))
	clip.duration = float(schedule.get("duration", 0.0))
	clip.schedule_path = _localize_path(schedule_path)
	var stream = AudioStreamWAV.load_from_file(wav_path)
	if stream != null:
		clip.audio_stream = stream
	var clip_path := output_res.path_join(id + ".tres")
	var error := ResourceSaver.save(clip, clip_path)
	if error != OK:
		push_warning("Could not save MumbleDialogueClip: " + clip_path)
	return clip_path


func _read_json(path: String) -> Dictionary:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return {}
	var parsed = JSON.parse_string(file.get_as_text())
	return parsed if typeof(parsed) == TYPE_DICTIONARY else {}


func _update_renderer_status() -> void:
	var command_info: Dictionary = _resolve_renderer_command()
	if command_info.ok:
		var mode_text := "bundled renderer" if renderer_mode_option.selected != MODE_NODE_CLI else "Node CLI fallback"
		_set_status("Renderer ready: " + mode_text)
	else:
		_set_status(command_info.error)


func _find_cli_root() -> String:
	var current := ProjectSettings.globalize_path("res://")
	for _i in range(8):
		if FileAccess.file_exists(current.path_join("scripts/mvl.ts")):
			return current
		current = current.path_join("..").simplify_path()
	return ProjectSettings.globalize_path("res://")


func _output_res_folder() -> String:
	var value := output_edit.text.strip_edges()
	if value.begins_with("res://"):
		return value
	var localized := ProjectSettings.localize_path(value)
	if localized.begins_with("res://"):
		return localized
	return "res://mumble_voice_lab/generated"


func _global_path(path: String) -> String:
	if path.begins_with("res://") or path.begins_with("user://"):
		return ProjectSettings.globalize_path(path)
	return path


func _localize_path(path: String) -> String:
	var localized := ProjectSettings.localize_path(path)
	return localized if localized.begins_with("res://") else path


func _npx_command() -> String:
	return "npx.cmd" if OS.get_name() == "Windows" else "npx"


func _safe_id(value: String) -> String:
	var safe := value.to_lower()
	for character in [":", " ", "/", "\\", ".", "_"]:
		safe = safe.replace(character, "-")
	while safe.contains("--"):
		safe = safe.replace("--", "-")
	safe = safe.strip_edges()
	return "mumble-dialogue" if safe.is_empty() else safe


func _set_status(text: String) -> void:
	status_label.text = text
	print("[Mumble Voice Lab] " + text)


func _set_log(text: String) -> void:
	log_text.text = text
