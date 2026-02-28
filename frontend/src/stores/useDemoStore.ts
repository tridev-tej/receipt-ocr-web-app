import { create } from "zustand"
import type {
  MenuCostItem,
  IngredientItem,
  PipelineMetrics,
  EvaluationResult,
  ReceiptWalkthrough,
  ReportData,
  FlaggedItem,
} from "@/lib/api"
import * as api from "@/lib/api"

interface DemoState {
  menuCosts: MenuCostItem[] | null
  ingredients: IngredientItem[] | null
  metrics: PipelineMetrics | null
  evaluation: EvaluationResult | null
  receiptIds: string[] | null
  selectedReceipt: ReceiptWalkthrough | null
  report: ReportData | null
  flagged: FlaggedItem[] | null
  loading: Record<string, boolean>
  error: string | null

  fetchMenuCosts: () => Promise<void>
  fetchIngredients: () => Promise<void>
  fetchMetrics: () => Promise<void>
  fetchEvaluation: () => Promise<void>
  fetchReceiptIds: () => Promise<void>
  fetchReceipt: (id: string) => Promise<void>
  fetchReport: () => Promise<void>
  fetchFlagged: () => Promise<void>
}

export const useDemoStore = create<DemoState>((set, get) => ({
  menuCosts: null,
  ingredients: null,
  metrics: null,
  evaluation: null,
  receiptIds: null,
  selectedReceipt: null,
  report: null,
  flagged: null,
  loading: {},
  error: null,

  fetchMenuCosts: async () => {
    if (get().menuCosts) return
    set({ loading: { ...get().loading, menu: true } })
    try {
      const data = await api.getMenuCosts()
      set({ menuCosts: data, loading: { ...get().loading, menu: false } })
    } catch (e) {
      set({ error: (e as Error).message, loading: { ...get().loading, menu: false } })
    }
  },

  fetchIngredients: async () => {
    if (get().ingredients) return
    set({ loading: { ...get().loading, ingredients: true } })
    try {
      const data = await api.getIngredients()
      set({ ingredients: data, loading: { ...get().loading, ingredients: false } })
    } catch (e) {
      set({ error: (e as Error).message, loading: { ...get().loading, ingredients: false } })
    }
  },

  fetchMetrics: async () => {
    if (get().metrics) return
    set({ loading: { ...get().loading, metrics: true } })
    try {
      const data = await api.getMetrics()
      set({ metrics: data, loading: { ...get().loading, metrics: false } })
    } catch (e) {
      set({ error: (e as Error).message, loading: { ...get().loading, metrics: false } })
    }
  },

  fetchEvaluation: async () => {
    if (get().evaluation) return
    set({ loading: { ...get().loading, evaluation: true } })
    try {
      const data = await api.getEvaluation()
      set({ evaluation: data, loading: { ...get().loading, evaluation: false } })
    } catch (e) {
      set({ error: (e as Error).message, loading: { ...get().loading, evaluation: false } })
    }
  },

  fetchReceiptIds: async () => {
    if (get().receiptIds) return
    try {
      const data = await api.getReceiptIds()
      set({ receiptIds: data })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  fetchReceipt: async (id: string) => {
    set({ loading: { ...get().loading, receipt: true } })
    try {
      const data = await api.getReceipt(id)
      set({ selectedReceipt: data, loading: { ...get().loading, receipt: false } })
    } catch (e) {
      set({ error: (e as Error).message, loading: { ...get().loading, receipt: false } })
    }
  },

  fetchReport: async () => {
    if (get().report) return
    set({ loading: { ...get().loading, report: true } })
    try {
      const data = await api.getReport()
      set({ report: data, loading: { ...get().loading, report: false } })
    } catch (e) {
      set({ error: (e as Error).message, loading: { ...get().loading, report: false } })
    }
  },

  fetchFlagged: async () => {
    if (get().flagged) return
    set({ loading: { ...get().loading, flagged: true } })
    try {
      const data = await api.getFlagged()
      set({ flagged: data, loading: { ...get().loading, flagged: false } })
    } catch (e) {
      set({ error: (e as Error).message, loading: { ...get().loading, flagged: false } })
    }
  },
}))
