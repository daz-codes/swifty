import assert from "assert";
import { EventEmitter, once } from "events";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { createSourceWatcher } from "../src/watch-files.js";
import { createBuildQueue } from "../src/watch-queue.js";
import { createRebuildHandler } from "../src/watch-rebuild.js";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Watcher rebuild queue", function () {
  this.timeout(5000);
  let queue;
  const cwd = path.resolve("watcher-test-site");
  const change = (filename, event = "change") => ({ event, filePath: path.join(cwd, filename) });

  afterEach(async () => { await queue?.close(); });

  it("should combine a burst and deduplicate repeated events", async () => {
    const batches = [];
    queue = createBuildQueue(async (changes) => batches.push(changes), { delay: 5 });
    queue.enqueue(change("pages/post.md"));
    queue.enqueue(change("pages/post.md"));
    queue.enqueue(change("pages/blog/config.yaml"));
    await queue.whenIdle();

    assert.deepStrictEqual(batches, [[change("pages/post.md"), change("pages/blog/config.yaml")]]);
  });

  it("should serialize slow builds and retain changes received during a build", async () => {
    const started = Promise.withResolvers();
    const release = Promise.withResolvers();
    const batches = [];
    let active = 0;
    let maximumActive = 0;
    queue = createBuildQueue(async (changes) => {
      active++;
      maximumActive = Math.max(maximumActive, active);
      batches.push(changes);
      if (batches.length === 1) {
        started.resolve();
        await release.promise;
      }
      active--;
    }, { delay: 5 });

    queue.enqueue(change("template.html"));
    await started.promise;
    try {
      queue.enqueue(change("images/photo.png"));
      queue.enqueue(change("pages/post.md"));
      queue.enqueue(change("config.yaml"));
      await pause(30);
      assert.strictEqual(batches.length, 1, "pending changes must wait for the active build");
    } finally {
      release.resolve();
    }
    await queue.whenIdle();
    assert.strictEqual(maximumActive, 1);
    assert.deepStrictEqual(batches[1], [change("images/photo.png"), change("pages/post.md"), change("config.yaml")]);
  });

  it("should run one full build for mixed changes and reload config before building", async () => {
    const calls = [];
    const handler = createRebuildHandler({
      cwd, outputDir: "preview",
      reloadConfig: async () => calls.push("config"),
      build: async (out) => calls.push(`build:${out}`),
      rebuildPage: async () => assert.fail("mixed changes need a full build"),
      optimizeSingleImage: async () => assert.fail("mixed changes need a full build"),
      refresh: () => calls.push("refresh"), logger: { log() {} },
    });
    queue = createBuildQueue(handler, { delay: 5 });
    queue.enqueue(change("images/photo.png"));
    queue.enqueue(change("pages/post.md"));
    queue.enqueue(change("config.yaml"));
    await queue.whenIdle();
    assert.deepStrictEqual(calls, ["config", "build:preview", "refresh"]);
  });

  it("should preserve incremental edits and fall back to a full build when needed", async () => {
    const calls = [];
    let pageCanRebuild = true;
    queue = createBuildQueue(createRebuildHandler({
      cwd, outputDir: "dist",
      reloadConfig: async () => calls.push("config"),
      build: async () => calls.push("full"),
      rebuildPage: async () => { calls.push("page"); return { rebuilt: pageCanRebuild, reason: "metadata changed" }; },
      optimizeSingleImage: async () => calls.push("image"),
      refresh: () => calls.push("refresh"), logger: { log() {} },
    }), { delay: 5 });

    queue.enqueue(change("pages/post.md"));
    await queue.whenIdle();
    queue.enqueue(change("images/photo.png"));
    await queue.whenIdle();
    pageCanRebuild = false;
    queue.enqueue(change("pages/post.md"));
    await queue.whenIdle();
    assert.deepStrictEqual(calls, ["page", "refresh", "image", "refresh", "page", "config", "full", "refresh"]);
  });

  it("should treat an unlink followed by add as a structural change", async () => {
    const batches = [];
    queue = createBuildQueue(async (changes) => batches.push(changes), { delay: 5 });
    queue.enqueue(change("pages/post.md", "unlink"));
    queue.enqueue(change("pages/post.md", "add"));
    queue.enqueue(change("pages/post.md"));
    await queue.whenIdle();
    assert.deepStrictEqual(batches[0].map(({ event }) => event), ["unlink", "add", "change"]);
  });

  it("should recover from a failed build with a full rebuild of pending changes", async () => {
    const started = Promise.withResolvers();
    const release = Promise.withResolvers();
    const errors = [];
    const calls = [];
    let attempts = 0;
    queue = createBuildQueue(createRebuildHandler({
      cwd, outputDir: "dist",
      reloadConfig: async () => calls.push("config"),
      build: async () => {
        calls.push("full");
        if (++attempts === 1) {
          started.resolve();
          await release.promise;
          throw new Error("bad template");
        }
      },
      optimizeSingleImage: async () => assert.fail("failure recovery requires a full build"),
      refresh: () => calls.push("refresh"), logger: { log() {} },
    }), { delay: 5, onError: (error) => errors.push(error.message) });

    queue.enqueue(change("template.html"));
    await started.promise;
    queue.enqueue(change("images/photo.png"));
    release.resolve();
    await queue.whenIdle();
    assert.deepStrictEqual(errors, ["bad template"]);
    assert.deepStrictEqual(calls, ["config", "full", "config", "full", "refresh"]);
  });

  it("should cancel pending work and wait for an active build when closed", async () => {
    const started = Promise.withResolvers();
    const release = Promise.withResolvers();
    let builds = 0;
    queue = createBuildQueue(async () => {
      builds++;
      started.resolve();
      await release.promise;
    }, { delay: 5 });
    queue.enqueue(change("template.html"));
    await started.promise;
    queue.enqueue(change("pages/post.md"));
    const idle = queue.whenIdle();
    const closed = queue.close();
    release.resolve();
    await Promise.all([closed, idle]);
    queue.enqueue(change("pages/late.md"));
    await queue.whenIdle();
    assert.strictEqual(builds, 1);
  });
});

describe("Watcher source discovery", function () {
  this.timeout(15000);
  let siteDir;
  let watcher;
  let changes;
  let events;
  const write = async (relative, content) => {
    const filePath = path.join(siteDir, relative);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  };

  const expectChange = async (event, relative, mutate) => {
    let listener;
    let timer;
    const received = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`Missing ${event} event for ${relative}`)), 4000);
      listener = (change) => {
        if (change.event === event && change.filePath === path.join(siteDir, relative)) resolve(change);
      };
      events.on("change", listener);
    });
    try {
      await mutate();
      return await received;
    } finally {
      clearTimeout(timer);
      events.off("change", listener);
    }
  };

  beforeEach(async () => {
    siteDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "swifty-watch-")));
    await write("pages/blog/post.md", "Initial page");
    changes = [];
    events = new EventEmitter();
    watcher = createSourceWatcher({
      cwd: siteDir, outputDir: "preview",
      // Poll these short-lived fixtures so OS notification timing cannot drop
      // writes made immediately after startup. Production still defaults to native events.
      options: {
        usePolling: true, interval: 20, binaryInterval: 20, atomic: false,
        awaitWriteFinish: { stabilityThreshold: 20, pollInterval: 10 },
      },
      onChange: (change) => { changes.push(change); events.emit("change", change); },
    });
    await once(watcher, "ready");
  });

  afterEach(async () => {
    await watcher?.close();
    await fs.rm(siteDir, { recursive: true, force: true });
  });

  for (const extension of ["yaml", "yml", "json"]) {
    it(`should detect addition, edits and deletion of nested config.${extension}`, async () => {
      const filename = `pages/blog/config.${extension}`;
      await expectChange("add", filename, () => write(filename, "{}"));
      await expectChange("change", filename, () => write(filename, '{"page_count": 2}'));
      await expectChange("unlink", filename, () => fs.unlink(path.join(siteDir, filename)));
    });
  }

  it("should discover asset directories and files created after startup", async () => {
    for (const filename of ["css/site.css", "js/site.js", "images/photo.svg", "layouts/default.html", "partials/footer.html", "data/site.json", "public/download.txt"]) {
      await expectChange("add", filename, () => write(filename, "new content"));
    }
  });

  it("should discover root config files created after startup", async () => {
    for (const filename of ["config.yaml", "config.yml", "config.json", "template.html"]) {
      await expectChange("add", filename, () => write(filename, "new content"));
    }
  });

  it("should detect renamed page directories", async () => {
    await expectChange("addDir", "pages/articles", () =>
      expectChange("unlinkDir", "pages/blog", () =>
        fs.rename(path.join(siteDir, "pages/blog"), path.join(siteDir, "pages/articles")),
      ),
    );
  });

  it("should ignore generated output, caches and unrelated project files", async () => {
    for (const filename of ["preview/index.html", ".swifty-cache/image.webp", "node_modules/pkg/index.js", ".git/config", "README.md", "pages/notes.txt"]) {
      await write(filename, "ignored content");
    }
    await expectChange("change", "pages/blog/post.md", () => write("pages/blog/post.md", "Updated page"));
    await pause(100);
    // Native backends may emit more than one notification for the same write.
    assert.deepStrictEqual(
      [...new Set(changes.map(({ filePath }) => path.relative(siteDir, filePath)))],
      [path.join("pages", "blog", "post.md")],
    );
  });
});
