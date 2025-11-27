import { PHASES, PLATFORMS, STATUS_COLORS, OWNER_OPTIONS } from "./constants.js";
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
    this.columnHeaders = new Map();
    this.highlightedRows = [];
    this.highlightedHeaders = [];
    this.indicator = document.getElementById("cellIndicator");
    this.container.addEventListener("mouseover", (event) =>
      this.handleCellHover(event)
    );
    this.container.addEventListener("mouseleave", () =>
      this.clearHighlight()
    );
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
    this.clearHighlight();
    const workspace = this.getActiveWorkspace();
    const requirements = workspace?.requirements || [];

    this.container.innerHTML = "";
    const tableFragment = document
      .getElementById("tableTemplate")
      .content.cloneNode(true);

    const phaseRow = tableFragment.querySelector("#phaseRow");
    const platformRow = tableFragment.querySelector("#platformRow");
    const body = tableFragment.querySelector("#tableBody");
    this.columnHeaders = new Map();
    const nameHeader = phaseRow.querySelector("th");
    if (nameHeader) {
      nameHeader.dataset.colKey = "name";
      this.columnHeaders.set("name", nameHeader);
    }

    PHASES.forEach((phase) => {
      const phaseTh = document.createElement("th");
      phaseTh.textContent = phase.label;
      phaseTh.colSpan = PLATFORMS.length;
      phaseRow.appendChild(phaseTh);

      for (const platform of PLATFORMS) {
        const platformTh = document.createElement("th");
        platformTh.textContent = platform.label;
        const colKey = `${phase.key}-${platform.key}`;
        platformTh.dataset.colKey = colKey;
        this.columnHeaders.set(colKey, platformTh);
        platformRow.appendChild(platformTh);
      }
    });


    if (requirements.length === 0) {
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = PLATFORMS.length * PHASES.length + 1;
      emptyCell.className = "empty-tip";
      emptyCell.textContent = "暂无需求，点击上方“新增需求”开始";
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
    } else {
      requirements.forEach((item, index) =>
        body.appendChild(this.renderRow(item, index))
      );
    }

    this.container.appendChild(tableFragment);
  }

  renderRow(item, rowIndex) {
    const tr = document.createElement("tr");
    tr.className = "requirement-row";
    tr.dataset.rowId = String(rowIndex);

    const rowLabel = item.name?.trim()
      ? item.name.trim()
      : `第${rowIndex + 1}条需求`;

    const nameTd = document.createElement("td");
    nameTd.className = "name-cell";
    nameTd.dataset.rowId = String(rowIndex);
    nameTd.dataset.rowLabel = rowLabel;
    nameTd.dataset.colKey = "name";
    nameTd.dataset.colLabel = "需求名称";
    const textarea = document.createElement("textarea");
    textarea.placeholder = "请输入需求名称，可换行";
    textarea.value = item.name;
    textarea.addEventListener("input", (event) => {
      item.name = event.target.value;
      this.persist();
    });
    nameTd.appendChild(textarea);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "row-delete";
    deleteBtn.setAttribute("aria-label", "删除需求");
    deleteBtn.innerHTML = "&minus;";
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.deleteRequirement(item.id);
    });
    nameTd.appendChild(deleteBtn);
    tr.appendChild(nameTd);

    for (const phase of PHASES) {
      for (const platform of PLATFORMS) {
        const td = document.createElement("td");
        td.className = "status-cell";
        td.dataset.rowId = String(rowIndex);
        td.dataset.rowLabel = rowLabel;
        const colKey = `${phase.key}-${platform.key}`;
        td.dataset.colKey = colKey;
        td.dataset.colLabel = `${platform.label} · ${phase.label}`;
        const statusWrapper = document.createElement("div");
        statusWrapper.className = "status-wrapper";
        const statusData = item.statuses[phase.key][platform.key];

        const statusSelect = document.createElement("select");
        phase.options.forEach((option) => {
          const opt = document.createElement("option");
          opt.value = option;
          opt.textContent = option;
          if (statusData.value === option) {
            opt.selected = true;
          }
          statusSelect.appendChild(opt);
        });
        statusSelect.addEventListener("change", (event) => {
          const { value } = event.target;
          statusData.value = value;
          this.paintCell(td, phase.key, value);
          this.persist();
        });
        statusWrapper.appendChild(statusSelect);

        const ownerSelect = document.createElement("select");
        ownerSelect.className = "owner-select";
        OWNER_OPTIONS.forEach((owner) => {
          const opt = document.createElement("option");
          opt.value = owner;
          opt.textContent = owner || "";
          if (statusData.owner === owner) {
            opt.selected = true;
          }
          ownerSelect.appendChild(opt);
        });
        ownerSelect.addEventListener("change", (event) => {
          statusData.owner = event.target.value;
          this.persist();
        });
        statusWrapper.appendChild(ownerSelect);

        this.paintCell(td, phase.key, statusSelect.value);
        td.appendChild(statusWrapper);
        tr.appendChild(td);
      }
    }

    return tr;
  }

  handleCellHover(event) {
    const cell = event.target.closest("td, th");
    if (!cell || !this.container.contains(cell)) return;
    if (!cell.dataset.rowId && !cell.dataset.colKey) return;
    if (cell.tagName === "TH" && !cell.dataset.colKey) return;
    this.applyHighlight(cell);
  }

  applyHighlight(cell) {
    this.clearHighlight(false);

    const rowId = cell.dataset.rowId;
    if (rowId) {
      this.highlightedRows = Array.from(
        this.container.querySelectorAll(`tr[data-row-id="${rowId}"]`)
      );
      this.highlightedRows.forEach((row) => row.classList.add("row-highlight"));
    }

    const colKeys = this.extractColKeys(cell);
    this.highlightedHeaders = [];
    colKeys.forEach((key) => {
      const header = this.columnHeaders.get(key);
      if (header) {
        header.classList.add("col-highlight");
        this.highlightedHeaders.push(header);
      }
    });

    const rowLabel = cell.dataset.rowLabel || (rowId ? `第${Number(rowId) + 1}行` : "");
    const colLabel = cell.dataset.colLabel || this.resolveColumnLabel(colKeys);
    this.showIndicator(cell, rowLabel, colLabel);
  }

  extractColKeys(cell) {
    if (cell.dataset.colKey) return [cell.dataset.colKey];
    return [];
  }

  resolveColumnLabel(colKeys) {
    if (!colKeys || colKeys.length === 0) return "";
    const firstKey = colKeys[0];
    const match = Array.from(this.columnHeaders.entries()).find(
      ([key]) => key === firstKey
    );
    if (match) return match[1].textContent || "";
    return "";
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

  showIndicator(cell, rowLabel, colLabel) {
    if (!this.indicator) return;
    const parts = [];
    if (rowLabel) parts.push(rowLabel);
    if (colLabel) parts.push(colLabel);
    const text = parts.join(" · ");
    if (!text) {
      this.indicator.hidden = true;
      return;
    }
    this.indicator.textContent = text;
    this.indicator.hidden = false;
    const rect = cell.getBoundingClientRect();
    this.indicator.style.top = `${rect.top + window.scrollY - 32}px`;
    this.indicator.style.left = `${rect.left + window.scrollX}px`;
  }

  clearHighlight(hideIndicator = true) {
    this.highlightedRows.forEach((row) => row.classList.remove("row-highlight"));
    this.highlightedHeaders.forEach((header) =>
      header.classList.remove("col-highlight")
    );
    this.highlightedRows = [];
    this.highlightedHeaders = [];
    if (hideIndicator && this.indicator) {
      this.indicator.hidden = true;
    }
  }
}
