import assert from "assert";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const buildModuleUrl = new URL("../src/build.js", import.meta.url).href;

describe("Output directory safety", function () {
  this.timeout(15000);

  let fixtureDir;
  let siteDir;
  let sourceFile;

  beforeEach(async () => {
    fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), "swifty-output-safety-"));
    siteDir = path.join(fixtureDir, "site");
    sourceFile = path.join(siteDir, "pages", "index.md");
    await fs.mkdir(path.dirname(sourceFile), { recursive: true });
    await fs.writeFile(sourceFile, "# Keep this source page");
    await fs.writeFile(
      path.join(siteDir, "prepare-output.mjs"),
      `const { prepareOutputDirectory } = await import(${JSON.stringify(buildModuleUrl)});
       await prepareOutputDirectory(process.argv[2]);`,
    );
  });

  afterEach(async () => {
    await fs.rm(fixtureDir, { recursive: true, force: true });
  });

  // Each site gets its own process because Swifty loads configuration at import.
  const prepareOutput = (outputDir) =>
    execFileAsync(
      process.execPath,
      [path.join(siteDir, "prepare-output.mjs"), outputDir],
      { cwd: siteDir },
    );

  const assertSourcePreserved = async () => {
    assert.strictEqual(await fs.readFile(sourceFile, "utf-8"), "# Keep this source page");
  };

  it("should reject an output symlink to a source directory without deleting content", async () => {
    const outputDir = path.join(siteDir, "output-link");
    await fs.symlink(path.dirname(sourceFile), outputDir, "junction");

    await assert.rejects(() => prepareOutput(outputDir), /unsafe output directory/);
    await assertSourcePreserved();
  });

  it("should reject a new output directory beneath a symlink to source", async () => {
    const alias = path.join(siteDir, "source-alias");
    await fs.symlink(path.dirname(sourceFile), alias, "junction");

    await assert.rejects(
      () => prepareOutput(path.join(alias, "new", "output")),
      /unsafe output directory/,
    );
    await assertSourcePreserved();
    await assert.rejects(() => fs.stat(path.join(alias, "new")), { code: "ENOENT" });
  });

  it("should reject an output symlink to an ancestor of the project", async () => {
    const outputDir = path.join(siteDir, "ancestor-alias");
    await fs.symlink(fixtureDir, outputDir, "junction");

    await assert.rejects(() => prepareOutput(outputDir), /unsafe output directory/);
    await assertSourcePreserved();
  });

  it("should protect source directories that are themselves symlinks", async () => {
    const externalImages = path.join(fixtureDir, "shared-images");
    await fs.mkdir(externalImages);
    await fs.writeFile(path.join(externalImages, "keep.svg"), "keep this image");
    await fs.symlink(externalImages, path.join(siteDir, "images"), "junction");

    await assert.rejects(() => prepareOutput(externalImages), /unsafe output directory/);
    assert.strictEqual(await fs.readFile(path.join(externalImages, "keep.svg"), "utf-8"), "keep this image");
  });

  it("should reject output containing an external symlinked source directory", async () => {
    const outputDir = path.join(fixtureDir, "shared");
    const externalImages = path.join(outputDir, "images");
    await fs.mkdir(externalImages, { recursive: true });
    await fs.writeFile(path.join(externalImages, "keep.svg"), "keep this image");
    await fs.symlink(externalImages, path.join(siteDir, "images"), "junction");

    await assert.rejects(() => prepareOutput(outputDir), /unsafe output directory/);
    assert.strictEqual(await fs.readFile(path.join(externalImages, "keep.svg"), "utf-8"), "keep this image");
  });

  it("should still clean a safe symlinked output directory", async () => {
    const generatedDir = path.join(fixtureDir, "generated");
    const outputDir = path.join(siteDir, "output-link");
    await fs.mkdir(generatedDir);
    await fs.writeFile(path.join(generatedDir, "stale.html"), "stale output");
    await fs.symlink(generatedDir, outputDir, "junction");

    await prepareOutput(outputDir);

    assert.deepStrictEqual(await fs.readdir(generatedDir), []);
    assert.ok((await fs.lstat(outputDir)).isSymbolicLink());
    await assertSourcePreserved();
  });

  it("should create safe nested output beneath a symlinked parent", async () => {
    const generatedDir = path.join(fixtureDir, "generated");
    const alias = path.join(siteDir, "output-parent");
    await fs.mkdir(generatedDir);
    await fs.symlink(generatedDir, alias, "junction");

    await prepareOutput(path.join(alias, "new", "output"));

    assert.ok((await fs.stat(path.join(generatedDir, "new", "output"))).isDirectory());
    await assertSourcePreserved();
  });
});
