import { createRequire } from "node:module";

const nodeRequire = createRequire(
  typeof __filename === "string" ? __filename : import.meta.url,
);
const nodeAudio = nodeRequire("node-web-audio-api") as typeof import("node-web-audio-api");

export function installNodeWebAudio() {
  for (const key of Object.keys(nodeAudio) as Array<keyof typeof nodeAudio>) {
    if (!(key in globalThis)) {
      (globalThis as unknown as Record<string, unknown>)[key] = nodeAudio[key];
    }
  }
}
