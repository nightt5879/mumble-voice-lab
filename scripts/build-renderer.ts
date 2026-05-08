import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = resolve(root, "dist-renderer/mvl-renderer.cjs");
const outputPath = resolve(
  root,
  "integrations/godot/addons/mumble_voice_lab/bin/win-x64/mvl-renderer-win-x64.exe",
);

async function main() {
  await rm(resolve(root, "dist-renderer"), { recursive: true, force: true });
  await mkdir(dirname(bundlePath), { recursive: true });
  await mkdir(dirname(outputPath), { recursive: true });

  await build({
    entryPoints: [resolve(root, "scripts/mvl-standalone.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: bundlePath,
    loader: {
      ".node": "file",
      ".wasm": "file",
    },
    external: ["./node-web-audio"],
    logLevel: "warning",
  });

  const pkgBin =
    process.platform === "win32"
      ? resolve(root, "node_modules/.bin/pkg.cmd")
      : resolve(root, "node_modules/.bin/pkg");
  const pkgCommand = process.platform === "win32" ? "cmd.exe" : pkgBin;
  const pkgArgs =
    process.platform === "win32"
      ? ["/c", pkgBin, bundlePath, "--targets", "node20-win-x64", "--output", outputPath]
      : [bundlePath, "--targets", "node20-win-x64", "--output", outputPath];

  await execFileAsync(pkgCommand, pkgArgs, {
    cwd: root,
    maxBuffer: 1024 * 1024 * 20,
  });

  console.log(`[build-renderer] wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
