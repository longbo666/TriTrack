const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const PLATFORMS = ["android", "ios", "harmony"];
const DEFAULT_PHASE_VALUE = {
  development: "未开发",
  testing: "未送测",
  production: "未发起",
};

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

function normalizeRequestUrl(urlPath = "/") {
  try {
    const decoded = decodeURI(urlPath.split("?")[0]);
    return decoded;
  } catch (error) {
    return "/";
  }
}

async function ensureStateFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STATE_FILE);
  } catch (error) {
    const initial = createInitialState();
    await fs.writeFile(STATE_FILE, JSON.stringify(initial, null, 2), "utf-8");
  }
}

async function readState() {
  await ensureStateFile();
  const raw = await fs.readFile(STATE_FILE, "utf-8");
  return JSON.parse(raw);
}

async function writeState(state) {
  await ensureStateFile();
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function createStatusTemplate() {
  const template = {};
  Object.keys(DEFAULT_PHASE_VALUE).forEach((phase) => {
    template[phase] = {};
    PLATFORMS.forEach((platform) => {
      template[phase][platform] = {
        value: DEFAULT_PHASE_VALUE[phase],
        owner: "",
      };
    });
  });
  return template;
}

function normalizeRequirement(raw = {}) {
  const template = createStatusTemplate();
  const normalized = {
    id: raw.id || generateId(),
    name: raw.name || "",
    statuses: template,
  };
  for (const phase of Object.keys(template)) {
    for (const platform of Object.keys(template[phase])) {
      const source = raw.statuses?.[phase]?.[platform];
      if (!source) continue;
      if (typeof source === "string") {
        normalized.statuses[phase][platform].value = source;
      } else if (typeof source === "object") {
        if (source.value) normalized.statuses[phase][platform].value = source.value;
        if (typeof source.owner === "string") {
          normalized.statuses[phase][platform].owner = source.owner;
        }
      }
    }
  }
  return normalized;
}

function createWorkspace(name, requirements = []) {
  return {
    id: generateId(),
    name: name?.trim() || "未命名工作空间",
    requirements: requirements.map((req) => normalizeRequirement(req)),
  };
}

function createSampleRequirements() {
  return [
    normalizeRequirement({
      name: "移动开户优化",
      statuses: {
        development: { android: "开发中", ios: "排队中", harmony: "未开发" },
        testing: { android: "未送测", ios: "未送测", harmony: "未送测" },
        production: { android: "未发起", ios: "未发起", harmony: "未发起" },
      },
    }),
    normalizeRequirement({
      name: "借记卡申请改版",
      statuses: {
        development: { android: "排队中", ios: "开发中", harmony: "未开发" },
        testing: { android: "未送测", ios: "未送测", harmony: "未送测" },
        production: { android: "未发起", ios: "未发起", harmony: "未发起" },
      },
    }),
  ];
}

function createInitialState() {
  const defaultWorkspaces = [
    createWorkspace("A项目", createSampleRequirements()),
    createWorkspace("B项目", []),
  ];
  return {
    activeWorkspaceId: defaultWorkspaces[0].id,
    workspaces: defaultWorkspaces,
  };
}

function generateId() {
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function handleApi(req, res) {
  const method = req.method || "GET";
  if (method === "GET") {
    const state = await readState();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(state));
    return;
  }
  if (method === "PUT") {
    const body = await readBody(req);
    const parsed = JSON.parse(body || "{}");
    if (!parsed || typeof parsed !== "object") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Invalid state payload" }));
      return;
    }
    await writeState(parsed);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(405, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Method Not Allowed" }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function serveStatic(req, res) {
  try {
    const safeUrl = normalizeRequestUrl(req.url || "/");
    let resolvedPath = path.join(ROOT_DIR, safeUrl);
    resolvedPath = path.normalize(resolvedPath);
    if (!resolvedPath.startsWith(ROOT_DIR)) {
      throw new Error("Forbidden");
    }
    let stats;
    try {
      stats = await fs.stat(resolvedPath);
    } catch (error) {
      if (safeUrl === "/" || !path.extname(safeUrl)) {
        resolvedPath = path.join(ROOT_DIR, "index.html");
        stats = await fs.stat(resolvedPath);
      } else {
        throw error;
      }
    }
    if (stats.isDirectory()) {
      resolvedPath = path.join(resolvedPath, "index.html");
    }
    const content = await fs.readFile(resolvedPath);
    res.writeHead(200, { "Content-Type": getContentType(resolvedPath) });
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
}

const server = http.createServer(async (req, res) => {
  if ((req.url || "").startsWith("/api/state")) {
    try {
      await handleApi(req, res);
    } catch (error) {
      console.error("API error", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Server error" }));
    }
    return;
  }
  await serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`需求跟进看板已在 http://localhost:${PORT} 启动`);
});
