import { pinyin } from "pinyin-pro";
import { syllable } from "syllable";
import type { LanguageTools } from "../src/utils/languageTools";

const HAN_RUN_PATTERN = /^[\u3400-\u9fff]+$/;

function fallbackCutChinese(text: string) {
  return Array.from(text);
}

function countEnglishSyllables(word: string) {
  const cleaned = word.replace(/[^A-Za-z0-9']/g, "");
  if (!cleaned) return 1;
  return Math.max(1, Math.min(6, syllable(cleaned)));
}

function getChineseTone(char: string): 0 | 1 | 2 | 3 | 4 | undefined {
  if (!HAN_RUN_PATTERN.test(char)) return undefined;
  const [tone] = pinyin(char, { pattern: "num", toneSandhi: true, type: "array" });
  const parsed = Number(tone);
  return parsed >= 0 && parsed <= 4 ? (parsed as 0 | 1 | 2 | 3 | 4) : undefined;
}

export async function makeNodeLanguageTools(): Promise<LanguageTools> {
  try {
    const jieba = (await import("jieba-wasm")) as {
      cut?: (text: string, hmm: boolean) => string[];
      default?: { cut?: (text: string, hmm: boolean) => string[] };
    };
    const cutFn = jieba.cut ?? jieba.default?.cut;
    if (typeof cutFn !== "function") {
      throw new Error("jieba.cut not exported from Node build");
    }

    return {
      status: "ready",
      cutChinese: (text: string) => {
        if (!HAN_RUN_PATTERN.test(text)) return fallbackCutChinese(text);
        const segments = cutFn(text, true).filter(Boolean);
        return segments.length > 0 ? segments : fallbackCutChinese(text);
      },
      countEnglishSyllables,
      getChineseTone,
    };
  } catch (error) {
    console.warn(
      `[mvl] jieba-wasm unavailable in Node; falling back to per-character segmentation. (${
        error instanceof Error ? error.message : String(error)
      })`,
    );
    return {
      status: "fallback",
      cutChinese: fallbackCutChinese,
      countEnglishSyllables,
      getChineseTone,
    };
  }
}
