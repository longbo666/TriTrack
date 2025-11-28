import { list, put } from "@vercel/blob";
import {
  createInitialState,
  normalizeState,
} from "../shared/state.js";

const BLOB_PATH = process.env.STATE_BLOB_PATH || "tritrack/state.json";

export const config = {
  runtime: "nodejs20.x",
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const state = await loadState();
      res.status(200).json(state);
    } catch (error) {
      console.error("读取状态失败", error);
      res.status(500).json({ message: "Failed to load state" });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const body = await readBody(req);
      const parsed = JSON.parse(body || "{}");
      const normalized = normalizeState(parsed);
      await saveState(normalized);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("保存状态失败", error);
      res.status(400).json({ message: error.message || "Invalid payload" });
    }
    return;
  }

  res.setHeader("Allow", "GET,PUT");
  res.status(405).json({ message: "Method Not Allowed" });
}

async function loadState() {
  const blob = await getExistingBlob();
  if (!blob) {
    const initial = createInitialState();
    await saveState(initial);
    return initial;
  }
  const response = await fetch(blob.url);
  if (!response.ok) {
    throw new Error("无法下载状态文件");
  }
  const data = await response.json();
  return normalizeState(data);
}

async function saveState(state) {
  await put(BLOB_PATH, JSON.stringify(state, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

async function getExistingBlob() {
  const { blobs } = await list({ prefix: BLOB_PATH, limit: 10 });
  return blobs.find((blob) => blob.pathname === BLOB_PATH) || null;
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
