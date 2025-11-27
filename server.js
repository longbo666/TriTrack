const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function readFileSafe(filePath) {
  return fs.promises.readFile(filePath);
}

function normalizeRequestUrl(urlPath) {
  try {
    const decoded = decodeURI(urlPath.split("?")[0]);
    return decoded;
  } catch (error) {
    return "/";
  }
}

async function resolveFilePath(requestUrl) {
  const safeUrl = normalizeRequestUrl(requestUrl);
  let resolvedPath = path.join(ROOT_DIR, safeUrl);
  resolvedPath = path.normalize(resolvedPath);

  if (!resolvedPath.startsWith(ROOT_DIR)) {
    throw new Error("Forbidden");
  }

  let stats;
  try {
    stats = await fs.promises.stat(resolvedPath);
  } catch (error) {
    const needsFallback = safeUrl === "/" || !path.extname(safeUrl);
    if (needsFallback) {
      const fallback = path.join(ROOT_DIR, "index.html");
      await fs.promises.access(fallback);
      return fallback;
    }
    throw error;
  }

  if (stats.isDirectory()) {
    const indexFile = path.join(resolvedPath, "index.html");
    await fs.promises.access(indexFile);
    return indexFile;
  }

  return resolvedPath;
}

const server = http.createServer(async (req, res) => {
  try {
    const filePath = await resolveFilePath(req.url || "/");
    const content = await readFileSafe(filePath);
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(content);
  } catch (error) {
    if (error.message === "Forbidden") {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("403 Forbidden");
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`需求跟进看板已在 http://localhost:${PORT} 启动`);
});
