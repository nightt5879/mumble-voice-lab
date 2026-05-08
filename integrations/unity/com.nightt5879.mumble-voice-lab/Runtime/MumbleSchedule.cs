using System;

namespace MumbleVoiceLab
{
    [Serializable]
    public class MumbleScheduleFile
    {
        public string schema;
        public string schemaVersion;
        public string generatorVersion;
        public string createdAt;
        public string id;
        public string text;
        public MumblePresetSnapshot preset;
        public MumbleExpressionSettings expression;
        public string expressionVersion;
        public float duration;
        public int sampleRate;
        public int channels;
        public MumbleParameters @params;
        public MumbleParameters resolvedParams;
        public MumbleSyllableEvent[] events;
        public MumbleRevealEvent[] revealEvents;

        public bool IsSupportedSchedule()
        {
            return schema == "mumble-voice-lab/schedule" && schemaVersion == "1.0";
        }
    }

    [Serializable]
    public class MumblePresetSnapshot
    {
        public string id;
        public string name;
        public string swatch;
        public MumbleParameters @params;
    }

    [Serializable]
    public class MumbleExpressionSettings
    {
        public string emotion;
        public string style;
        public int intensity;
    }

    [Serializable]
    public class MumblePitchContour
    {
        public float start;
        public float mid;
        public float end;
    }

    [Serializable]
    public class MumbleFormantPoint
    {
        public string vowel;
        public float f1;
        public float f2;
        public float f3;
    }

    [Serializable]
    public class MumbleSyllableEvent
    {
        public int index;
        public string unitId;
        public string language;
        public string eventKind;
        public int tone;
        public MumblePitchContour pitchContour;
        public string wordId;
        public float phraseBoundaryStrength;
        public float time;
        public float duration;
        public float frequency;
        public float gain;
        public float pan;
        public float filterFreq;
        public float filterQ;
        public float attack;
        public float release;
        public float noiseAmount;
        public float ringModFreq;
        public float ringModDepth;
        public string vowel;
        public float revealAt;
        public string revealText;
        public int phraseIndex;
        public MumbleFormantPoint formantStart;
        public MumbleFormantPoint formantEnd;
        public bool sentenceEnd;
        public string punctuationAfter;
        public int noiseSeed;
    }

    [Serializable]
    public class MumbleRevealEvent
    {
        public int index;
        public string unitId;
        public float time;
        public string text;
        public string language;
        public int phraseIndex;
        public int eventIndex;
    }
}
