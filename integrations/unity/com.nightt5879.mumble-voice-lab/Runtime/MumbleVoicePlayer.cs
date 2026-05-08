using System.Collections;
using UnityEngine;
using UnityEngine.Events;

namespace MumbleVoiceLab
{
    [System.Serializable]
    public class MumbleTextUnityEvent : UnityEvent<string>
    {
    }

    [System.Serializable]
    public class MumbleRevealUnityEvent : UnityEvent<MumbleRevealEvent>
    {
    }

    [RequireComponent(typeof(AudioSource))]
    public class MumbleVoicePlayer : MonoBehaviour
    {
        public MumbleDialogueClip dialogueClip;
        public bool playOnStart;
        public bool clearTextOnPlay = true;
        public MumbleTextUnityEvent onTextChanged = new MumbleTextUnityEvent();
        public MumbleRevealUnityEvent onReveal = new MumbleRevealUnityEvent();
        public UnityEvent onPlaybackComplete = new UnityEvent();

        private AudioSource audioSource;
        private Coroutine revealRoutine;
        private string visibleText = string.Empty;

        private void Awake()
        {
            audioSource = GetComponent<AudioSource>();
        }

        private void Start()
        {
            if (playOnStart && dialogueClip != null)
            {
                Play(dialogueClip);
            }
        }

        public void Play()
        {
            Play(dialogueClip);
        }

        public void Play(MumbleDialogueClip clip)
        {
            Stop();
            dialogueClip = clip;
            if (dialogueClip == null || dialogueClip.audioClip == null)
            {
                return;
            }

            if (!dialogueClip.TryGetSchedule(out var schedule))
            {
                Debug.LogWarning("MumbleVoicePlayer received a dialogue clip without a supported schedule.");
                return;
            }

            audioSource.clip = dialogueClip.audioClip;
            audioSource.Play();

            if (clearTextOnPlay)
            {
                visibleText = string.Empty;
                onTextChanged.Invoke(visibleText);
            }

            revealRoutine = StartCoroutine(RevealText(schedule));
        }

        public void Stop()
        {
            if (revealRoutine != null)
            {
                StopCoroutine(revealRoutine);
                revealRoutine = null;
            }

            if (audioSource != null && audioSource.isPlaying)
            {
                audioSource.Stop();
            }
        }

        private IEnumerator RevealText(MumbleScheduleFile schedule)
        {
            var revealEvents = schedule.revealEvents ?? new MumbleRevealEvent[0];
            var eventIndex = 0;

            while (audioSource != null && audioSource.isPlaying)
            {
                var time = audioSource.time;
                while (eventIndex < revealEvents.Length && revealEvents[eventIndex].time <= time)
                {
                    ApplyReveal(revealEvents[eventIndex]);
                    eventIndex += 1;
                }

                yield return null;
            }

            while (eventIndex < revealEvents.Length)
            {
                ApplyReveal(revealEvents[eventIndex]);
                eventIndex += 1;
            }

            revealRoutine = null;
            onPlaybackComplete.Invoke();
        }

        private void ApplyReveal(MumbleRevealEvent revealEvent)
        {
            if (!string.IsNullOrEmpty(revealEvent.text))
            {
                visibleText += revealEvent.text;
                onTextChanged.Invoke(visibleText);
            }

            onReveal.Invoke(revealEvent);
        }
    }
}
