import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSchedule } from "./audio/scheduler";
import { playMumbleEvents } from "./audio/synth";
import { downloadBlob, renderEventsToWav } from "./audio/wav";
import { defaultPresets } from "./presets/defaultPresets";
import type { MumbleParameters } from "./presets/types";

type NumericParameter = Exclude<
  keyof MumbleParameters,
  "pitchFallAtEnd"
>;

interface SliderDefinition {
  key: NumericParameter;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const sliderDefinitions: SliderDefinition[] = [
  { key: "basicFreq", label: "Basic Freq", min: 45, max: 900, step: 1, unit: "Hz" },
  { key: "wordCountMultiplier", label: "Word Count Mult", min: 0.35, max: 2.2, step: 0.01 },
  { key: "syllableLengthMs", label: "Syllable Length", min: 35, max: 240, step: 1, unit: "ms" },
  { key: "syllableLengthRandomness", label: "Length Random", min: 0, max: 0.85, step: 0.01 },
  { key: "pitchRandomSemitone", label: "Pitch Random", min: 0, max: 14, step: 0.1, unit: "st" },
  { key: "speedCurve", label: "Speed Curve", min: -1, max: 1, step: 0.01 },
  { key: "timingJitterMs", label: "Timing Jitter", min: 0, max: 90, step: 1, unit: "ms" },
  { key: "ringModFreq", label: "Ring Mod Freq", min: 0, max: 180, step: 1, unit: "Hz" },
  { key: "ringModDepth", label: "Ring Mod Depth", min: 0, max: 1, step: 0.01 },
  { key: "noiseAmount", label: "Noise Amount", min: 0, max: 0.7, step: 0.01 },
  { key: "filterFreq", label: "Filter Freq", min: 180, max: 5200, step: 1, unit: "Hz" },
  { key: "filterQ", label: "Filter Q", min: 0.4, max: 18, step: 0.1 },
  { key: "attackMs", label: "Attack", min: 1, max: 80, step: 1, unit: "ms" },
  { key: "releaseMs", label: "Release", min: 5, max: 190, step: 1, unit: "ms" },
  { key: "volumeDb", label: "Volume", min: -24, max: 12, step: 0.5, unit: "dB" },
  { key: "seed", label: "Seed", min: 1, max: 99999, step: 1 },
];

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

function formatValue(value: number, step: number, unit?: string) {
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
}

function makeFileName(presetId: string, seed: number) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `mumble-${presetId}-${seed}-${stamp}.wav`;
}

export default function App() {
  const [text, setText] = useState(
    "Good morning, traveler! Ready for a tiny adventure?",
  );
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPresets[0].id);
  const [params, setParams] = useState<MumbleParameters>(
    defaultPresets[0].params,
  );
  const [status, setStatus] = useState("Ready");
  const [isExporting, setIsExporting] = useState(false);

  const selectedPreset = useMemo(
    () =>
      defaultPresets.find((preset) => preset.id === selectedPresetId) ??
      defaultPresets[0],
    [selectedPresetId],
  );

  const schedule = useMemo(
    () => buildSchedule(text, params, selectedPresetId),
    [params, selectedPresetId, text],
  );

  const setParameter = useCallback(
    (key: keyof MumbleParameters, value: number | boolean) => {
      setParams((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const selectPreset = (presetId: string) => {
    const preset = defaultPresets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    setSelectedPresetId(preset.id);
    setParams({ ...preset.params });
    setStatus(`${preset.name} loaded`);
  };

  const triggerPlayback = useCallback(async () => {
    try {
      await playMumbleEvents(schedule.events, params);
      setStatus(`Played ${schedule.events.length} events`);
    } catch (error) {
      console.error(error);
      setStatus("Audio playback failed");
    }
  }, [params, schedule.events]);

  const exportWav = async () => {
    setIsExporting(true);
    setStatus("Rendering WAV");
    try {
      const blob = await renderEventsToWav(schedule.events, params, schedule.duration);
      downloadBlob(blob, makeFileName(selectedPresetId, params.seed));
      setStatus(`Exported ${schedule.events.length} events`);
    } catch (error) {
      console.error(error);
      setStatus("WAV export failed");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isEditableTarget(event.target)) {
        return;
      }
      event.preventDefault();
      void triggerPlayback();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerPlayback]);

  const preview = useMemo(
    () => ({
      presetId: schedule.presetId,
      seed: params.seed,
      duration: schedule.duration,
      text: {
        chars: schedule.analysis.charCount,
        words: schedule.analysis.wordCount,
        syllables: schedule.analysis.estimatedSyllables,
        ending: schedule.analysis.ending,
      },
      events: schedule.events.slice(0, 20).map((event) => ({
        t: event.time,
        dur: event.duration,
        hz: event.frequency,
        vowel: event.vowel,
        pauseAfter: event.punctuationAfter ?? null,
      })),
    }),
    [params.seed, schedule],
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Prototype audio tool</p>
          <h1>Mumble Voice Lab</h1>
        </div>
        <div className="status-pill" aria-live="polite">
          {status}
        </div>
      </header>

      <section className="workspace">
        <aside className="panel preset-panel" aria-label="Character presets">
          <div className="panel-heading">
            <h2>Characters</h2>
          </div>
          <div className="preset-list">
            {defaultPresets.map((preset) => (
              <button
                className={`preset-button ${
                  preset.id === selectedPresetId ? "is-active" : ""
                }`}
                key={preset.id}
                onClick={() => selectPreset(preset.id)}
                type="button"
              >
                <span
                  className="preset-swatch"
                  style={{ backgroundColor: preset.swatch }}
                  aria-hidden="true"
                />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="preset-json">
            <h3>Preset JSON</h3>
            <pre>{JSON.stringify(selectedPreset, null, 2)}</pre>
          </div>
        </aside>

        <section className="panel composer-panel" aria-label="Dialogue composer">
          <div className="panel-heading">
            <h2>Statement</h2>
            <span>{schedule.events.length} blips</span>
          </div>

          <textarea
            aria-label="Dialogue text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
          />

          <div className="button-row">
            <button className="primary-button" onClick={triggerPlayback} type="button">
              Trigger Statement
            </button>
            <button
              className="secondary-button"
              disabled={isExporting}
              onClick={exportWav}
              type="button"
            >
              {isExporting ? "Rendering..." : "Export WAV"}
            </button>
          </div>

          <div className="event-strip" aria-label="Generated event strip">
            {schedule.events.map((event) => (
              <span
                className="event-blip"
                key={event.index}
                style={{
                  left: `${(event.time / schedule.duration) * 100}%`,
                  width: `${Math.max(1.4, (event.duration / schedule.duration) * 100)}%`,
                  height: `${28 + event.gain * 36}px`,
                }}
                title={`${event.vowel} ${event.frequency.toFixed(1)} Hz`}
              />
            ))}
          </div>

          <div className="analysis-grid">
            <div>
              <span>Chars</span>
              <strong>{schedule.analysis.charCount}</strong>
            </div>
            <div>
              <span>Words</span>
              <strong>{schedule.analysis.wordCount}</strong>
            </div>
            <div>
              <span>Syllables</span>
              <strong>{schedule.analysis.estimatedSyllables}</strong>
            </div>
            <div>
              <span>Duration</span>
              <strong>{schedule.duration.toFixed(2)}s</strong>
            </div>
          </div>

          <div className="preview-block">
            <h3>Event Preview</h3>
            <pre>{JSON.stringify(preview, null, 2)}</pre>
          </div>
        </section>

        <aside className="panel parameter-panel" aria-label="Parameters">
          <div className="panel-heading">
            <h2>Parameters</h2>
          </div>

          <label className="toggle-row">
            <input
              checked={params.pitchFallAtEnd}
              onChange={(event) =>
                setParameter("pitchFallAtEnd", event.target.checked)
              }
              type="checkbox"
            />
            <span>Pitch Fall At End</span>
          </label>

          <div className="slider-list">
            {sliderDefinitions.map((definition) => (
              <label className="slider-row" key={definition.key}>
                <span>
                  <span>{definition.label}</span>
                  <output>
                    {formatValue(
                      Number(params[definition.key]),
                      definition.step,
                      definition.unit,
                    )}
                  </output>
                </span>
                <input
                  max={definition.max}
                  min={definition.min}
                  onChange={(event) =>
                    setParameter(definition.key, Number(event.target.value))
                  }
                  step={definition.step}
                  type="range"
                  value={Number(params[definition.key])}
                />
              </label>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
