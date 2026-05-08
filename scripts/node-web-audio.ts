import * as nodeAudio from "node-web-audio-api";

export function installNodeWebAudio() {
  for (const key of Object.keys(nodeAudio) as Array<keyof typeof nodeAudio>) {
    if (!(key in globalThis)) {
      (globalThis as unknown as Record<string, unknown>)[key] = nodeAudio[key];
    }
  }
}
