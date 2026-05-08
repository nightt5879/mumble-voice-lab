extends Node
class_name MumbleVoicePlayer

signal text_changed(text: String)
signal reveal_event(event: Dictionary)
signal playback_complete

@export var audio_player_path: NodePath
@export var dialogue_clip: MumbleDialogueClip
@export var audio_stream: AudioStream
@export_file("*.json") var schedule_path: String
@export var play_on_ready := false
@export var clear_text_on_play := true

var _audio_player: Node
var _schedule: Dictionary = {}
var _reveal_events: Array = []
var _event_index := 0
var _visible_text := ""

func _ready() -> void:
	_audio_player = _resolve_audio_player()
	set_process(false)
	if play_on_ready:
		play()


func play() -> void:
	_audio_player = _resolve_audio_player()
	if _audio_player == null:
		push_warning("MumbleVoicePlayer needs an AudioStreamPlayer, AudioStreamPlayer2D, or AudioStreamPlayer3D node.")
		return

	var stream := _resolve_stream()
	if stream != null:
		_audio_player.set("stream", stream)
	if _audio_player.get("stream") == null:
		push_warning("MumbleVoicePlayer has no audio stream.")
		return
	if not _load_schedule():
		return

	_event_index = 0
	if clear_text_on_play:
		_visible_text = ""
		text_changed.emit(_visible_text)

	_audio_player.play()
	set_process(true)


func stop() -> void:
	set_process(false)
	if _audio_player != null and _audio_player.has_method("stop"):
		_audio_player.stop()


func _process(_delta: float) -> void:
	if _audio_player == null:
		set_process(false)
		return

	var time := float(_audio_player.get_playback_position())
	while _event_index < _reveal_events.size() and float(_reveal_events[_event_index].get("time", 0.0)) <= time:
		_apply_reveal(_reveal_events[_event_index])
		_event_index += 1

	if not bool(_audio_player.get("playing")):
		while _event_index < _reveal_events.size():
			_apply_reveal(_reveal_events[_event_index])
			_event_index += 1
		set_process(false)
		playback_complete.emit()


func _resolve_audio_player() -> Node:
	if not audio_player_path.is_empty():
		return get_node_or_null(audio_player_path)

	for child in get_children():
		if child is AudioStreamPlayer or child is AudioStreamPlayer2D or child is AudioStreamPlayer3D:
			return child

	var parent := get_parent()
	if parent != null:
		for child in parent.get_children():
			if child is AudioStreamPlayer or child is AudioStreamPlayer2D or child is AudioStreamPlayer3D:
				return child

	return null


func _resolve_stream() -> AudioStream:
	if dialogue_clip != null and dialogue_clip.audio_stream != null:
		return dialogue_clip.audio_stream
	return audio_stream


func _resolve_schedule_path() -> String:
	if dialogue_clip != null and not dialogue_clip.schedule_path.is_empty():
		return dialogue_clip.schedule_path
	return schedule_path


func _load_schedule() -> bool:
	var resolved_schedule_path := _resolve_schedule_path()
	if resolved_schedule_path.is_empty():
		push_warning("MumbleVoicePlayer has no schedule JSON path.")
		return false
	var file := FileAccess.open(resolved_schedule_path, FileAccess.READ)
	if file == null:
		push_warning("Could not open schedule JSON: " + resolved_schedule_path)
		return false
	var parsed = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		push_warning("Schedule JSON is not an object.")
		return false
	_schedule = parsed
	if _schedule.get("schema", "") != "mumble-voice-lab/schedule":
		push_warning("Unsupported Mumble Voice Lab schedule schema.")
		return false
	if _schedule.get("schemaVersion", "") != "1.0":
		push_warning("Unsupported Mumble Voice Lab schedule version.")
		return false
	_reveal_events = _schedule.get("revealEvents", [])
	return true


func _apply_reveal(event: Dictionary) -> void:
	var text := String(event.get("text", ""))
	if not text.is_empty():
		_visible_text += text
		text_changed.emit(_visible_text)
	reveal_event.emit(event)
