export const PIPELINE_STAGES = [
  { key: "ocr", label: "OCR Extract", icon: "Eye" },
  { key: "validate", label: "Validate", icon: "ShieldCheck" },
  { key: "normalize", label: "Normalize", icon: "Ruler" },
  { key: "classify", label: "Classify", icon: "Tags" },
  { key: "map", label: "Map", icon: "Link" },
  { key: "calculate", label: "Calculate", icon: "Calculator" },
  { key: "database", label: "Store", icon: "Database" },
  { key: "report", label: "Report", icon: "FileText" },
] as const

export const CHART_COLORS = ["#f05100", "#009588", "#104e64", "#fcbb00", "#f99c00"]

export const CONFIDENCE_COLORS = {
  high: "#009588",
  medium: "#fcbb00",
  low: "#f05100",
} as const

export function confidenceColor(c: number): string {
  if (c >= 0.8) return CONFIDENCE_COLORS.high
  if (c >= 0.5) return CONFIDENCE_COLORS.medium
  return CONFIDENCE_COLORS.low
}

export function confidenceLabel(c: number): string {
  if (c >= 0.8) return "High"
  if (c >= 0.5) return "Medium"
  return "Low"
}

export function formatEur(n: number, digits = 2): string {
  return `\u20AC${n.toFixed(digits)}`
}

export function formatPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}
