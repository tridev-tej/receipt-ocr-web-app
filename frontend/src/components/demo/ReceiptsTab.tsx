import { useEffect, useState } from "react"
import { useDemoStore } from "@/stores/useDemoStore"
import { confidenceColor } from "@/lib/constants"
import { ArrowRight, ImageOff } from "lucide-react"

function receiptImageUrl(receiptId: string): string {
  const num = receiptId.replace("R-", "")
  return `/api/receipts/receipt_${num}.jpg`
}

export function ReceiptsTab() {
  const { receiptIds, selectedReceipt, fetchReceiptIds, fetchReceipt, loading } = useDemoStore()
  const [selectedId, setSelectedId] = useState<string>("")
  const [imgError, setImgError] = useState(false)

  useEffect(() => { fetchReceiptIds() }, [fetchReceiptIds])

  useEffect(() => {
    if (receiptIds && receiptIds.length > 0 && !selectedId) {
      setSelectedId(receiptIds[0])
    }
  }, [receiptIds, selectedId])

  useEffect(() => {
    if (selectedId) {
      fetchReceipt(selectedId)
      setImgError(false)
    }
  }, [selectedId, fetchReceipt])

  if (!receiptIds) {
    return <div className="animate-pulse py-12 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-choco">Receipt:</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border border-chai bg-white px-3 py-2 text-sm text-choco"
        >
          {receiptIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      {loading.receipt && <div className="animate-pulse py-8 text-center text-muted-foreground">Loading receipt...</div>}

      {selectedReceipt && !loading.receipt && (
        <div className="space-y-4">
          <div className="cafe-card p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span><strong className="text-choco">Supplier:</strong> {selectedReceipt.supplier}</span>
              <span><strong className="text-choco">Date:</strong> {selectedReceipt.date || "N/A"}</span>
              <span><strong className="text-choco">Currency:</strong> {selectedReceipt.currency}</span>
            </div>
          </div>

          {/* 3-panel: Receipt Image | Raw Extraction | Normalized */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Receipt Image */}
            <div className="cafe-card overflow-hidden">
              <div className="border-b border-chai/30 bg-cream px-4 py-2">
                <h4 className="text-sm font-bold text-choco">Receipt Scan</h4>
              </div>
              <div className="flex items-center justify-center bg-cream/30 p-2">
                {imgError ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <ImageOff className="h-8 w-8" />
                    <span className="text-xs">Image not available</span>
                  </div>
                ) : (
                  <img
                    src={receiptImageUrl(selectedId)}
                    alt={`Receipt ${selectedId}`}
                    className="max-h-[28rem] w-auto rounded shadow-sm"
                    onError={() => setImgError(true)}
                  />
                )}
              </div>
            </div>

            {/* Raw Extraction */}
            <div className="cafe-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-chai/30 bg-cream px-4 py-2">
                <h4 className="text-sm font-bold text-choco">Raw Extraction</h4>
                <ArrowRight className="h-4 w-4 text-cinnamon md:hidden" />
              </div>
              <div className="max-h-[28rem] overflow-auto p-3">
                {(selectedReceipt.raw_extraction.line_items as Array<Record<string, unknown>>)?.map((item, i) => (
                  <div key={i} className="mb-2 rounded-lg bg-cream/40 p-2 text-xs">
                    <p className="font-medium text-choco">{item.description as string}</p>
                    <p className="text-muted-foreground">
                      qty: {item.quantity as number ?? "null"} | unit: {item.unit as string ?? "null"} | total: {item.total as number ?? "null"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Processed */}
            <div className="cafe-card overflow-hidden">
              <div className="border-b border-chai/30 bg-cream px-4 py-2">
                <h4 className="text-sm font-bold text-choco">Normalized + Mapped</h4>
              </div>
              <div className="max-h-[28rem] overflow-auto p-3">
                {selectedReceipt.line_items.map((item) => (
                  <div key={item.id} className="mb-2 rounded-lg border border-chai/20 p-2 text-xs">
                    <p className="font-medium text-choco">{item.raw_description}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {item.mapped_ingredient && (
                        <span className="rounded bg-chart-2/10 px-1.5 py-0.5 text-chart-2 font-semibold">
                          {item.mapped_ingredient}
                        </span>
                      )}
                      {item.category && (
                        <span className="rounded bg-cream px-1.5 py-0.5 text-muted-foreground">
                          {item.category}
                        </span>
                      )}
                      {item.mapping_method && (
                        <span className="rounded bg-cinnamon/10 px-1.5 py-0.5 text-cinnamon">
                          {item.mapping_method}
                        </span>
                      )}
                      {item.mapping_confidence != null && (
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-white"
                          style={{ backgroundColor: confidenceColor(item.mapping_confidence) }}
                        >
                          {item.mapping_confidence.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {item.flagged === 1 && (
                      <div className="mt-1 text-chart-1">
                        Flagged: {item.flag_reasons.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
