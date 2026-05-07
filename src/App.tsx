import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildSchedule } from "./audio/scheduler";
import { playMumbleEvents, stopMumblePlayback } from "./audio/synth";
import { downloadBlob, renderEventsToWav } from "./audio/wav";
import {
  defaultExpressionSettings,
  emotionDefinitions,
  neutralExpressionSettings,
  speakingStyleDefinitions,
} from "./expression/defaultExpressions";
import type { EmotionId, ExpressionSettings, SpeakingStyleId } from "./expression/types";
import { defaultPresets } from "./presets/defaultPresets";
import { PresetFace, newPresetIds } from "./presets/PresetFace";
import type { MumbleParameters } from "./presets/types";
import { uiCopy, type UiCopy, type UiLanguage } from "./i18n";
import {
  initLanguageTools,
  loadingLanguageTools,
  type LanguageTools,
} from "./utils/languageTools";

type NumericParameter = Exclude<
  keyof MumbleParameters,
  "pitchFallAtEnd"
>;

interface SliderDefinition {
  key: NumericParameter;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const sliderDefinitions: SliderDefinition[] = [
  { key: "basicFreq", min: 45, max: 900, step: 1, unit: "Hz" },
  { key: "wordCountMultiplier", min: 0.35, max: 2.2, step: 0.01 },
  { key: "syllableLengthMs", min: 35, max: 240, step: 1, unit: "ms" },
  { key: "syllableLengthRandomness", min: 0, max: 0.85, step: 0.01 },
  { key: "pitchRandomSemitone", min: 0, max: 14, step: 0.1, unit: "st" },
  { key: "speedCurve", min: -1, max: 1, step: 0.01 },
  { key: "timingJitterMs", min: 0, max: 90, step: 1, unit: "ms" },
  { key: "ringModFreq", min: 0, max: 180, step: 1, unit: "Hz" },
  { key: "ringModDepth", min: 0, max: 1, step: 0.01 },
  { key: "noiseAmount", min: 0, max: 0.7, step: 0.01 },
  { key: "filterFreq", min: 180, max: 5200, step: 1, unit: "Hz" },
  { key: "filterQ", min: 0.4, max: 18, step: 0.1 },
  { key: "attackMs", min: 1, max: 80, step: 1, unit: "ms" },
  { key: "releaseMs", min: 5, max: 190, step: 1, unit: "ms" },
  { key: "volumeDb", min: -24, max: 12, step: 0.5, unit: "dB" },
  { key: "seed", min: 1, max: 99999, step: 1 },
];

const githubRepositoryUrl = "https://github.com/nightt5879/mumble-voice-lab";
const themeStorageKey = "mumble-voice-lab-theme";

type ThemeChoice = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function getStoredThemeChoice(): ThemeChoice {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(themeStorageKey);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function resolveThemeChoice(choice: ThemeChoice): ResolvedTheme {
  return choice === "system" ? getSystemTheme() : choice;
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height="20"
      viewBox="0 0 16 16"
      width="20"
    >
      <path
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.54 7.54 0 0 1 8 3.86c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
        fill="currentColor"
      />
    </svg>
  );
}

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

function makeJsonFileName(presetId: string, seed: number) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `mumble-${presetId}-${seed}-${stamp}.json`;
}

type AppStatus =
  | { type: "ready" }
  | { type: "toolsReady" }
  | { type: "toolsFallback" }
  | { type: "presetLoaded"; presetId: string }
  | { type: "played"; emotion: EmotionId; style: SpeakingStyleId }
  | { type: "audioFailed" }
  | { type: "abA" }
  | { type: "abB"; emotion: EmotionId; style: SpeakingStyleId }
  | { type: "renderingWav" }
  | { type: "exported"; count: number }
  | { type: "wavFailed" }
  | { type: "jsonExported"; count: number };

type PlaybackLabel =
  | { mode: "current" }
  | { mode: "ab-original" }
  | { mode: "ab-modified" };

function getPresetDisplayName(presetId: string, ui: UiCopy) {
  return ui.presetNames[presetId] ?? presetId;
}

function getEmotionDisplayName(emotion: EmotionId, ui: UiCopy) {
  return ui.emotionNames[emotion] ?? emotion;
}

function getStyleDisplayName(style: SpeakingStyleId, ui: UiCopy) {
  return ui.styleNames[style] ?? style;
}

function formatStatus(status: AppStatus, ui: UiCopy) {
  if (status.type === "ready") {
    return ui.status.ready;
  }
  if (status.type === "toolsReady") {
    return ui.status.toolsReady;
  }
  if (status.type === "toolsFallback") {
    return ui.status.toolsFallback;
  }
  if (status.type === "presetLoaded") {
    return ui.status.presetLoaded(getPresetDisplayName(status.presetId, ui));
  }
  if (status.type === "played") {
    return ui.status.played(
      getEmotionDisplayName(status.emotion, ui),
      getStyleDisplayName(status.style, ui),
    );
  }
  if (status.type === "audioFailed") {
    return ui.status.audioFailed;
  }
  if (status.type === "abA") {
    return ui.status.abA;
  }
  if (status.type === "abB") {
    return ui.status.abB(
      getEmotionDisplayName(status.emotion, ui),
      getStyleDisplayName(status.style, ui),
    );
  }
  if (status.type === "renderingWav") {
    return ui.status.renderingWav;
  }
  if (status.type === "exported") {
    return ui.status.exported(status.count);
  }
  if (status.type === "wavFailed") {
    return ui.status.wavFailed;
  }
  return ui.status.jsonExported(status.count);
}

function getLanguageToolLabel(languageTools: LanguageTools, ui: UiCopy) {
  if (languageTools.status === "ready") {
    return ui.languageTools.ready;
  }
  if (languageTools.status === "loading") {
    return ui.languageTools.loading;
  }
  return ui.languageTools.fallback;
}

function getLanguageToolTitle(languageTools: LanguageTools, ui: UiCopy) {
  if (languageTools.status !== "fallback") {
    return getLanguageToolLabel(languageTools, ui);
  }
  return languageTools.error
    ? `${ui.languageTools.fallbackDescription}: ${languageTools.error}`
    : ui.languageTools.fallbackDescription;
}

function formatPlaybackLabel(
  label: PlaybackLabel,
  expression: ExpressionSettings,
  ui: UiCopy,
) {
  if (label.mode === "ab-original") {
    return {
      title: ui.compare.original,
      detail: ui.compare.originalDetail,
    };
  }

  const detail = ui.compare.modifiedDetail(
    getEmotionDisplayName(expression.emotion, ui),
    getStyleDisplayName(expression.style, ui),
    expression.intensity,
  );

  if (label.mode === "ab-modified") {
    return {
      title: ui.compare.modified,
      detail,
    };
  }

  return {
    title: ui.compare.current,
    detail,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function App() {
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("zh");
  const ui = uiCopy[uiLanguage];
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(getStoredThemeChoice);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveThemeChoice(getStoredThemeChoice()),
  );
  const [text, setText] = useState(
    "Good morning, traveler! Ready for a tiny adventure?",
  );
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPresets[0].id);
  const [params, setParams] = useState<MumbleParameters>(
    defaultPresets[0].params,
  );
  const [status, setStatus] = useState<AppStatus>({ type: "ready" });
  const [isExporting, setIsExporting] = useState(false);
  const [visibleText, setVisibleText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null);
  const [playbackLabel, setPlaybackLabel] = useState<PlaybackLabel>({
    mode: "current",
  });
  const [languageTools, setLanguageTools] =
    useState<LanguageTools>(loadingLanguageTools);
  const [expression, setExpression] = useState<ExpressionSettings>(
    defaultExpressionSettings,
  );
  const playbackTimers = useRef<number[]>([]);
  const playbackSequence = useRef(0);

  const selectedPreset = useMemo(
    () =>
      defaultPresets.find((preset) => preset.id === selectedPresetId) ??
      defaultPresets[0],
    [selectedPresetId],
  );

  const schedule = useMemo(
    () => buildSchedule(text, params, selectedPresetId, languageTools, expression),
    [expression, languageTools, params, selectedPresetId, text],
  );

  const neutralSchedule = useMemo(
    () =>
      buildSchedule(
        text,
        params,
        selectedPresetId,
        languageTools,
        neutralExpressionSettings,
      ),
    [languageTools, params, selectedPresetId, text],
  );

  const clearPlaybackTimers = useCallback(() => {
    playbackTimers.current.forEach((timer) => window.clearTimeout(timer));
    playbackTimers.current = [];
  }, []);

  const clearActivePlayback = useCallback(() => {
    clearPlaybackTimers();
    stopMumblePlayback();
    setIsPlaying(false);
    setActiveEventIndex(null);
  }, [clearPlaybackTimers]);

  const stopPlayback = useCallback(() => {
    playbackSequence.current += 1;
    clearActivePlayback();
  }, [clearActivePlayback]);

  const startTypewriter = useCallback((targetSchedule = schedule) => {
    let accumulatedText = "";
    setVisibleText("");
    setIsPlaying(true);
    setActiveEventIndex(null);

    targetSchedule.revealEvents.forEach((event) => {
      const timer = window.setTimeout(() => {
        accumulatedText += event.text;
        setVisibleText(accumulatedText);
      }, Math.max(0, event.time * 1000));
      playbackTimers.current.push(timer);
    });

    targetSchedule.events.forEach((event) => {
      const startTimer = window.setTimeout(() => {
        setActiveEventIndex(event.index);
      }, Math.max(0, event.time * 1000));
      const endTimer = window.setTimeout(() => {
        setActiveEventIndex((current) => (current === event.index ? null : current));
      }, Math.max(0, (event.time + event.duration) * 1000));
      playbackTimers.current.push(startTimer, endTimer);
    });

    const doneTimer = window.setTimeout(() => {
      setVisibleText(targetSchedule.analysis.normalizedText);
      setIsPlaying(false);
      setActiveEventIndex(null);
    }, Math.max(0, targetSchedule.duration * 1000 + 80));
    playbackTimers.current.push(doneTimer);
  }, [schedule]);

  const setParameter = useCallback(
    (key: keyof MumbleParameters, value: number | boolean) => {
      setParams((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const setExpressionField = useCallback(
    <K extends keyof ExpressionSettings>(key: K, value: ExpressionSettings[K]) => {
      setExpression((current) => ({
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
    setStatus({ type: "presetLoaded", presetId: preset.id });
  };

  const triggerPlayback = useCallback(async () => {
    try {
      stopPlayback();
      setPlaybackLabel({ mode: "current" });
      await playMumbleEvents(schedule.events, schedule.resolvedParams);
      startTypewriter(schedule);
      setStatus({
        type: "played",
        emotion: schedule.expression.emotion,
        style: schedule.expression.style,
      });
    } catch (error) {
      console.error(error);
      setStatus({ type: "audioFailed" });
    }
  }, [schedule, startTypewriter, stopPlayback]);

  const triggerABPlayback = useCallback(async () => {
    playbackSequence.current += 1;
    const runId = playbackSequence.current;
    clearActivePlayback();

    try {
      setPlaybackLabel({ mode: "ab-original" });
      setStatus({ type: "abA" });
      await playMumbleEvents(neutralSchedule.events, neutralSchedule.resolvedParams);
      startTypewriter(neutralSchedule);
      await wait(neutralSchedule.duration * 1000 + 320);

      if (playbackSequence.current !== runId) {
        return;
      }

      clearActivePlayback();
      setPlaybackLabel({ mode: "ab-modified" });
      setStatus({
        type: "abB",
        emotion: schedule.expression.emotion,
        style: schedule.expression.style,
      });
      await playMumbleEvents(schedule.events, schedule.resolvedParams);
      startTypewriter(schedule);
    } catch (error) {
      console.error(error);
      setStatus({ type: "audioFailed" });
    }
  }, [clearActivePlayback, neutralSchedule, schedule, startTypewriter]);

  const exportWav = async () => {
    setIsExporting(true);
    setStatus({ type: "renderingWav" });
    try {
      const blob = await renderEventsToWav(
        schedule.events,
        schedule.resolvedParams,
        schedule.duration,
      );
      downloadBlob(blob, makeFileName(selectedPresetId, params.seed));
      setStatus({ type: "exported", count: schedule.events.length });
    } catch (error) {
      console.error(error);
      setStatus({ type: "wavFailed" });
    } finally {
      setIsExporting(false);
    }
  };

  const exportJson = () => {
    const payload = {
      version: "0.3.0",
      text,
      preset: selectedPreset,
      params,
      expression: schedule.expression,
      resolvedExpression: schedule.resolvedExpression,
      resolvedParams: schedule.resolvedParams,
      analysis: schedule.analysis,
      events: schedule.events,
      revealEvents: schedule.revealEvents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, makeJsonFileName(selectedPresetId, params.seed));
    setStatus({ type: "jsonExported", count: schedule.events.length });
  };

  useEffect(() => {
    let isMounted = true;

    initLanguageTools().then((tools) => {
      if (!isMounted) {
        return;
      }
      setLanguageTools(tools);
      setStatus({ type: tools.status === "ready" ? "toolsReady" : "toolsFallback" });
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, themeChoice);

    const applyTheme = () => {
      const nextTheme = resolveThemeChoice(themeChoice);
      setResolvedTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.dataset.themeChoice = themeChoice;
    };

    applyTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [themeChoice]);

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

  useEffect(() => {
    if (!isPlaying) {
      setVisibleText("");
      setActiveEventIndex(null);
    }
  }, [isPlaying, schedule.seedKey]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const preview = useMemo(
    () => ({
      presetId: schedule.presetId,
      seed: params.seed,
      duration: schedule.duration,
      expression: {
        version: schedule.expressionVersion,
        selected: schedule.expression,
        summary: schedule.resolvedExpression.summary,
        modifiers: schedule.resolvedExpression.modifiers,
      },
      text: {
        chars: schedule.analysis.charCount,
        words: schedule.analysis.wordCount,
        syllables: schedule.analysis.estimatedSyllables,
        ending: schedule.analysis.ending,
        dominantLanguage: schedule.analysis.dominantLanguage,
        languageCounts: schedule.analysis.languageCounts,
        languageToolStatus: schedule.analysis.languageToolStatus,
        phrases: schedule.analysis.phrases.length,
        segments: schedule.analysis.segments.length,
        particles: schedule.analysis.particles.length,
      },
      events: schedule.events.slice(0, 20).map((event) => ({
        t: event.time,
        dur: event.duration,
        hz: event.frequency,
        unitId: event.unitId,
        lang: event.language,
        kind: event.eventKind,
        phrase: event.phraseIndex,
        wordId: event.wordId,
        boundary: event.phraseBoundaryStrength,
        tone: event.tone ?? null,
        pitchContour: event.pitchContour,
        particle:
          schedule.analysis.particles.find(
            (particle) => particle.unitId === event.unitId,
          )?.kind ?? null,
        vowel: event.vowel,
        pauseAfter: event.punctuationAfter ?? null,
      })),
    }),
    [params.seed, schedule],
  );
  const playbackLabelText = formatPlaybackLabel(playbackLabel, expression, ui);
  const themeLabels =
    uiLanguage === "zh"
      ? {
          system: "系统",
          light: "浅色",
          dark: "深色",
          aria: "主题切换",
          resolved: resolvedTheme === "dark" ? "深色" : "浅色",
        }
      : {
          system: "Auto",
          light: "Light",
          dark: "Dark",
          aria: "Theme switcher",
          resolved: resolvedTheme === "dark" ? "Dark" : "Light",
        };
  const themeChoices: ThemeChoice[] = ["system", "light", "dark"];

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <p className="eyebrow">{ui.appEyebrow}</p>
          <h1>
            <span className="accent">Mumble</span> Voice Lab
          </h1>
          <p className="hero-copy">{ui.heroCopy}</p>
        </div>
        <div className="header-status" aria-live="polite">
          <div className="header-actions">
            <div className="theme-toggle" aria-label={themeLabels.aria}>
              {themeChoices.map((choice) => (
                <button
                  className={choice === themeChoice ? "is-active" : ""}
                  key={choice}
                  onClick={() => setThemeChoice(choice)}
                  type="button"
                  title={
                    choice === "system"
                      ? `${themeLabels.system} (${themeLabels.resolved})`
                      : themeLabels[choice]
                  }
                >
                  {themeLabels[choice]}
                </button>
              ))}
            </div>
            <div className="language-toggle" aria-label={ui.uiLanguage}>
              {(["zh", "en"] as const).map((language) => (
                <button
                  className={language === uiLanguage ? "is-active" : ""}
                  key={language}
                  onClick={() => setUiLanguage(language)}
                  type="button"
                >
                  {ui.languageNames[language]}
                </button>
              ))}
            </div>
            <a
              aria-label={
                uiLanguage === "zh" ? "打开 GitHub 仓库" : "Open GitHub repository"
              }
              className="github-link"
              href={githubRepositoryUrl}
              rel="noreferrer"
              target="_blank"
              title={
                uiLanguage === "zh" ? "打开 GitHub 仓库" : "Open GitHub repository"
              }
            >
              <GitHubIcon />
            </a>
          </div>
          <div className="status-row">
            <div className="status-pill">{formatStatus(status, ui)}</div>
            <div
              className={`status-pill language-status is-${languageTools.status}`}
              title={getLanguageToolTitle(languageTools, ui)}
            >
              {getLanguageToolLabel(languageTools, ui)}
            </div>
          </div>
        </div>
      </header>

      <section className="studio-shell">
        <section className="hero-grid">
          <section className="panel composer-panel" aria-label={ui.aria.dialogueComposer}>
            <div className="panel-heading">
              <div>
                <h2>{ui.panels.statement}</h2>
                <span>
                  {schedule.events.length} {ui.analysis.blips} ·{" "}
                  {schedule.duration.toFixed(2)}s
                </span>
              </div>
            </div>

            <textarea
              aria-label={ui.aria.dialogueText}
              value={text}
              onChange={(event) => setText(event.target.value)}
              spellCheck={false}
            />

            <div className="expression-controls" aria-label={ui.aria.expressionControls}>
              <label className="select-row">
                <span>{ui.fields.emotion}</span>
                <select
                  value={expression.emotion}
                  onChange={(event) =>
                    setExpressionField("emotion", event.target.value as EmotionId)
                  }
                >
                  {emotionDefinitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {getEmotionDisplayName(definition.id, ui)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="select-row">
                <span>{ui.fields.style}</span>
                <select
                  value={expression.style}
                  onChange={(event) =>
                    setExpressionField("style", event.target.value as SpeakingStyleId)
                  }
                >
                  {speakingStyleDefinitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {getStyleDisplayName(definition.id, ui)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="expression-intensity">
                <span>
                  <span>{ui.fields.intensity}</span>
                  <output>{expression.intensity}%</output>
                </span>
                <input
                  max={100}
                  min={0}
                  onChange={(event) =>
                    setExpressionField("intensity", Number(event.target.value))
                  }
                  step={1}
                  type="range"
                  value={expression.intensity}
                />
              </label>
            </div>

            <div className="button-row">
              <button className="primary-button" onClick={triggerPlayback} type="button">
                {ui.buttons.trigger}
              </button>
              <button className="secondary-button" onClick={triggerABPlayback} type="button">
                {ui.buttons.abCompare}
              </button>
              <button
                className="secondary-button"
                disabled={!isPlaying}
                onClick={stopPlayback}
                type="button"
              >
                {ui.buttons.stop}
              </button>
              <button
                className="secondary-button"
                disabled={isExporting}
                onClick={exportWav}
                type="button"
              >
                {isExporting ? ui.buttons.rendering : ui.buttons.exportWav}
              </button>
              <button className="secondary-button" onClick={exportJson} type="button">
                {ui.buttons.exportJson}
              </button>
            </div>
          </section>

          <section className="panel performance-panel">
            <div className="panel-heading">
              <div>
                <h2>{uiLanguage === "zh" ? "实时预览" : "Live Preview"}</h2>
                <span>{playbackLabelText.detail}</span>
              </div>
            </div>

            <div className="dialogue-preview" aria-live="polite">
              <div className={`playback-label is-${playbackLabel.mode}`}>
                <strong>{playbackLabelText.title}</strong>
              </div>
              <span>{visibleText || schedule.analysis.normalizedText || " "}</span>
              <i className={`talk-caret ${isPlaying ? "is-active" : ""}`} aria-hidden="true" />
            </div>

            <div className="event-strip" aria-label={ui.aria.generatedEventStrip}>
              {schedule.events.map((event) => (
                <span
                  className={`event-blip ${
                    event.index === activeEventIndex ? "is-current" : ""
                  }`}
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
                <span>{ui.analysis.chars}</span>
                <strong>{schedule.analysis.charCount}</strong>
              </div>
              <div>
                <span>{ui.analysis.words}</span>
                <strong>{schedule.analysis.wordCount}</strong>
              </div>
              <div>
                <span>{ui.analysis.syllables}</span>
                <strong>{schedule.analysis.estimatedSyllables}</strong>
              </div>
              <div>
                <span>{ui.analysis.duration}</span>
                <strong>{schedule.duration.toFixed(2)}s</strong>
              </div>
              <div>
                <span>{ui.analysis.tools}</span>
                <strong>{ui.languageTools.short[schedule.analysis.languageToolStatus]}</strong>
              </div>
              <div>
                <span>{ui.analysis.expression}</span>
                <strong>{getEmotionDisplayName(schedule.expression.emotion, ui)}</strong>
              </div>
            </div>
          </section>
        </section>

        <section className="panel preset-panel" aria-label={ui.aria.characterPresets}>
          <div className="panel-heading">
            <div>
              <h2>{ui.panels.characters}</h2>
              <span>
                {uiLanguage === "zh"
                  ? "选择角色底色，再叠加情绪和说话方式"
                  : "Choose a character voice base, then layer emotion and style"}
              </span>
            </div>
          </div>
          <div className="preset-list">
            {defaultPresets.map((preset) => (
              <button
                className={[
                  "preset-button",
                  preset.id === selectedPresetId ? "is-active" : "",
                  newPresetIds.has(preset.id) ? "is-new" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={preset.id}
                onClick={() => selectPreset(preset.id)}
                type="button"
              >
                <PresetFace presetId={preset.id} className="preset-face" />
                <span>
                  <strong>{getPresetDisplayName(preset.id, ui)}</strong>
                  <small>
                    {preset.params.basicFreq} Hz · seed {preset.params.seed}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <details className="panel advanced-panel">
          <summary>
            <span>{uiLanguage === "zh" ? "高级 / Sound Lab" : "Advanced / Sound Lab"}</span>
            <small>
              {uiLanguage === "zh"
                ? "参数、Preset JSON 与事件预览"
                : "Parameters, preset JSON, and event preview"}
            </small>
          </summary>

          <div className="advanced-content">
            <section className="parameter-panel" aria-label={ui.aria.parameters}>
              <div className="panel-heading compact-heading">
                <h2>{ui.panels.parameters}</h2>
              </div>

              <label className="toggle-row">
                <input
                  checked={params.pitchFallAtEnd}
                  onChange={(event) =>
                    setParameter("pitchFallAtEnd", event.target.checked)
                  }
                  type="checkbox"
                />
                <span className="toggle-copy">
                  <span>{ui.fields.pitchFallAtEnd}</span>
                  <small>{ui.parameterDescriptions.pitchFallAtEnd}</small>
                </span>
              </label>

              <div className="slider-list">
                {sliderDefinitions.map((definition) => (
                  <label className="slider-row" key={definition.key}>
                    <span>
                      <span>{ui.parameterLabels[definition.key]}</span>
                      <output>
                        {formatValue(
                          Number(params[definition.key]),
                          definition.step,
                          definition.unit,
                        )}
                      </output>
                    </span>
                    <small>{ui.parameterDescriptions[definition.key]}</small>
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
            </section>

            <section className="preview-block">
              <h3>{ui.panels.eventPreview}</h3>
              <pre>{JSON.stringify(preview, null, 2)}</pre>
            </section>

            <section className="preset-json">
              <h3>{ui.panels.presetJson}</h3>
              <pre>{JSON.stringify(selectedPreset, null, 2)}</pre>
            </section>
          </div>
        </details>
      </section>
    </main>
  );
}
