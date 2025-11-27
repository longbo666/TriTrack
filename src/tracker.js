import { PHASES, PLATFORMS, STATUS_COLORS } from "./constants.js";
import {
  createEmptyRequirement,
  createSampleRequirements,
  createWorkspace,
  loadState,
  saveState,
  exportWorkspace,
  importWorkspacePayload,
} from "./storage.js";

export class RequirementTracker {
  constructor(container) {
    this.container = container;
    this.state = loadState();
    this.ensureWorkspaceAvailability();
    this.render();
  }

  ensureWorkspaceAvailability() {
    if (!Array.isArray(this.state.workspaces) || this.state.workspaces.length === 0) {
      const fallback = createWorkspace("默认工作空间", []);
      this.state = {
        activeWorkspaceId: fallback.id,
        workspaces: [fallback],
      };
      saveState(this.state);
      return;
    }
    if (
      !this.state.activeWorkspaceId ||
      !this.state.workspaces.some((ws) => ws.id === this.state.activeWorkspaceId)
    ) {
      this.state.activeWorkspaceId = this.state.workspaces[0].id;
      saveState(this.state);
    }
  }

  getActiveWorkspace() {
    this.ensureWorkspaceAvailability();
    return this.state.workspaces.find((ws) => ws.id === this.state.activeWorkspaceId);
  }

  persist() {
    saveState(this.state);
  }

  render() {
    this.renderWorkspaceHeader();
    this.renderTable();
  }

  renderWorkspaceHeader() {
    const current = this.getActiveWorkspace();
    const select = document.getElementById("workspaceSelect");
    if (!select) return;
    select.innerHTML = "";
    this.state.workspaces.forEach((workspace) => {
      const option = document.createElement("option");
      option.value = workspace.id;
      option.textContent = workspace.name || "未命名空间";
      if (workspace.id === this.state.activeWorkspaceId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  renderTable() {
    const workspace = this.getActiveWorkspace();
    const requirements = workspace?.requirements || [];

    this.container.innerHTML = "";
    const tableFragment = document
      .getElementById("tableTemplate")
      .content.cloneNode(true);

    const phaseRow = tableFragment.querySelector("#phaseRow");
    const platformRow = tableFragment.querySelector("#platformRow");
    const body = tableFragment.querySelector("#tableBody");

    PHASES.forEach((phase) => {
      const phaseTh = document.createElement("th");
      phaseTh.textContent = phase.label;
      phaseTh.colSpan = PLATFORMS.length;
      phaseRow.appendChild(phaseTh);

      for (const platform of PLATFORMS) {
        const platformTh = document.createElement("th");
        platformTh.textContent = platform.label;
        platformRow.appendChild(platformTh);
      }
    });

    const actionTh = document.createElement("th");
    actionTh.textContent = "操作";
    actionTh.rowSpan = 2;
    phaseRow.appendChild(actionTh);

    if (requirements.length === 0) {
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = PLATFORMS.length * PHASES.length + 2;
      emptyCell.className = "empty-tip";
      emptyCell.textContent = "暂无需求，点击上方“新增需求”开始";
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
    } else {
      requirements.forEach((item) => body.appendChild(this.renderRow(item)));
    }

    this.container.appendChild(tableFragment);
  }

  renderRow(item) {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.className = "name-cell";
    const textarea = document.createElement("textarea");
    textarea.placeholder = "请输入需求名称，可换行";
    textarea.value = item.name;
    textarea.addEventListener("input", (event) => {
      item.name = event.target.value;
      this.persist();
    });
    nameTd.appendChild(textarea);
    tr.appendChild(nameTd);

    for (const phase of PHASES) {
      for (const platform of PLATFORMS) {
        const td = document.createElement("td");
        td.className = "status-cell";
        const select = document.createElement("select");
        phase.options.forEach((option) => {
          const opt = document.createElement("option");
          opt.value = option;
          opt.textContent = option;
          if (item.statuses[phase.key][platform.key] === option) {
            opt.selected = true;
          }
          select.appendChild(opt);
        });
        this.paintCell(td, phase.key, select.value);
        select.addEventListener("change", (event) => {
          const { value } = event.target;
          item.statuses[phase.key][platform.key] = value;
          this.paintCell(td, phase.key, value);
          this.persist();
        });
        td.appendChild(select);
        tr.appendChild(td);
      }
    }

    const actionTd = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "删除";
    deleteBtn.className = "danger";
    deleteBtn.addEventListener("click", () => this.deleteRequirement(item.id));
    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);

    return tr;
  }

  paintCell(cell, phaseKey, statusValue) {
    const colors = STATUS_COLORS[phaseKey]?.[statusValue];
    if (colors) {
      cell.style.backgroundColor = colors.bg;
      cell.style.color = colors.text;
      const select = cell.querySelector("select");
      if (select) {
        select.style.backgroundColor = colors.bg;
        select.style.color = colors.text;
      }
    } else {
      cell.style.backgroundColor = "transparent";
      cell.style.color = "inherit";
      const select = cell.querySelector("select");
      if (select) {
        select.style.backgroundColor = "transparent";
        select.style.color = "inherit";
      }
    }
  }

  addRequirement() {
    const workspace = this.getActiveWorkspace();
    workspace.requirements.push(createEmptyRequirement());
    this.persist();
    this.renderTable();
  }

  deleteRequirement(id) {
    const workspace = this.getActiveWorkspace();
    const shouldRemove = confirm("确认删除该需求？");
    if (!shouldRemove) return;
    workspace.requirements = workspace.requirements.filter((item) => item.id !== id);
    this.persist();
    this.renderTable();
  }

  setActiveWorkspace(workspaceId) {
    if (workspaceId === this.state.activeWorkspaceId) return;
    this.state.activeWorkspaceId = workspaceId;
    this.persist();
    this.render();
  }

  addWorkspace() {
    const defaultName = `工作空间 ${this.state.workspaces.length + 1}`;
    const name = prompt("请输入新工作空间名称", defaultName);
    if (name === null) return;
    const workspace = createWorkspace(
      name.trim() || defaultName,
      createSampleRequirements()
    );
    this.state.workspaces.push(workspace);
    this.state.activeWorkspaceId = workspace.id;
    this.persist();
    this.render();
  }

  renameWorkspace() {
    const workspace = this.getActiveWorkspace();
    if (!workspace) return;
    const name = prompt("请输入新的工作空间名称", workspace.name || "");
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      alert("名称不能为空");
      return;
    }
    workspace.name = trimmed;
    this.persist();
    this.renderWorkspaceHeader();
  }

  deleteWorkspace() {
    if (this.state.workspaces.length <= 1) {
      alert("至少需要保留一个工作空间");
      return;
    }
    const workspace = this.getActiveWorkspace();
    const confirmed = confirm(`确认删除工作空间“${workspace.name}”？`);
    if (!confirmed) return;
    this.state.workspaces = this.state.workspaces.filter(
      (ws) => ws.id !== workspace.id
    );
    if (!this.state.workspaces.some((ws) => ws.id === this.state.activeWorkspaceId)) {
      this.state.activeWorkspaceId = this.state.workspaces[0]?.id || null;
    }
    this.ensureWorkspaceAvailability();
    this.persist();
    this.render();
  }

  exportData() {
    const workspace = this.getActiveWorkspace();
    const content = exportWorkspace(workspace);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = (workspace?.name || "工作空间").replace(/\s+/g, "");
    a.href = url;
    a.download = `${safeName || "工作空间"}-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = importWorkspacePayload(reader.result);
        if (payload.type === "state") {
          this.state = payload.state;
          this.ensureWorkspaceAvailability();
          this.persist();
          alert("已导入完整的工作空间集合");
          this.render();
          return;
        }
        const workspace = this.getActiveWorkspace();
        workspace.name = payload.workspace.name || workspace.name;
        workspace.requirements = payload.workspace.requirements || [];
        this.persist();
        alert("当前工作空间已覆盖为导入数据");
        this.render();
      } catch (error) {
        console.error("导入失败", error);
        alert("导入失败：" + error.message);
      }
    };
    reader.readAsText(file, "utf-8");
  }
}
