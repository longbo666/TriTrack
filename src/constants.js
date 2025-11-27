export const PHASES = [
  {
    key: "development",
    label: "开发阶段",
    options: ["未开发", "开发中", "排队中", "已完成"],
  },
  {
    key: "testing",
    label: "测试阶段",
    options: ["未送测", "已送测", "已出报告"],
  },
  {
    key: "production",
    label: "投产阶段",
    options: ["未发起", "审批中", "已批待投产", "已投产"],
  },
];

export const PLATFORMS = [
  { key: "android", label: "安卓" },
  { key: "ios", label: "iOS" },
  { key: "harmony", label: "鸿蒙" },
];

export const STATUS_COLORS = {
  development: {
    未开发: { bg: "#f3f4f6", text: "#1f2937" },
    开发中: { bg: "#dbeafe", text: "#1e40af" },
    排队中: { bg: "#fef3c7", text: "#92400e" },
    已完成: { bg: "#dcfce7", text: "#065f46" },
  },
  testing: {
    未送测: { bg: "#f3f4f6", text: "#1f2937" },
    已送测: { bg: "#e0f2fe", text: "#075985" },
    已出报告: { bg: "#dcfce7", text: "#065f46" },
  },
  production: {
    未发起: { bg: "#f3f4f6", text: "#1f2937" },
    审批中: { bg: "#fef3c7", text: "#92400e" },
    已批待投产: { bg: "#e0f2fe", text: "#075985" },
    已投产: { bg: "#dcfce7", text: "#065f46" },
  },
};

export const STORAGE_KEY = "srbc_requirement_tracker_state_v2";
export const LEGACY_STORAGE_KEYS = ["srbc_requirement_tracker"];

export const OWNER_OPTIONS = [
  "",
  "黄华宏",
  "黄志豪",
  "陈嘉敏",
  "陈成",
  "龙波",
  "曾祥锋",
];
