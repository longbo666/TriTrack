import {
  createEmptyRequirement as sharedCreateEmptyRequirement,
  createSampleRequirements as sharedCreateSampleRequirements,
  createWorkspace as sharedCreateWorkspace,
  createInitialState,
  normalizeState,
  exportWorkspacePayload,
  parseWorkspacePayload,
} from "../shared/state.js";

export const createEmptyRequirement = sharedCreateEmptyRequirement;
export const createSampleRequirements = sharedCreateSampleRequirements;
export const createWorkspace = sharedCreateWorkspace;

export async function loadState() {
  try {
    const response = await fetch("/api/state", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`加载失败：${response.status}`);
    }
    const data = await response.json();
    return normalizeState(data);
  } catch (error) {
    console.error("从服务端加载数据失败，使用默认数据", error);
    return createInitialState();
  }
}

export async function saveState(state) {
  await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(jsonString) {
  const parsed = JSON.parse(jsonString);
  return normalizeState(parsed);
}

export function exportWorkspace(workspace) {
  return JSON.stringify(exportWorkspacePayload(workspace), null, 2);
}

export function importWorkspacePayload(jsonString) {
  return parseWorkspacePayload(jsonString);
}
