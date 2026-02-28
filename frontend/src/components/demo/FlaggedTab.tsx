import { useEffect } from "react"
import { useDemoStore } from "@/stores/useDemoStore"


export function FlaggedTab() {
  const { flagged, fetchFlagged, loading } = useDemoStore()

  useEffect(() => { fetchFlagged() }, [fetchFlagged])

  if (loading.flagged || !flagged) {
    return <div className="animate-pulse py-12 text-center text-muted-foreground">Loading flagged items...</div>
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">{flagged.length} items flagged for manual review</p>
      <div className="cafe-card overflow-x-auto">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0">
              <tr className="border-b border-chai/30 bg-cream">
                <th className="px-3 py-2 text-left text-xs font-semibold text-choco">Receipt</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-choco">Description</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-choco">Mapped To</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-choco">Category</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-choco">Reasons</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map((f) => (
                <tr key={f.id} className="border-b border-chai/10 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{f.receipt_id}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-choco">{f.raw_description}</td>
                  <td className="px-3 py-2">
                    {f.mapped_ingredient ? (
                      <span className="rounded bg-chart-2/10 px-1.5 py-0.5 text-xs text-chart-2">{f.mapped_ingredient}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">unmapped</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{f.category || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {f.flag_reasons.map((r, i) => (
                        <span key={i} className="rounded-full bg-chart-1/10 px-2 py-0.5 text-xs font-medium text-chart-1">
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
