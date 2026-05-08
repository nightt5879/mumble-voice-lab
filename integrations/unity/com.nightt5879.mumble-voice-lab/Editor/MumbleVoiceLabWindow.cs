using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace MumbleVoiceLab.Editor
{
    public class MumbleVoiceLabWindow : EditorWindow
    {
        private static readonly string[] Emotions =
        {
            "neutral", "happy", "angry", "sad", "nervous", "sleepy", "surprised", "scared"
        };

        private static readonly string[] Styles =
        {
            "normal", "whisper", "shout", "mutter", "formal", "chant"
        };

        private string cliRoot;
        private string outputFolder = "Assets/MumbleVoiceLab/Generated";
        private string text = "Good morning, traveler! Ready?";
        private int presetIndex;
        private MumblePresetAsset customPreset;
        private int emotionIndex;
        private int styleIndex;
        private int intensity = 65;
        private Vector2 scroll;
        private string status;
        private AudioClip lastPreviewClip;

        [Serializable]
        private class PresetConfigFile
        {
            public string schema = "mumble-voice-lab/preset";
            public string schemaVersion = "1.0";
            public string name;
            public string swatch;
            public string basedOn;
            public string savedAt;
            public MumbleParameters @params;
        }

        [Serializable]
        private class CliRenderResult
        {
            public string id;
            public string text;
            public string presetId;
            public string wavPath;
            public string schedulePath;
            public float duration;
            public int eventCount;
            public int bytes;
        }

        [Serializable]
        private class BatchManifest
        {
            public string schema;
            public string schemaVersion;
            public int count;
            public CliRenderResult[] items;
        }

        [MenuItem("Tools/Mumble Voice Lab")]
        public static void Open()
        {
            GetWindow<MumbleVoiceLabWindow>("Mumble Voice Lab");
        }

        private void OnEnable()
        {
            if (string.IsNullOrEmpty(cliRoot))
            {
                cliRoot = EditorPrefs.GetString("MumbleVoiceLab.CliRoot", string.Empty);
                if (string.IsNullOrEmpty(cliRoot))
                {
                    MumbleCli.TryFindRepositoryRoot(out cliRoot);
                }
            }

            outputFolder = EditorPrefs.GetString("MumbleVoiceLab.OutputFolder", outputFolder);
        }

        private void OnDisable()
        {
            EditorPrefs.SetString("MumbleVoiceLab.CliRoot", cliRoot ?? string.Empty);
            EditorPrefs.SetString("MumbleVoiceLab.OutputFolder", outputFolder ?? string.Empty);
        }

        private void OnGUI()
        {
            scroll = EditorGUILayout.BeginScrollView(scroll);
            EditorGUILayout.LabelField("Generator", EditorStyles.boldLabel);
            DrawCliSettings();
            EditorGUILayout.Space(8);

            EditorGUILayout.LabelField("Dialogue", EditorStyles.boldLabel);
            text = EditorGUILayout.TextArea(text, GUILayout.MinHeight(90));

            var presetNames = GetPresetNames();
            presetIndex = EditorGUILayout.Popup("Built-in preset", presetIndex, presetNames);
            customPreset = (MumblePresetAsset)EditorGUILayout.ObjectField(
                "Custom preset",
                customPreset,
                typeof(MumblePresetAsset),
                false);
            EditorGUILayout.HelpBox(
                customPreset != null
                    ? "Custom preset overrides the built-in preset for generation."
                    : "Use a built-in preset, or assign a MumblePresetAsset.",
                MessageType.None);

            emotionIndex = EditorGUILayout.Popup("Emotion", emotionIndex, Emotions);
            styleIndex = EditorGUILayout.Popup("Style", styleIndex, Styles);
            intensity = EditorGUILayout.IntSlider("Intensity", intensity, 0, 100);
            DrawOutputFolder();

            EditorGUILayout.Space(8);
            using (new EditorGUILayout.HorizontalScope())
            {
                if (GUILayout.Button("Generate Asset", GUILayout.Height(32)))
                {
                    GenerateSingle(false);
                }

                if (GUILayout.Button("Generate + Preview", GUILayout.Height(32)))
                {
                    GenerateSingle(true);
                }
            }

            using (new EditorGUILayout.HorizontalScope())
            {
                if (GUILayout.Button("Batch Generate JSON/CSV"))
                {
                    BatchGenerate();
                }

                using (new EditorGUI.DisabledScope(lastPreviewClip == null))
                {
                    if (GUILayout.Button("Replay Last Preview"))
                    {
                        MumbleEditorAudioPreview.Play(lastPreviewClip);
                    }
                }
            }

            if (!string.IsNullOrEmpty(status))
            {
                EditorGUILayout.Space(8);
                EditorGUILayout.HelpBox(status, MessageType.Info);
            }

            EditorGUILayout.EndScrollView();
        }

        private void DrawCliSettings()
        {
            using (new EditorGUILayout.HorizontalScope())
            {
                cliRoot = EditorGUILayout.TextField("CLI root", cliRoot);
                if (GUILayout.Button("Find", GUILayout.Width(64)))
                {
                    MumbleCli.TryFindRepositoryRoot(out cliRoot);
                }
            }

            EditorGUILayout.HelpBox(
                "Alpha workflow: this window calls `npx tsx scripts/mvl.ts`. Set CLI root to the repository folder that contains package.json and scripts/mvl.ts.",
                MessageType.None);
        }

        private void DrawOutputFolder()
        {
            using (new EditorGUILayout.HorizontalScope())
            {
                outputFolder = EditorGUILayout.TextField("Output folder", outputFolder);
                if (GUILayout.Button("Browse", GUILayout.Width(74)))
                {
                    var selected = EditorUtility.OpenFolderPanel("Generated asset folder", MumbleCli.ProjectRoot, "");
                    if (!string.IsNullOrEmpty(selected))
                    {
                        var assetPath = MumbleCli.AbsoluteToAssetPath(selected);
                        if (!string.IsNullOrEmpty(assetPath) &&
                            (assetPath == "Assets" || assetPath.StartsWith("Assets/")))
                        {
                            outputFolder = assetPath;
                        }
                        else
                        {
                            status = "Output folder must be inside this Unity project's Assets folder.";
                        }
                    }
                }
            }
        }

        private void GenerateSingle(bool preview)
        {
            try
            {
                ValidateSettings(true);
                var stamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
                var selectedPreset = GetSelectedPresetId();
                var id = MakeSafeName(selectedPreset + "-" + stamp);
                var outAbs = MumbleCli.AssetPathToAbsolute(outputFolder);
                Directory.CreateDirectory(outAbs);

                var wavPath = Path.Combine(outAbs, id + ".wav");
                var schedulePath = Path.Combine(outAbs, id + ".mumble.json");
                var args = BuildSharedArgs("render", id);
                args.Add("--text-file");
                args.Add(WriteTemporaryText(id));
                args.Add("--wav");
                args.Add(wavPath);
                args.Add("--schedule");
                args.Add(schedulePath);

                var result = MumbleCli.RunMvl(cliRoot, args);
                if (result.ExitCode != 0)
                {
                    throw new InvalidOperationException(result.Stderr + result.Stdout);
                }

                AssetDatabase.Refresh();
                var dialogue = CreateDialogueAsset(id, text, selectedPreset, wavPath, schedulePath);
                Selection.activeObject = dialogue;
                lastPreviewClip = dialogue.audioClip;
                status = "Generated " + dialogue.name;

                if (preview)
                {
                    MumbleEditorAudioPreview.Play(lastPreviewClip);
                }
            }
            catch (Exception error)
            {
                status = error.Message;
                Debug.LogError(error);
            }
        }

        private void BatchGenerate()
        {
            try
            {
                ValidateSettings(false);
                var input = EditorUtility.OpenFilePanel("Batch JSON or CSV", MumbleCli.ProjectRoot, "");
                if (string.IsNullOrEmpty(input))
                {
                    return;
                }

                var outAbs = MumbleCli.AssetPathToAbsolute(outputFolder);
                Directory.CreateDirectory(outAbs);
                var manifestPath = Path.Combine(outAbs, "mumble-batch-manifest.json");
                var args = BuildSharedArgs("batch", "batch");
                args.Add("--input");
                args.Add(input);
                args.Add("--out-dir");
                args.Add(outAbs);
                args.Add("--manifest");
                args.Add(manifestPath);

                var result = MumbleCli.RunMvl(cliRoot, args);
                if (result.ExitCode != 0)
                {
                    throw new InvalidOperationException(result.Stderr + result.Stdout);
                }

                AssetDatabase.Refresh();
                var manifest = JsonUtility.FromJson<BatchManifest>(File.ReadAllText(manifestPath));
                var count = 0;
                if (manifest?.items != null)
                {
                    foreach (var item in manifest.items)
                    {
                        CreateDialogueAsset(
                            MakeSafeName(item.id),
                            item.text,
                            item.presetId,
                            item.wavPath,
                            item.schedulePath);
                        count += 1;
                    }
                }

                AssetDatabase.SaveAssets();
                AssetDatabase.Refresh();
                status = "Batch generated " + count + " dialogue clips.";
            }
            catch (Exception error)
            {
                status = error.Message;
                Debug.LogError(error);
            }
        }

        private List<string> BuildSharedArgs(string command, string id)
        {
            var args = new List<string>
            {
                command,
                "--emotion",
                Emotions[emotionIndex],
                "--style",
                Styles[styleIndex],
                "--intensity",
                intensity.ToString(),
                "--id",
                id,
                "--name",
                id
            };

            if (customPreset != null)
            {
                args.Add("--preset-file");
                args.Add(WriteTemporaryPreset(customPreset));
            }
            else
            {
                args.Add("--preset");
                args.Add(GetSelectedPresetId());
            }

            return args;
        }

        private string WriteTemporaryText(string id)
        {
            var tempDir = Path.Combine(MumbleCli.ProjectRoot, "Library", "MumbleVoiceLab");
            Directory.CreateDirectory(tempDir);
            var path = Path.Combine(tempDir, id + ".txt");
            File.WriteAllText(path, text);
            return path;
        }

        private string WriteTemporaryPreset(MumblePresetAsset preset)
        {
            var tempDir = Path.Combine(MumbleCli.ProjectRoot, "Library", "MumbleVoiceLab");
            Directory.CreateDirectory(tempDir);
            var path = Path.Combine(tempDir, "unity-custom-preset.json");
            var config = new PresetConfigFile
            {
                name = string.IsNullOrWhiteSpace(preset.displayName) ? preset.name : preset.displayName,
                swatch = string.IsNullOrWhiteSpace(preset.swatch) ? "#f472b6" : preset.swatch,
                basedOn = string.IsNullOrWhiteSpace(preset.basedOn) ? preset.presetId : preset.basedOn,
                savedAt = DateTime.UtcNow.ToString("o"),
                @params = preset.parameters
            };
            File.WriteAllText(path, JsonUtility.ToJson(config, true));
            return path;
        }

        private MumbleDialogueClip CreateDialogueAsset(
            string id,
            string sourceText,
            string presetId,
            string wavPath,
            string schedulePath)
        {
            var wavAssetPath = MumbleCli.AbsoluteToAssetPath(wavPath);
            var scheduleAssetPath = MumbleCli.AbsoluteToAssetPath(schedulePath);
            if (string.IsNullOrEmpty(wavAssetPath) || string.IsNullOrEmpty(scheduleAssetPath))
            {
                throw new InvalidOperationException("Generated WAV and schedule must be inside the Unity project.");
            }

            var audioClip = AssetDatabase.LoadAssetAtPath<AudioClip>(wavAssetPath);
            var scheduleJson = AssetDatabase.LoadAssetAtPath<TextAsset>(scheduleAssetPath);
            if (audioClip == null || scheduleJson == null)
            {
                throw new InvalidOperationException("Unity did not import the generated WAV or schedule JSON.");
            }

            var asset = CreateInstance<MumbleDialogueClip>();
            asset.id = id;
            asset.name = id;
            asset.text = sourceText;
            asset.presetId = presetId;
            asset.audioClip = audioClip;
            asset.scheduleJson = scheduleJson;

            var assetPath = AssetDatabase.GenerateUniqueAssetPath(
                Path.Combine(outputFolder, MakeSafeName(id) + ".asset").Replace('\\', '/'));
            AssetDatabase.CreateAsset(asset, assetPath);
            AssetDatabase.SaveAssets();
            return asset;
        }

        private void ValidateSettings(bool requireText)
        {
            if (string.IsNullOrWhiteSpace(cliRoot) ||
                !File.Exists(Path.Combine(cliRoot, "scripts", "mvl.ts")))
            {
                throw new InvalidOperationException("CLI root must contain scripts/mvl.ts.");
            }

            if (requireText && string.IsNullOrWhiteSpace(text))
            {
                throw new InvalidOperationException("Dialogue text is required.");
            }

            if (string.IsNullOrWhiteSpace(outputFolder) ||
                !(outputFolder == "Assets" || outputFolder.StartsWith("Assets/")))
            {
                throw new InvalidOperationException("Output folder must be inside Assets/.");
            }
        }

        private string[] GetPresetNames()
        {
            var presets = MumbleBuiltInPresets.All;
            var names = new string[presets.Length];
            for (var i = 0; i < presets.Length; i += 1)
            {
                names[i] = presets[i].name;
            }

            return names;
        }

        private string GetSelectedPresetId()
        {
            if (customPreset != null && !string.IsNullOrWhiteSpace(customPreset.presetId))
            {
                return customPreset.presetId;
            }

            var presets = MumbleBuiltInPresets.All;
            presetIndex = Mathf.Clamp(presetIndex, 0, presets.Length - 1);
            return presets[presetIndex].id;
        }

        private static string MakeSafeName(string value)
        {
            var chars = value.ToLowerInvariant().ToCharArray();
            for (var i = 0; i < chars.Length; i += 1)
            {
                var c = chars[i];
                var allowed = (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_';
                chars[i] = allowed ? c : '-';
            }

            var cleaned = new string(chars).Trim('-');
            return string.IsNullOrEmpty(cleaned) ? "mumble-dialogue" : cleaned;
        }
    }
}
