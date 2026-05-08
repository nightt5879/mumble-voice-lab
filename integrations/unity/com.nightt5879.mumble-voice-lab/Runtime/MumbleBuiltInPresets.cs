using System;

namespace MumbleVoiceLab
{
    [Serializable]
    public class MumblePresetDefinition
    {
        public string id;
        public string name;
        public string swatch;
        public MumbleParameters parameters;

        public MumblePresetDefinition(string id, string name, string swatch, MumbleParameters parameters)
        {
            this.id = id;
            this.name = name;
            this.swatch = swatch;
            this.parameters = parameters;
        }
    }

    public static class MumbleBuiltInPresets
    {
        public static readonly MumblePresetDefinition[] All =
        {
            new MumblePresetDefinition("cute-npc", "Cute NPC", "#f472b6", new MumbleParameters
            {
                basicFreq = 330f, wordCountMultiplier = 1.05f, syllableLengthMs = 92f,
                syllableLengthRandomness = 0.28f, pitchRandomSemitone = 4.8f,
                pitchFallAtEnd = true, speedCurve = 0.18f, timingJitterMs = 18f,
                ringModFreq = 0f, ringModDepth = 0f, noiseAmount = 0.08f,
                filterFreq = 1350f, filterQ = 4.6f, attackMs = 7f,
                releaseMs = 42f, volumeDb = 4f, seed = 1234
            }),
            new MumblePresetDefinition("robot-guard", "Robot Guard", "#22c55e", new MumbleParameters
            {
                basicFreq = 145f, wordCountMultiplier = 0.85f, syllableLengthMs = 78f,
                syllableLengthRandomness = 0.08f, pitchRandomSemitone = 1.4f,
                pitchFallAtEnd = false, speedCurve = 0.42f, timingJitterMs = 4f,
                ringModFreq = 48f, ringModDepth = 0.56f, noiseAmount = 0.04f,
                filterFreq = 920f, filterQ = 9.5f, attackMs = 4f,
                releaseMs = 28f, volumeDb = 3f, seed = 2201
            }),
            new MumblePresetDefinition("soft-mascot", "Soft Mascot", "#fb7185", new MumbleParameters
            {
                basicFreq = 390f, wordCountMultiplier = 1.18f, syllableLengthMs = 86f,
                syllableLengthRandomness = 0.2f, pitchRandomSemitone = 4.2f,
                pitchFallAtEnd = true, speedCurve = 0.24f, timingJitterMs = 10f,
                ringModFreq = 0f, ringModDepth = 0f, noiseAmount = 0.035f,
                filterFreq = 1420f, filterQ = 3.1f, attackMs = 12f,
                releaseMs = 58f, volumeDb = 2f, seed = 4412
            }),
            new MumblePresetDefinition("talkative-merchant", "Talkative Merchant", "#eab308", new MumbleParameters
            {
                basicFreq = 250f, wordCountMultiplier = 1.22f, syllableLengthMs = 76f,
                syllableLengthRandomness = 0.18f, pitchRandomSemitone = 3.6f,
                pitchFallAtEnd = true, speedCurve = 0.34f, timingJitterMs = 14f,
                ringModFreq = 0f, ringModDepth = 0f, noiseAmount = 0.08f,
                filterFreq = 1180f, filterQ = 3.6f, attackMs = 8f,
                releaseMs = 44f, volumeDb = 3f, seed = 7341
            }),
            new MumblePresetDefinition("tiny-creature", "Tiny Creature", "#38bdf8", new MumbleParameters
            {
                basicFreq = 520f, wordCountMultiplier = 1.22f, syllableLengthMs = 66f,
                syllableLengthRandomness = 0.24f, pitchRandomSemitone = 5.8f,
                pitchFallAtEnd = true, speedCurve = 0.46f, timingJitterMs = 12f,
                ringModFreq = 0f, ringModDepth = 0f, noiseAmount = 0.018f,
                filterFreq = 1780f, filterQ = 3.2f, attackMs = 8f,
                releaseMs = 46f, volumeDb = 0.5f, seed = 8128
            }),
            new MumblePresetDefinition("forest-spirit", "Forest Spirit", "#14b8a6", new MumbleParameters
            {
                basicFreq = 320f, wordCountMultiplier = 0.95f, syllableLengthMs = 128f,
                syllableLengthRandomness = 0.16f, pitchRandomSemitone = 3.8f,
                pitchFallAtEnd = true, speedCurve = -0.18f, timingJitterMs = 10f,
                ringModFreq = 10f, ringModDepth = 0.06f, noiseAmount = 0.08f,
                filterFreq = 1280f, filterQ = 2.8f, attackMs = 28f,
                releaseMs = 135f, volumeDb = 1f, seed = 6874
            }),
            new MumblePresetDefinition("tired-villager", "Tired Villager", "#f59e0b", new MumbleParameters
            {
                basicFreq = 190f, wordCountMultiplier = 0.78f, syllableLengthMs = 138f,
                syllableLengthRandomness = 0.36f, pitchRandomSemitone = 3.2f,
                pitchFallAtEnd = true, speedCurve = -0.54f, timingJitterMs = 30f,
                ringModFreq = 0f, ringModDepth = 0f, noiseAmount = 0.14f,
                filterFreq = 780f, filterQ = 3.1f, attackMs = 16f,
                releaseMs = 82f, volumeDb = 4f, seed = 5633
            }),
            new MumblePresetDefinition("monster", "Monster", "#ef4444", new MumbleParameters
            {
                basicFreq = 82f, wordCountMultiplier = 0.7f, syllableLengthMs = 122f,
                syllableLengthRandomness = 0.24f, pitchRandomSemitone = 6.4f,
                pitchFallAtEnd = true, speedCurve = -0.08f, timingJitterMs = 24f,
                ringModFreq = 28f, ringModDepth = 0.32f, noiseAmount = 0.3f,
                filterFreq = 520f, filterQ = 5.8f, attackMs = 9f,
                releaseMs = 96f, volumeDb = 2f, seed = 9090
            }),
            new MumblePresetDefinition("deep-boss", "Deep Boss", "#7c3aed", new MumbleParameters
            {
                basicFreq = 68f, wordCountMultiplier = 0.62f, syllableLengthMs = 150f,
                syllableLengthRandomness = 0.16f, pitchRandomSemitone = 3.8f,
                pitchFallAtEnd = true, speedCurve = -0.22f, timingJitterMs = 12f,
                ringModFreq = 22f, ringModDepth = 0.22f, noiseAmount = 0.22f,
                filterFreq = 430f, filterQ = 4.8f, attackMs = 18f,
                releaseMs = 135f, volumeDb = 1f, seed = 9907
            })
        };

        public static MumblePresetDefinition Find(string id)
        {
            foreach (var preset in All)
            {
                if (preset.id == id)
                {
                    return preset;
                }
            }

            return All[0];
        }
    }
}
