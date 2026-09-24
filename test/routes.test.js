import assert from "assert";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("../src/cli.js", import.meta.url));

describe("Route collisions", function () {
  this.timeout(15000);
  let siteDir;

  const writePage = async (filename, content) => {
    const filePath = path.join(siteDir, "pages", filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  };
  const run = (...args) =>
    execFileAsync(process.execPath, [cliPath, ...args], { cwd: siteDir });

  beforeEach(async () => {
    siteDir = await fs.mkdtemp(path.join(os.tmpdir(), "swifty-routes-"));
    await fs.writeFile(
      path.join(siteDir, "config.yaml"),
      "search: false\nmorphing: false\nminify: false\n",
    );
    await fs.writeFile(
      path.join(siteDir, "template.html"),
      "<html><head></head><body><%= content %></body></html>",
    );
    await writePage("index.md", "# Home");
  });

  afterEach(async () => {
    await fs.rm(siteDir, { recursive: true, force: true });
  });

  const assertDuplicate = async (args, references, outputDir = "dist") => {
    await assert.rejects(() => run(...args), (error) => {
      assert.strictEqual(error.code, 1);
      assert.match(error.stderr, /duplicate-route/);
      for (const reference of references) {
        assert.ok(error.stderr.includes(reference), error.stderr);
      }
      return true;
    });
    await assert.rejects(
      () => fs.stat(path.join(siteDir, outputDir, "index.html")),
      { code: "ENOENT" },
      "route validation should run before any page is written",
    );
  };

  it("should reject duplicate permalinks in a normal build with custom output", async () => {
    await writePage("first.md", "---\npermalink: /shared\n---\nFirst");
    await writePage("second.md", "---\npermalink: /shared\n---\nSecond");

    await assertDuplicate(
      ["build", "--out", "preview"],
      ["pages/first.md", "pages/second.md", "shared/index.html"],
      "preview",
    );
  });

  it("should compare output paths even when the routes differ", async () => {
    await writePage("first.md", "---\npermalink: /shared/\n---\nFirst");
    await writePage("second.md", "---\npermalink: /shared/index.html\n---\nSecond");

    await assertDuplicate(["build"], ["pages/first.md", "pages/second.md", "shared/index.html"]);
  });

  it("should catch a collision with an authored folder index", async () => {
    await writePage("docs/index.md", "# Documentation");
    await writePage("duplicate.md", "---\npermalink: /docs\n---\nDuplicate");

    await assertDuplicate(["build"], ["pages/docs/index.md", "pages/duplicate.md", "docs/index.html"]);
  });

  it("should catch a collision with a generated tag page", async () => {
    await writePage("post.md", "---\ntags: [news]\n---\nPost");
    await writePage("duplicate.md", "---\npermalink: /tags/news\n---\nDuplicate");

    await assertDuplicate(["build"], ["generated /tags/news", "pages/duplicate.md", "tags/news/index.html"]);
  });

  it("should catch a collision with a generated pagination page", async () => {
    await writePage("blog/config.yaml", "page_count: 1");
    await writePage("blog/first.md", "First post");
    await writePage("blog/second.md", "Second post");
    await writePage("duplicate.md", "---\npermalink: /blog/page/2\n---\nDuplicate");

    await assertDuplicate(["build"], ["generated /blog/page/2", "pages/duplicate.md", "blog/page/2/index.html"]);
  });

  it("should stop deploy when routes collide", async () => {
    await writePage("duplicate.md", "---\npermalink: /\n---\nDuplicate");

    await assertDuplicate(["deploy"], ["pages/index.md", "pages/duplicate.md", "index.html"]);
  });

  it("should validate only published routes in production and include drafts in previews", async () => {
    await writePage("draft.md", "---\ndraft: true\npermalink: /\n---\nDraft");
    await writePage("scheduled.md", "---\ndate: 2999-01-01\npermalink: /\n---\nScheduled");

    await run("build");
    const home = await fs.readFile(path.join(siteDir, "dist", "index.html"), "utf-8");
    assert.ok(home.includes("Home"));
    await assertDuplicate(
      ["build", "--drafts", "--out", "preview"],
      ["pages/draft.md", "pages/scheduled.md", "pages/index.md"],
      "preview",
    );
    assert.strictEqual(await fs.readFile(path.join(siteDir, "dist", "index.html"), "utf-8"), home);
  });

  it("should reject collisions through the page-writing API before changing existing pages", async () => {
    const outputDir = path.join(siteDir, "dist");
    await fs.mkdir(outputDir);
    await fs.writeFile(path.join(outputDir, "index.html"), "Existing home");
    const runner = path.join(siteDir, "write-pages.mjs");
    const pagesModule = new URL("../src/pages.js", import.meta.url).href;
    await fs.writeFile(
      runner,
      `const { createPages } = await import(${JSON.stringify(pagesModule)});
       await createPages([
         { route: "/", filePath: "first.md", meta: {}, content: "First" },
         { route: "/index.html", filePath: "second.md", meta: {}, content: "Second" },
       ]);`,
    );

    await assert.rejects(
      () => execFileAsync(process.execPath, [runner], { cwd: siteDir }),
      /duplicate-route/,
    );
    assert.strictEqual(await fs.readFile(path.join(outputDir, "index.html"), "utf-8"), "Existing home");
  });
});
