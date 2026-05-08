@tool
extends EditorPlugin

var dock: Control

func _enter_tree() -> void:
	var dock_script = preload("res://addons/mumble_voice_lab/editor/mumble_voice_lab_dock.gd")
	dock = dock_script.new()
	dock.name = "Mumble Voice Lab"
	add_control_to_dock(DOCK_SLOT_RIGHT_UL, dock)


func _exit_tree() -> void:
	if dock != null:
		remove_control_from_docks(dock)
		dock.queue_free()
		dock = null
