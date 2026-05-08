import initJieba, { cut as jiebaCut } from "jieba-wasm";
export {
  fallbackCutChinese,
  fallbackLanguageTools,
  loadingLanguageTools,
  countEnglishSyllables,
  getChineseTone,
  HAN_RUN_PATTERN,
  type LanguageTools,
} from "./languageCore";
import {
  fallbackCutChinese,
  fallbackLanguageTools,
  countEnglishSyllables,
  getChineseTone,
  HAN_RUN_PATTERN,
  type LanguageTools,
} from "./languageCore";

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
