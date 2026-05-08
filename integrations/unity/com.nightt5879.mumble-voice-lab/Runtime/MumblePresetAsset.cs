using UnityEngine;

namespace MumbleVoiceLab
{
    [CreateAssetMenu(
        fileName = "MumblePreset",
        menuName = "Mumble Voice Lab/Preset",
        order = 201)]
    public class MumblePresetAsset : ScriptableObject
    {
        public string presetId = "custom-preset";
        public string displayName = "Custom Preset";
        public string swatch = "#f472b6";
        public string basedOn;
        public MumbleParameters parameters = new MumbleParameters();
    }
}
