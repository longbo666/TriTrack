import { RequirementTracker } from "./tracker.js";

async function bootstrap() {
  const container = document.getElementById("tableContainer");
  const tracker = new RequirementTracker(container);
  await tracker.init();

  document
    .getElementById("workspaceSelect")
    .addEventListener("change", (event) =>
      tracker.setActiveWorkspace(event.target.value)
    );

  document
    .getElementById("addWorkspace")
    .addEventListener("click", () => tracker.addWorkspace());

  document
    .getElementById("renameWorkspace")
    .addEventListener("click", () => tracker.renameWorkspace());

  document
    .getElementById("deleteWorkspace")
    .addEventListener("click", () => tracker.deleteWorkspace());

  document
    .getElementById("addRequirement")
    .addEventListener("click", () => tracker.addRequirement());

  document
    .getElementById("exportBtn")
    .addEventListener("click", () => tracker.exportData());

  const importInput = document.getElementById("importInput");
  document.getElementById("importBtn").addEventListener("click", () => {
    importInput.click();
  });
  importInput.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (file) {
      tracker.importData(file);
    }
    importInput.value = "";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bootstrap().catch((error) => {
    console.error("初始化失败", error);
    alert("初始化失败，请刷新页面重试");
  });
});
