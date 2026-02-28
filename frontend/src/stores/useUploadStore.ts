import { create } from "zustand"
import type { MenuCostItem, IngredientItem, UploadStatus } from "@/lib/api"
import * as api from "@/lib/api"

type Stage = "idle" | "uploading" | "ocr" | "validate" | "normalize" | "classify" | "map" | "calculate" | "database" | "report" | "complete" | "error"

interface UploadState {
  files: File[]
  runId: string | null
  stage: Stage
  currentReceipt: number
  totalReceipts: number
  error: string | null
  menuCosts: MenuCostItem[] | null
  ingredients: IngredientItem[] | null
  reportMd: string | null

  setFiles: (files: File[]) => void
  removeFile: (index: number) => void
  startUpload: () => Promise<void>
  reset: () => void
}

export const useUploadStore = create<UploadState>((set, get) => ({
  files: [],
  runId: null,
  stage: "idle",
  currentReceipt: 0,
  totalReceipts: 0,
  error: null,
  menuCosts: null,
  ingredients: null,
  reportMd: null,

  setFiles: (files) => set({ files }),
  removeFile: (index) => set({ files: get().files.filter((_, i) => i !== index) }),

  startUpload: async () => {
    const { files } = get()
    if (!files.length) return

    set({ stage: "uploading", error: null, menuCosts: null, ingredients: null, reportMd: null })

    try {
      const { run_id, total_receipts } = await api.uploadReceipts(files)
      set({ runId: run_id, totalReceipts: total_receipts })

      // Poll status
      const poll = async () => {
        while (true) {
          await new Promise((r) => setTimeout(r, 2000))
          const status = await api.getUploadStatus(run_id)
          set({
            stage: status.stage as Stage,
            currentReceipt: status.current_receipt,
            totalReceipts: status.total_receipts,
            error: status.error,
          })
          if (status.stage === "complete" || status.stage === "error") break
        }

        if (get().stage === "complete") {
          const results = await api.getUploadResults(run_id)
          set({
            menuCosts: results.menu_costs,
            ingredients: results.ingredients,
            reportMd: results.report_md,
          })
        }
      }
      poll()
    } catch (e) {
      set({ stage: "error", error: (e as Error).message })
    }
  },

  reset: () =>
    set({
      files: [],
      runId: null,
      stage: "idle",
      currentReceipt: 0,
      totalReceipts: 0,
      error: null,
      menuCosts: null,
      ingredients: null,
      reportMd: null,
    }),
}))
