import {
  HAN_RUN_PATTERN,
  countEnglishSyllables,
  fallbackCutChinese,
  getChineseTone,
  type LanguageTools,
} from "../src/utils/languageCore";

export async function makeNodeLanguageTools(mode = process.env.MVL_LANGUAGE_TOOLS): Promise<LanguageTools> {
  if (mode === "fallback") {
    return {
      status: "fallback",
      cutChinese: fallbackCutChinese,
      countEnglishSyllables,
      getChineseTone,
    };
  }

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
