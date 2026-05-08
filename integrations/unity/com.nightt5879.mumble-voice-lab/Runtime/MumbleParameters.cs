using System;

namespace MumbleVoiceLab
{
    [Serializable]
    public class MumbleParameters
    {
        public float basicFreq = 330f;
        public float wordCountMultiplier = 1.05f;
        public float syllableLengthMs = 92f;
        public float syllableLengthRandomness = 0.28f;
        public float pitchRandomSemitone = 4.8f;
        public bool pitchFallAtEnd = true;
        public float speedCurve = 0.18f;
        public float timingJitterMs = 18f;
        public float ringModFreq = 0f;
        public float ringModDepth = 0f;
        public float noiseAmount = 0.08f;
        public float filterFreq = 1350f;
        public float filterQ = 4.6f;
        public float attackMs = 7f;
        public float releaseMs = 42f;
        public float volumeDb = 4f;
        public int seed = 1234;

        public MumbleParameters Clone()
        {
            return (MumbleParameters)MemberwiseClone();
        }
    }
}
