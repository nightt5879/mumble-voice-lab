import type { EmotionId, SpeakingStyleId } from "./expression/types";
import type { MumbleParameters } from "./presets/types";

export type UiLanguage = "zh" | "en";

type ParameterKey = Exclude<keyof MumbleParameters, "pitchFallAtEnd">;

export interface UiCopy {
  appEyebrow: string;
  heroCopy: string;
  uiLanguage: string;
  languageNames: Record<UiLanguage, string>;
  status: {
    ready: string;
    toolsReady: string;
    toolsFallback: string;
    presetLoaded: (presetName: string) => string;
    played: (emotionName: string, styleName: string) => string;
    audioFailed: string;
    abA: string;
    abB: (emotionName: string, styleName: string) => string;
    renderingWav: string;
    exported: (count: number) => string;
    wavFailed: string;
    jsonExported: (count: number) => string;
  };
  panels: {
    characters: string;
    statement: string;
    parameters: string;
    presetJson: string;
    eventPreview: string;
  };
  buttons: {
    trigger: string;
    abCompare: string;
    stop: string;
    exportWav: string;
    rendering: string;
    exportJson: string;
  };
  fields: {
    emotion: string;
    style: string;
    intensity: string;
    pitchFallAtEnd: string;
  };
  compare: {
    current: string;
    original: string;
    modified: string;
    originalDetail: string;
    modifiedDetail: (emotionName: string, styleName: string, intensity: number) => string;
  };
  analysis: {
    chars: string;
    words: string;
    syllables: string;
    duration: string;
    tools: string;
    expression: string;
    blips: string;
  };
  languageTools: {
    ready: string;
    loading: string;
    fallback: string;
    fallbackDescription: string;
    short: {
      ready: string;
      loading: string;
      fallback: string;
    };
  };
  aria: {
    characterPresets: string;
    dialogueComposer: string;
    dialogueText: string;
    expressionControls: string;
    generatedEventStrip: string;
    parameters: string;
  };
  presetNames: Record<string, string>;
  parameterLabels: Record<ParameterKey, string>;
  parameterDescriptions: Record<keyof MumbleParameters, string>;
  emotionNames: Record<EmotionId, string>;
  styleNames: Record<SpeakingStyleId, string>;
}

export const uiCopy: Record<UiLanguage, UiCopy> = {
  zh: {
    appEyebrow: "原型音频工具",
    heroCopy:
      "为游戏角色生成可爱的 mumble / gibberish 台词声音。输入一句话，选角色、调情绪，然后直接试听或导出。",
    uiLanguage: "界面语言",
    languageNames: {
      zh: "中文",
      en: "English",
    },
    status: {
      ready: "就绪",
      toolsReady: "语言工具已就绪",
      toolsFallback: "语言工具使用回退模式",
      presetLoaded: (presetName) => `已载入 ${presetName}`,
      played: (emotionName, styleName) => `已播放 ${emotionName} / ${styleName}`,
      audioFailed: "音频播放失败",
      abA: "A：中性 / 普通",
      abB: (emotionName, styleName) => `B：${emotionName} / ${styleName}`,
      renderingWav: "正在渲染 WAV",
      exported: (count) => `已导出 ${count} 个事件`,
      wavFailed: "WAV 导出失败",
      jsonExported: (count) => `已导出包含 ${count} 个事件的 JSON`,
    },
    panels: {
      characters: "角色",
      statement: "台词",
      parameters: "参数",
      presetJson: "Preset JSON",
      eventPreview: "事件预览",
    },
    buttons: {
      trigger: "播放台词",
      abCompare: "A/B 对比",
      stop: "停止",
      exportWav: "导出 WAV",
      rendering: "渲染中...",
      exportJson: "导出 JSON",
    },
    fields: {
      emotion: "情绪",
      style: "风格",
      intensity: "强度",
      pitchFallAtEnd: "句尾音高下降",
    },
    compare: {
      current: "当前表达",
      original: "A 原始版本",
      modified: "B 修改后版本",
      originalDetail: "Neutral / Normal，不使用情绪或风格修改",
      modifiedDetail: (emotionName, styleName, intensity) =>
        `${emotionName} / ${styleName}，强度 ${intensity}%`,
    },
    analysis: {
      chars: "字符",
      words: "词/字",
      syllables: "音节",
      duration: "时长",
      tools: "工具",
      expression: "表达",
      blips: "blips",
    },
    languageTools: {
      ready: "语言工具：就绪",
      loading: "语言工具：加载中",
      fallback: "语言工具：基础模式",
      fallbackDescription: "中文分词未加载，已使用规则切分；应用仍可正常播放和导出",
      short: {
        ready: "就绪",
        loading: "加载中",
        fallback: "基础",
      },
    },
    aria: {
      characterPresets: "角色预设",
      dialogueComposer: "台词编辑器",
      dialogueText: "台词文本",
      expressionControls: "表达控制",
      generatedEventStrip: "生成事件条",
      parameters: "参数",
    },
    presetNames: {
      "cute-npc": "可爱 NPC",
      "robot-guard": "机器人守卫",
      "soft-mascot": "软萌吉祥物",
      "talkative-merchant": "话多商人",
      "tiny-creature": "小生物",
      "forest-spirit": "森林精灵",
      "tired-villager": "疲惫村民",
      monster: "怪物",
      "deep-boss": "低沉 Boss",
    },
    parameterLabels: {
      basicFreq: "基础频率",
      wordCountMultiplier: "字词数量倍率",
      syllableLengthMs: "音节长度",
      syllableLengthRandomness: "长度随机",
      pitchRandomSemitone: "音高随机",
      speedCurve: "速度曲线",
      timingJitterMs: "时间抖动",
      ringModFreq: "环形调制频率",
      ringModDepth: "环形调制深度",
      noiseAmount: "噪声量",
      filterFreq: "滤波频率",
      filterQ: "滤波 Q",
      attackMs: "起音",
      releaseMs: "释音",
      volumeDb: "音量",
      seed: "种子",
    },
    parameterDescriptions: {
      basicFreq: "决定整体音高底座；越高越尖，越低越沉。",
      wordCountMultiplier: "影响文本会生成多少 blip，越高越密集。",
      syllableLengthMs: "控制单个 blip 持续时间，越长越拖、越短越跳。",
      syllableLengthRandomness: "增加长短变化；过高会让节奏更不稳定。",
      pitchRandomSemitone: "增加音高跳动；过高时高频角色更容易刺耳。",
      pitchFallAtEnd: "让句尾自然下坠，主要影响句号、问号和短语末尾。",
      speedCurve: "控制前后速度变化，正值后段更快，负值后段更慢。",
      timingJitterMs: "增加时间微抖；过高会产生卡顿感。",
      ringModFreq: "设置机械/粗糙调制的速度，常用于机器人和怪物。",
      ringModDepth: "控制调制强度；过高会更硬，也更容易产生爆音风险。",
      noiseAmount: "增加气声和粗糙度，适合低语、怪物或神秘角色。",
      filterFreq: "控制亮度和开口感；越高越亮，越低越闷。",
      filterQ: "控制滤波峰值；越高越尖锐，也更容易刺耳。",
      attackMs: "控制淡入速度；太短容易有点击声。",
      releaseMs: "控制淡出尾巴；太短容易硬切，太长会拖尾。",
      volumeDb: "最终输出音量；过高会压缩更明显。",
      seed: "改变随机细节；同文本同参数同种子会得到同样结果。",
    },
    emotionNames: {
      neutral: "中性",
      happy: "开心",
      angry: "生气",
      sad: "难过",
      nervous: "紧张",
      sleepy: "困倦",
      surprised: "惊讶",
      scared: "害怕",
    },
    styleNames: {
      normal: "普通",
      whisper: "低语",
      shout: "喊叫",
      mutter: "嘟囔",
      formal: "正式",
      chant: "吟唱",
    },
  },
  en: {
    appEyebrow: "Prototype audio tool",
    heroCopy:
      "Design cute mumble and gibberish dialogue voices for game characters. Type a line, choose a character, shape the expression, then preview or export.",
    uiLanguage: "UI language",
    languageNames: {
      zh: "中文",
      en: "English",
    },
    status: {
      ready: "Ready",
      toolsReady: "Language tools ready",
      toolsFallback: "Language tools fallback mode",
      presetLoaded: (presetName) => `${presetName} loaded`,
      played: (emotionName, styleName) => `Played ${emotionName} / ${styleName}`,
      audioFailed: "Audio playback failed",
      abA: "A: Neutral / Normal",
      abB: (emotionName, styleName) => `B: ${emotionName} / ${styleName}`,
      renderingWav: "Rendering WAV",
      exported: (count) => `Exported ${count} events`,
      wavFailed: "WAV export failed",
      jsonExported: (count) => `Exported JSON with ${count} events`,
    },
    panels: {
      characters: "Characters",
      statement: "Statement",
      parameters: "Parameters",
      presetJson: "Preset JSON",
      eventPreview: "Event Preview",
    },
    buttons: {
      trigger: "Trigger Statement",
      abCompare: "A/B Compare",
      stop: "Stop",
      exportWav: "Export WAV",
      rendering: "Rendering...",
      exportJson: "Export JSON",
    },
    fields: {
      emotion: "Emotion",
      style: "Style",
      intensity: "Intensity",
      pitchFallAtEnd: "Pitch Fall At End",
    },
    compare: {
      current: "Current expression",
      original: "A Original",
      modified: "B Modified",
      originalDetail: "Neutral / Normal, without emotion or style changes",
      modifiedDetail: (emotionName, styleName, intensity) =>
        `${emotionName} / ${styleName}, intensity ${intensity}%`,
    },
    analysis: {
      chars: "Chars",
      words: "Words",
      syllables: "Syllables",
      duration: "Duration",
      tools: "Tools",
      expression: "Expression",
      blips: "blips",
    },
    languageTools: {
      ready: "Language Tools: Ready",
      loading: "Language Tools: Loading",
      fallback: "Language Tools: Basic Mode",
      fallbackDescription:
        "Chinese segmentation did not load, so rule-based splitting is active; playback and export still work",
      short: {
        ready: "ready",
        loading: "loading",
        fallback: "basic",
      },
    },
    aria: {
      characterPresets: "Character presets",
      dialogueComposer: "Dialogue composer",
      dialogueText: "Dialogue text",
      expressionControls: "Expression controls",
      generatedEventStrip: "Generated event strip",
      parameters: "Parameters",
    },
    presetNames: {
      "cute-npc": "Cute NPC",
      "robot-guard": "Robot Guard",
      "soft-mascot": "Soft Mascot",
      "talkative-merchant": "Talkative Merchant",
      "tiny-creature": "Tiny Creature",
      "forest-spirit": "Forest Spirit",
      "tired-villager": "Tired Villager",
      monster: "Monster",
      "deep-boss": "Deep Boss",
    },
    parameterLabels: {
      basicFreq: "Basic Freq",
      wordCountMultiplier: "Word Count Mult",
      syllableLengthMs: "Syllable Length",
      syllableLengthRandomness: "Length Random",
      pitchRandomSemitone: "Pitch Random",
      speedCurve: "Speed Curve",
      timingJitterMs: "Timing Jitter",
      ringModFreq: "Ring Mod Freq",
      ringModDepth: "Ring Mod Depth",
      noiseAmount: "Noise Amount",
      filterFreq: "Filter Freq",
      filterQ: "Filter Q",
      attackMs: "Attack",
      releaseMs: "Release",
      volumeDb: "Volume",
      seed: "Seed",
    },
    parameterDescriptions: {
      basicFreq: "Sets the overall pitch base: higher is brighter, lower is heavier.",
      wordCountMultiplier: "Changes how many blips the text produces; higher is denser.",
      syllableLengthMs: "Controls each blip length; longer drags, shorter hops.",
      syllableLengthRandomness: "Adds length variation; high values make rhythm less stable.",
      pitchRandomSemitone: "Adds pitch jumps; high values can make bright voices sharper.",
      pitchFallAtEnd: "Adds a natural tail drop around phrase and sentence endings.",
      speedCurve: "Shapes speed over the line; positive accelerates, negative slows down.",
      timingJitterMs: "Adds timing wobble; high values can sound choppy.",
      ringModFreq: "Sets the speed of mechanical or rough modulation.",
      ringModDepth: "Controls modulation strength; high values sound harder and risk pops.",
      noiseAmount: "Adds breath and roughness for whispers, monsters, or mysterious voices.",
      filterFreq: "Controls brightness and mouth openness.",
      filterQ: "Controls filter sharpness; high values can sound piercing.",
      attackMs: "Controls fade-in speed; too short can click.",
      releaseMs: "Controls fade-out tail; too short can hard-cut.",
      volumeDb: "Final output level; high values push compression harder.",
      seed: "Changes random detail; same text, parameters, and seed stay deterministic.",
    },
    emotionNames: {
      neutral: "Neutral",
      happy: "Happy",
      angry: "Angry",
      sad: "Sad",
      nervous: "Nervous",
      sleepy: "Sleepy",
      surprised: "Surprised",
      scared: "Scared",
    },
    styleNames: {
      normal: "Normal",
      whisper: "Whisper",
      shout: "Shout",
      mutter: "Mutter",
      formal: "Formal",
      chant: "Chant",
    },
  },
};
