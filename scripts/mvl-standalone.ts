process.env.MVL_DISABLE_AUTO_RUN = "1";
process.env.MVL_AUDIO_RENDERER ??= "pcm";
process.env.MVL_LANGUAGE_TOOLS ??= "fallback";

void import("./mvl").then(({ runMvl }) =>
  runMvl().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }),
);
