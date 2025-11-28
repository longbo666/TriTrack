import { PHASES, PLATFORMS } from "./constants.js";

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStatusTemplate() {
  const template = {};
  for (const phase of PHASES) {
    template[phase.key] = {};
    for (const platform of PLATFORMS) {
      template[phase.key][platform.key] = {
        value: phase.options[0],
        owner: "",
      };
    }
  }
  return template;
}

function normalizeRequirement(raw = {}) {
  const template = createStatusTemplate();
  const normalized = {
    id: raw.id || generateId(),
    name: raw.name || "",
    statuses: template,
  };

  if (raw.statuses) {
    for (const phase of PHASES) {
      const phaseStatuses = raw.statuses[phase.key];
      if (!phaseStatuses) continue;
      for (const platform of PLATFORMS) {
        const value = phaseStatuses[platform.key];
        if (typeof value === "string") {
          normalized.statuses[phase.key][platform.key].value = value;
        } else if (value && typeof value === "object") {
          if (value.value) {
            normalized.statuses[phase.key][platform.key].value = value.value;
          }
          if (typeof value.owner === "string") {
            normalized.statuses[phase.key][platform.key].owner = value.owner;
          }
        }
      }
    }
  }

  return normalized;
}

export function createEmptyRequirement() {
  return normalizeRequirement({});
}

export function createSampleRequirements() {
  const samples = [
    {
      name: "移动开户优化",
      statuses: {
        development: {
          android: "开发中",
          ios: "排队中",
          harmony: "未开发",
        },
        testing: {
          android: "未送测",
          ios: "未送测",
          harmony: "未送测",
        },
        production: {
          android: "未发起",
          ios: "未发起",
          harmony: "未发起",
        },
      },
    },
    {
      name: "借记卡申请改版",
      statuses: {
        development: {
          android: "排队中",
          ios: "开发中",
          harmony: "未开发",
        },
        testing: {
          android: "未送测",
          ios: "未送测",
          harmony: "未送测",
        },
        production: {
          android: "未发起",
          ios: "未发起",
          harmony: "未发起",
        },
      },
    },
  ];
  return samples.map((item) => normalizeRequirement(item));
}

export function createWorkspace(name, requirements = []) {
  const normalizedName = name?.trim() || "未命名工作空间";
  return {
    id: generateId(),
    name: normalizedName,
    requirements: requirements.map((req) => normalizeRequirement(req)),
  };
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

function normalizeState(data) {
  if (Array.isArray(data)) {
    const workspace = createWorkspace("默认工作空间", data);
    return {
      activeWorkspaceId: workspace.id,
      workspaces: [workspace],
    };
  }

  const workspacesSource = Array.isArray(data?.workspaces)
    ? data.workspaces
    : [];

  const workspaces = workspacesSource.map((workspace, index) => {
    const normalized = createWorkspace(
      workspace?.name || `工作空间 ${index + 1}`,
      Array.isArray(workspace?.requirements) ? workspace.requirements : []
    );
    if (workspace?.id) {
      normalized.id = workspace.id;
    }
    return normalized;
  });

  if (workspaces.length === 0) {
    return createInitialState();
  }

  let activeWorkspaceId = data?.activeWorkspaceId;
  if (!activeWorkspaceId || !workspaces.some((ws) => ws.id === activeWorkspaceId)) {
    activeWorkspaceId = workspaces[0].id;
  }

  return {
    activeWorkspaceId,
    workspaces,
  };
}

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
  try {
    const response = await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!response.ok) {
      throw new Error(`保存失败：${response.status}`);
    }
  } catch (error) {
    console.error("保存到服务端失败", error);
    throw error;
  }
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

export function importState(jsonString) {
  const parsed = JSON.parse(jsonString);
  return normalizeState(parsed);
}

export function exportWorkspace(workspace) {
  if (!workspace) {
    throw new Error("无法导出：工作空间不存在");
  }
  const payload = {
    name: workspace.name || "未命名工作空间",
    requirements: workspace.requirements || [],
  };
  return JSON.stringify(payload, null, 2);
}

export function importWorkspacePayload(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (Array.isArray(parsed?.workspaces)) {
    return { type: "state", state: normalizeState(parsed) };
  }
  if (Array.isArray(parsed)) {
    return {
      type: "workspace",
      workspace: createWorkspace("导入工作空间", parsed),
    };
  }
  if (parsed && Array.isArray(parsed.requirements)) {
    return {
      type: "workspace",
      workspace: createWorkspace(parsed.name || "导入工作空间", parsed.requirements),
    };
  }
  throw new Error("数据格式不正确：缺少 requirements 字段");
}
