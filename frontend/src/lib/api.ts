const BASE = "/api"

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

export async function getConfig() {
  return fetchJSON<Record<string, unknown>>(`${BASE}/config`)
}

export async function getMenuCosts() {
  return fetchJSON<MenuCostItem[]>(`${BASE}/demo/menu`)
}

export async function getIngredients() {
  return fetchJSON<IngredientItem[]>(`${BASE}/demo/ingredients`)
}

export async function getMetrics() {
  return fetchJSON<PipelineMetrics>(`${BASE}/demo/metrics`)
}

export async function getEvaluation() {
  return fetchJSON<EvaluationResult>(`${BASE}/demo/evaluation`)
}

export async function getReceipt(id: string) {
  return fetchJSON<ReceiptWalkthrough>(`${BASE}/demo/receipt/${id}`)
}

export async function getReport() {
  return fetchJSON<ReportData>(`${BASE}/demo/report`)
}

export async function getFlagged() {
  return fetchJSON<FlaggedItem[]>(`${BASE}/demo/flagged`)
}

export async function getReceiptIds() {
  return fetchJSON<string[]>(`${BASE}/demo/receipts`)
}

export async function uploadReceipts(files: File[]) {
  const form = new FormData()
  for (const f of files) form.append("files", f)
  return fetchJSON<{ run_id: string; total_receipts: number }>(`${BASE}/upload`, {
    method: "POST",
    body: form,
  })
}

export async function getUploadStatus(runId: string) {
  return fetchJSON<UploadStatus>(`${BASE}/upload/status/${runId}`)
}

export async function getUploadResults(runId: string) {
  return fetchJSON<UploadResults>(`${BASE}/upload/results/${runId}`)
}

// Types
export interface MenuCostItem {
  menu_item_id: string
  name: string
  category: string
  sell_price: number
  ingredient_cost: number
  packaging_cost: number
  total_cogs: number
  margin_percent: number
  margin_eur: number
  confidence: number
  breakdown: Array<{
    ingredient: string
    display_name: string
    qty: number
    unit: string
    cost_per_unit: number
    line_cost: number
  }>
}

export interface IngredientItem {
  ingredient_id: string
  display_name: string
  avg_cost_per_unit: number
  unit: string
  min_cost: number
  max_cost: number
  std_dev: number
  num_data_points: number
  confidence: number
  source_receipts: string[]
  data_points: Array<{
    receipt_id: string
    raw_description: string
    quantity_normalized: number
    unit_normalized: string
    unit_price_eur: number
    total_eur: number
    mapping_confidence: number
  }>
}

export interface PipelineMetrics {
  run_id: string
  receipts_processed: number
  receipts_failed: number
  total_line_items: number
  total_api_cost_usd: number
  avg_ocr_confidence: number
  mapping_rate: number
  duration_seconds: number
}

export interface EvaluationResult {
  run_id: string
  pipeline_score: number
  threshold: number
  pass: boolean
  mapping: {
    precision: number
    recall: number
    f1: number
    correct_mappings: number
    incorrect_mappings: number
    total_mapped: number
    total_mappable: number
    per_ingredient: Record<string, { correct: number; incorrect: number; accuracy: number }>
  }
  classification: {
    accuracy: number
    correct: number
    incorrect: number
    total: number
    confusion_matrix: Record<string, Record<string, number>>
  }
  cost: {
    accuracy: number
    within_range: number
    out_of_range: number
    total_checked: number
    mean_absolute_deviation: number
    details: Array<{
      ingredient: string
      expected: number
      actual: number
      deviation: number
      tolerance: number
      status: string
    }>
  }
}

export interface ReceiptWalkthrough {
  receipt_id: string
  supplier: string
  date: string | null
  currency: string
  raw_extraction: Record<string, unknown>
  line_items: Array<{
    id: number
    raw_description: string
    mapped_ingredient: string | null
    mapping_method: string | null
    mapping_confidence: number | null
    category: string | null
    quantity: number | null
    unit_raw: string | null
    unit_normalized: string | null
    quantity_normalized: number | null
    unit_price_eur: number | null
    total_eur: number | null
    flagged: number
    flag_reasons: string[]
  }>
}

export interface ReportData {
  markdown: string
  csv: string
}

export interface FlaggedItem {
  id: number
  receipt_id: string
  raw_description: string
  mapped_ingredient: string | null
  mapping_method: string | null
  mapping_confidence: number | null
  category: string | null
  quantity: number | null
  total_eur: number | null
  flag_reasons: string[]
}

export interface UploadStatus {
  run_id: string
  stage: string
  current_receipt: number
  total_receipts: number
  error: string | null
}

export interface UploadResults {
  run_id: string
  menu_costs: MenuCostItem[]
  ingredients: IngredientItem[]
  metrics: Record<string, unknown>
  report_md: string
}
