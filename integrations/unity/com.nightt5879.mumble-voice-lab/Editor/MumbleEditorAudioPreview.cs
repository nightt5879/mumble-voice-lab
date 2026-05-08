using System;
using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace MumbleVoiceLab.Editor
{
    internal static class MumbleEditorAudioPreview
    {
        internal static void Play(AudioClip clip)
        {
            if (clip == null)
            {
                return;
            }

            StopAll();
            var audioUtil = typeof(AudioImporter).Assembly.GetType("UnityEditor.AudioUtil");
            if (audioUtil == null)
            {
                return;
            }

            var playPreview = audioUtil.GetMethod(
                "PlayPreviewClip",
                BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic,
                null,
                new[] { typeof(AudioClip), typeof(int), typeof(bool) },
                null);
            if (playPreview != null)
            {
                playPreview.Invoke(null, new object[] { clip, 0, false });
                return;
            }

            var playClip = audioUtil.GetMethod(
                "PlayClip",
                BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic,
                null,
                new[] { typeof(AudioClip) },
                null);
            playClip?.Invoke(null, new object[] { clip });
        }

        internal static void StopAll()
        {
            var audioUtil = typeof(AudioImporter).Assembly.GetType("UnityEditor.AudioUtil");
            var stop = audioUtil?.GetMethod(
                "StopAllPreviewClips",
                BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
            stop?.Invoke(null, Array.Empty<object>());
        }
    }
}
