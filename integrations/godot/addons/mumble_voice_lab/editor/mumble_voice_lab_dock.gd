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

var cli_root_edit: LineEdit
var output_edit: LineEdit
var text_edit: TextEdit
var preset_option: OptionButton
var emotion_option: OptionButton
var style_option: OptionButton
var intensity_slider: HSlider
var batch_input_edit: LineEdit
var status_label: Label

func _ready() -> void:
	if get_child_count() > 0:
		return
	_build_ui()


func _build_ui() -> void:
	size_flags_vertical = Control.SIZE_EXPAND_FILL

	add_child(_label("CLI root"))
	cli_root_edit = LineEdit.new()
	cli_root_edit.text = _find_cli_root()
	add_child(cli_root_edit)

	add_child(_label("Output folder"))
	output_edit = LineEdit.new()
	output_edit.text = "res://mumble_voice_lab/generated"
	add_child(output_edit)

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

	var generate_button := Button.new()
	generate_button.text = "Generate WAV + Schedule"
	generate_button.pressed.connect(_generate_single)
	add_child(generate_button)

	add_child(HSeparator.new())
	add_child(_label("Batch JSON/CSV path"))
	batch_input_edit = LineEdit.new()
	batch_input_edit.placeholder_text = "res://dialogue.csv"
	add_child(batch_input_edit)

	var batch_button := Button.new()
	batch_button.text = "Batch Generate"
	batch_button.pressed.connect(_generate_batch)
	add_child(batch_button)

	status_label = Label.new()
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(status_label)


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
	var cli_root := cli_root_edit.text.strip_edges()
	if not FileAccess.file_exists(cli_root.path_join("scripts/mvl.ts")):
		_set_status("CLI root must contain scripts/mvl.ts")
		return

	var output_abs := _global_path(output_edit.text)
	DirAccess.make_dir_recursive_absolute(output_abs)
	var preset := PRESETS[preset_option.selected]
	var id := _safe_id("%s-%s" % [preset, Time.get_datetime_string_from_system(true)])
	var wav_path := output_abs.path_join(id + ".wav")
	var schedule_path := output_abs.path_join(id + ".mumble.json")
	var args := PackedStringArray([
		"tsx",
		cli_root.path_join("scripts/mvl.ts"),
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
	var code := OS.execute(_npx_command(), args, output, true, false)
	if code != 0:
		_set_status("Generation failed:\n" + "\n".join(output))
		return

	EditorInterface.get_resource_filesystem().scan()
	_set_status("Generated %s.wav and %s.mumble.json" % [id, id])


func _generate_batch() -> void:
	var cli_root := cli_root_edit.text.strip_edges()
	var input_path := batch_input_edit.text.strip_edges()
	if input_path.is_empty():
		_set_status("Batch input path is required.")
		return
	if not FileAccess.file_exists(cli_root.path_join("scripts/mvl.ts")):
		_set_status("CLI root must contain scripts/mvl.ts")
		return

	var output_abs := _global_path(output_edit.text)
	DirAccess.make_dir_recursive_absolute(output_abs)
	var args := PackedStringArray([
		"tsx",
		cli_root.path_join("scripts/mvl.ts"),
		"batch",
		"--input",
		_global_path(input_path),
		"--out-dir",
		output_abs,
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
	var code := OS.execute(_npx_command(), args, output, true, false)
	if code != 0:
		_set_status("Batch failed:\n" + "\n".join(output))
		return

	EditorInterface.get_resource_filesystem().scan()
	_set_status("Batch complete:\n" + "\n".join(output))


func _find_cli_root() -> String:
	var current := ProjectSettings.globalize_path("res://")
	for _i in range(8):
		if FileAccess.file_exists(current.path_join("scripts/mvl.ts")):
			return current
		current = current.path_join("..").simplify_path()
	return ProjectSettings.globalize_path("res://")


func _global_path(path: String) -> String:
	if path.begins_with("res://") or path.begins_with("user://"):
		return ProjectSettings.globalize_path(path)
	return path


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
