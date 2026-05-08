import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMvl } from "./mvl";

async function main() {
  const outDir = await mkdtemp(join(tmpdir(), "mvl-cli-"));
  const first = await runMvl([
    "render",
    "--text",
    "Good morning, traveler! Ready?",
    "--preset",
    "cute-npc",
    "--emotion",
    "happy",
    "--style",
    "normal",
    "--intensity",
    "75",
    "--name",
    "sample-a",
    "--out-dir",
    outDir,
  ]);
  const second = await runMvl([
    "render",
    "--text",
    "Good morning, traveler! Ready?",
    "--preset",
    "cute-npc",
    "--emotion",
    "happy",
    "--style",
    "normal",
    "--intensity",
    "75",
    "--name",
    "sample-b",
    "--out-dir",
    outDir,
  ]);

  assert(first && "eventCount" in first);
  assert(second && "eventCount" in second);
  assert.equal(first.eventCount, second.eventCount);
  assert.equal(first.duration, second.duration);
  assert(first.bytes > 44);

  const firstSchedule = JSON.parse(await readFile(first.schedulePath, "utf8"));
  const secondSchedule = JSON.parse(await readFile(second.schedulePath, "utf8"));

  assert.equal(firstSchedule.schema, "mumble-voice-lab/schedule");
  assert.equal(firstSchedule.schemaVersion, "1.0");
  assert.equal(firstSchedule.sampleRate, 44100);
  assert.equal(firstSchedule.channels, 2);
  assert.deepEqual(firstSchedule.events, secondSchedule.events);
  assert.deepEqual(firstSchedule.revealEvents, secondSchedule.revealEvents);

  const batchPath = join(outDir, "batch.json");
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(
      batchPath,
      JSON.stringify({
        items: [
          {
            id: "guard-warning",
            text: "Gate opening in three seconds!",
            preset: "robot-guard",
            emotion: "angry",
            style: "shout",
            intensity: 85,
          },
        ],
      }),
      "utf8",
    ),
  );

  const batch = await runMvl(["batch", "--input", batchPath, "--out-dir", outDir]);
  assert(batch && "count" in batch);
  assert.equal(batch.count, 1);

  console.log("[test-cli] passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
