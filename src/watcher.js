import chokidar from "chokidar";

export default async function startWatcher(outDir = "dist") {
  const filesToWatch = [
    "pages/**/*.{md,html}",
    "layouts/**/*.{html}",
    "images/**/*",
    "css/**/*.{css}",
    "js/**/*.{js}",
    "partials/**/*.{md,html}",
    "template.html",
    "config.yaml",
    "config.yml",
    "config.json",
  ];

  const watcher = chokidar.watch(filesToWatch, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100 },
    debounceDelay: 200,
  });

  const buildModule = await import("./build.js");
  const build = buildModule.default;

  if (typeof build !== "function") {
    console.error("❌ build.js does not export a default function.");
    return;
  }

  watcher.on("change", async (path) => {
    console.log(`📄 File changed: ${path}`);
    try {
      await build(outDir);
      console.log("✅ Build completed");
    } catch (error) {
      console.error(`❌ Build failed: ${error.message}`);
    }
  });

  console.log(`👀 Watching for changes...`);
}
