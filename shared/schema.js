export const PLATFORMS = [
  { key: "android", label: "安卓" },
  { key: "ios", label: "iOS" },
  { key: "harmony", label: "鸿蒙" },
];

export const PHASES = [
  {
    key: "development",
    label: "开发阶段",
    options: ["未开发", "开发中", "排队中", "已完成", "无需"],
  },
  {
    key: "testing",
    label: "测试阶段",
    options: ["未送测", "已送测", "已出报告", "无需"],
  },
  {
    key: "production",
    label: "投产阶段",
    options: ["未发起", "审批中", "已批待投产", "已投产", "无需"],
  },
];
