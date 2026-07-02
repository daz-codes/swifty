import fs from "fs/promises";
import http from "http";
import path from "path";

import { baseDir, defaultConfig } from "./config.js";
import { withoutBasePath } from "./urls.js";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

const readResponseFile = async (outputDirectory, pathname) => {
  const route = withoutBasePath(pathname);
  const relativePath = route.replace(/^\/+/, "");
  const candidates = path.extname(relativePath)
    ? [relativePath]
    : [relativePath, path.join(relativePath, "index.html")];

  for (const candidate of candidates) {
    const filePath = path.resolve(outputDirectory, candidate);
    if (!filePath.startsWith(`${outputDirectory}${path.sep}`)) continue;

    try {
      return { body: await fs.readFile(filePath), filePath, status: 200 };
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "EISDIR") throw error;
    }
  }

  const notFoundPath = path.join(outputDirectory, "404.html");
  try {
    return { body: await fs.readFile(notFoundPath), filePath: notFoundPath, status: 404 };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return {
      body: Buffer.from("Not Found"),
      filePath: "404.txt",
      status: 404,
    };
  }
};

const startServer = async (
  outputDir = "dist",
  port = defaultConfig.server_port || 3000,
) => {
  const outputDirectory = path.resolve(baseDir, outputDir);
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      const result = await readResponseFile(outputDirectory, pathname);
      const contentType =
        contentTypes[path.extname(result.filePath).toLowerCase()] ||
        "application/octet-stream";

      response.writeHead(result.status, { "Content-Type": contentType });
      response.end(request.method === "HEAD" ? undefined : result.body);
    } catch (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(`Server error: ${error.message}`);
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  const address = server.address();
  const actualPort = typeof address === "object" ? address.port : port;
  console.log(`Swifty server running at http://localhost:${actualPort}`);
  return server;
};

export { readResponseFile, startServer };
export default startServer;
