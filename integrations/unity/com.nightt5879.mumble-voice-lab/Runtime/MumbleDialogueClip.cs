using System;
using UnityEngine;

namespace MumbleVoiceLab
{
    [CreateAssetMenu(
        fileName = "MumbleDialogueClip",
        menuName = "Mumble Voice Lab/Dialogue Clip",
        order = 202)]
    public class MumbleDialogueClip : ScriptableObject
    {
        public string id;
        [TextArea(2, 6)]
        public string text;
        public string presetId;
        public AudioClip audioClip;
        public TextAsset scheduleJson;

        [NonSerialized]
        private MumbleScheduleFile cachedSchedule;

        public MumbleScheduleFile Schedule
        {
            get
            {
                if (cachedSchedule == null && scheduleJson != null)
                {
                    cachedSchedule = JsonUtility.FromJson<MumbleScheduleFile>(scheduleJson.text);
                }

                return cachedSchedule;
            }
        }

        public bool TryGetSchedule(out MumbleScheduleFile schedule)
        {
            schedule = Schedule;
            return schedule != null && schedule.IsSupportedSchedule();
        }

        public void ClearScheduleCache()
        {
            cachedSchedule = null;
        }
    }
}
