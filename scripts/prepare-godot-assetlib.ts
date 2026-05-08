import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "integrations/godot/addons/mumble_voice_lab");
const outputRoot = resolve(root, "dist-godot-assetlib");
const outputAddon = resolve(outputRoot, "addons/mumble_voice_lab");

async function main() {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(dirname(outputAddon), { recursive: true });
  await cp(source, outputAddon, { recursive: true });
  await writeFile(
    resolve(outputRoot, "README.md"),
    "# Mumble Voice Lab Godot Addon\n\nThis folder is prepared for Godot Asset Library submission. Install `addons/mumble_voice_lab` into a Godot 4.6 project.\n",
    "utf8",
  );
  console.log(`[prepare-godot-assetlib] wrote ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
