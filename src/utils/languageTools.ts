import initJieba, { cut as jiebaCut } from "jieba-wasm";
import { pinyin } from "pinyin-pro";
import { syllable } from "syllable";
import type { LanguageToolStatus } from "../audio/types";

export interface LanguageTools {
  status: LanguageToolStatus;
  error?: string;
  cutChinese: (text: string) => string[];
  countEnglishSyllables: (word: string) => number;
  getChineseTone: (char: string) => 0 | 1 | 2 | 3 | 4 | undefined;
}

const HAN_RUN_PATTERN = /^[\u3400-\u9fff]+$/;

function fallbackCutChinese(text: string) {
  return Array.from(text);
}

function countEnglishSyllables(word: string) {
  const cleaned = word.replace(/[^A-Za-z0-9']/g, "");
  if (!cleaned) {
    return 1;
  }
  return Math.max(1, Math.min(6, syllable(cleaned)));
}

function getChineseTone(char: string): 0 | 1 | 2 | 3 | 4 | undefined {
  if (!HAN_RUN_PATTERN.test(char)) {
    return undefined;
  }

  const [tone] = pinyin(char, {
    pattern: "num",
    toneSandhi: true,
    type: "array",
  });
  const parsedTone = Number(tone);

  if (parsedTone >= 0 && parsedTone <= 4) {
    return parsedTone as 0 | 1 | 2 | 3 | 4;
  }

  return undefined;
}

export const fallbackLanguageTools: LanguageTools = {
  status: "fallback",
  cutChinese: fallbackCutChinese,
  countEnglishSyllables,
  getChineseTone,
};

export const loadingLanguageTools: LanguageTools = {
  ...fallbackLanguageTools,
  status: "loading",
};

export async function initLanguageTools(): Promise<LanguageTools> {
  try {
    const jiebaWasmUrl = (
      await import(
        "../../node_modules/jieba-wasm/pkg/web/jieba_rs_wasm_bg.wasm?url"
      )
    ).default;
    await initJieba({ module_or_path: jiebaWasmUrl });

    return {
      status: "ready",
      cutChinese: (text: string) => {
        if (!HAN_RUN_PATTERN.test(text)) {
          return fallbackCutChinese(text);
        }

        const segments = jiebaCut(text, true).filter(Boolean);
        return segments.length > 0 ? segments : fallbackCutChinese(text);
      },
      countEnglishSyllables,
      getChineseTone,
    };
  } catch (error) {
    console.error("Failed to initialize jieba-wasm", error);
    return {
      ...fallbackLanguageTools,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
