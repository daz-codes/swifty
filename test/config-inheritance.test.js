import assert from "assert";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("../src/cli.js", import.meta.url));
const prose = Array(150).fill("word").join(" ");

describe("Folder configuration inheritance", function () {
  this.timeout(15000);
  let siteDir;

  const write = async (filename, content) => {
    const filePath = path.join(siteDir, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  };
  const build = () =>
    execFileAsync(process.execPath, [cliPath, "build"], { cwd: siteDir });
  const readPage = (route = "") =>
    fs.readFile(path.join(siteDir, "dist", route, "index.html"), "utf-8");
  const assertSettings = (html, count, speed, readingTime) => {
    assert.ok(html.includes(`data-count="${count}"`), html);
    assert.ok(html.includes(`data-speed="${speed}"`), html);
    if (readingTime) assert.ok(html.includes(`data-reading="${readingTime}"`), html);
  };

  beforeEach(async () => {
    siteDir = await fs.mkdtemp(path.join(os.tmpdir(), "swifty-inheritance-"));
    await write("config.yaml", "search: false\nmorphing: false\nminify: false\npage_count: 10\nwords_per_minute: 200\n");
    await write(
      "template.html",
      '<html><head></head><body><main data-count="<%= page.meta.page_count || \'\' %>" data-speed="<%= words_per_minute %>" data-reading="<%= reading_time %>" data-date="<%= date_iso %>"><%= content %></main><nav><%= links_to_children %></nav><%= pagination %></body></html>',
    );
    await write("pages/index.md", prose);
    await write("pages/blog/config.yaml", "page_count: 2\nwords_per_minute: 50\n");
    await write("pages/blog/index.md", prose);
    for (let i = 1; i <= 3; i++) {
      await write(`pages/blog/post-${i}.md`, `---\nposition: ${i}\n---\n${prose}`);
    }
  });

  afterEach(async () => {
    await fs.rm(siteDir, { recursive: true, force: true });
  });

  it("should use folder overrides for its index, children and pagination", async () => {
    await build();

    assertSettings(await readPage(), 10, 200, "1 min read");
    const folder = await readPage("blog");
    assertSettings(folder, 2, 50, "3 min read");
    assert.ok(folder.includes('href="/blog/post-2"'));
    assert.ok(!folder.includes('href="/blog/post-3"'));
    assertSettings(await readPage("blog/post-1"), 2, 50, "3 min read");
    const second = await readPage("blog/page/2");
    assertSettings(second, 2, 50);
    assert.ok(second.includes('href="/blog/post-3"'));
    await assert.rejects(() => readPage("blog/page/3"), { code: "ENOENT" });
  });

  it("should give index front matter priority and preserve individual page overrides", async () => {
    await write("pages/blog/index.md", `---\npage_count: 1\nwords_per_minute: 75\n---\n${prose}`);
    await write("pages/blog/post-3.md", `---\nposition: 3\nwords_per_minute: 150\n---\n${prose}`);
    await build();

    assertSettings(await readPage("blog"), 1, 75, "2 min read");
    assertSettings(await readPage("blog/post-1"), 1, 75, "2 min read");
    assertSettings(await readPage("blog/post-3"), 1, 150, "1 min read");
    assertSettings(await readPage("blog/page/3"), 1, 75);
  });

  it("should apply a deeper folder config to an automatic index and its children", async () => {
    await write("pages/blog/index.md", `---\npage_count: 1\nwords_per_minute: 75\n---\n${prose}`);
    await write("pages/blog/archive/config.json", JSON.stringify({ page_count: 2, words_per_minute: 25 }));
    for (let i = 1; i <= 3; i++) await write(`pages/blog/archive/post-${i}.md`, prose);
    await build();

    assertSettings(await readPage("blog/archive"), 2, 25);
    assertSettings(await readPage("blog/archive/post-1"), 2, 25, "6 min read");
    assertSettings(await readPage("blog/archive/page/2"), 2, 25);
    assertSettings(await readPage("blog/post-1"), 1, 75, "2 min read");
    await assert.rejects(() => readPage("blog/archive/page/3"), { code: "ENOENT" });
  });

  it("should apply pages-level defaults to the homepage and inherited sections", async () => {
    await write("pages/config.yml", "page_count: 2\nwords_per_minute: 50\n");
    await write("pages/docs/index.md", prose);
    await write("pages/docs/guide.md", prose);
    await build();

    assertSettings(await readPage(), 2, 50, "3 min read");
    assertSettings(await readPage("docs"), 2, 50, "3 min read");
    assertSettings(await readPage("docs/guide"), 2, 50, "3 min read");
  });

  it("should keep pagination disabled when no scope sets page_count", async () => {
    await write("config.yaml", "search: false\nmorphing: false\nminify: false\n");
    await write("pages/blog/config.yaml", "words_per_minute: 50\n");
    await build();

    assertSettings(await readPage("blog"), "", 50, "3 min read");
    assert.ok((await readPage("blog")).includes('href="/blog/post-3"'));
    await assert.rejects(() => readPage("blog/page/2"), { code: "ENOENT" });
  });

  it("should apply folder settings before interpreting index metadata", async () => {
    await write("pages/blog/config.yaml", "timezone: America/New_York\nwords_per_minute: 50\n");
    await write("pages/blog/index.md", `---\ndate: 2020-01-02\n---\n${prose}`);
    await build();

    assert.ok((await readPage("blog")).includes('data-date="2020-01-02T05:00:00.000Z"'));
  });
});
