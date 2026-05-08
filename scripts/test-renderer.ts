import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { runMvl } from "./mvl";

const execFileAsync = promisify(execFile);
const rendererPath = resolve(
  "integrations/godot/addons/mumble_voice_lab/bin/win-x64/mvl-renderer-win-x64.exe",
);

function normalizeSchedule(value: unknown) {
  const parsed = value as Record<string, unknown>;
  const clone = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;
  delete clone.createdAt;
  return clone;
}

async function readJson(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function main() {
  const outDir = await mkdtemp(join(tmpdir(), "mvl-renderer-"));
  const nodeOut = join(outDir, "node");
  const exeOut = join(outDir, "exe");
  const args = [
    "render",
    "--text",
    "你好 adventurer，ready?",
    "--preset",
    "cute-npc",
    "--emotion",
    "happy",
    "--style",
    "normal",
    "--intensity",
    "75",
    "--seed",
    "4242",
    "--id",
    "renderer-parity",
    "--name",
    "renderer-parity",
    "--audio-renderer",
    "pcm",
    "--language-tools",
    "fallback",
  ];

  const nodeResult = await runMvl([...args, "--out-dir", nodeOut]);
  assert(nodeResult && "schedulePath" in nodeResult);

  const { stdout, stderr } = await execFileAsync(rendererPath, [...args, "--out-dir", exeOut, "--json"], {
    maxBuffer: 1024 * 1024 * 10,
  });
  if (stderr.trim()) {
    console.error(stderr);
  }
  const exeResult = JSON.parse(stdout) as { schedulePath: string; wavPath: string; bytes: number };
  assert(exeResult.bytes > 44);

  const nodeSchedule = normalizeSchedule(await readJson(nodeResult.schedulePath));
  const exeSchedule = normalizeSchedule(await readJson(exeResult.schedulePath));
  assert.deepEqual(exeSchedule, nodeSchedule);

  const wavHeader = await readFile(exeResult.wavPath);
  assert.equal(wavHeader.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(wavHeader.subarray(8, 12).toString("ascii"), "WAVE");

  console.log("[test-renderer] passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
