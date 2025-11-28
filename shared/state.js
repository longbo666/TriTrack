import { PHASES, PLATFORMS } from "./schema.js";

export function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createStatusTemplate() {
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

export function normalizeRequirement(raw = {}) {
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
        const source = phaseStatuses[platform.key];
        if (!source) continue;
        if (typeof source === "string") {
          normalized.statuses[phase.key][platform.key].value = source;
        } else if (typeof source === "object") {
          if (source.value) {
            normalized.statuses[phase.key][platform.key].value = source.value;
          }
          if (typeof source.owner === "string") {
            normalized.statuses[phase.key][platform.key].owner = source.owner;
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

export function createWorkspace(name, requirements = []) {
  const normalizedName = name?.trim() || "未命名工作空间";
  return {
    id: generateId(),
    name: normalizedName,
    requirements: requirements.map((req) => normalizeRequirement(req)),
  };
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

export function createInitialState() {
  const defaultWorkspaces = [
    createWorkspace("A项目", createSampleRequirements()),
    createWorkspace("B项目", []),
  ];
  return {
    activeWorkspaceId: defaultWorkspaces[0].id,
    workspaces: defaultWorkspaces,
  };
}

export function normalizeState(data) {
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

export function exportWorkspacePayload(workspace) {
  if (!workspace) {
    throw new Error("Workspace not found");
  }
  return {
    name: workspace.name || "未命名工作空间",
    requirements: workspace.requirements || [],
  };
}

export function parseWorkspacePayload(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (Array.isArray(parsed?.workspaces)) {
    return { type: "state", state: normalizeState(parsed) };
  }
  if (Array.isArray(parsed)) {
    return { type: "workspace", workspace: createWorkspace("导入工作空间", parsed) };
  }
  if (parsed && Array.isArray(parsed.requirements)) {
    return {
      type: "workspace",
      workspace: createWorkspace(parsed.name || "导入工作空间", parsed.requirements),
    };
  }
  throw new Error("数据格式不正确：缺少 requirements 字段");
}
