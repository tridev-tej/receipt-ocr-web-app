import { useEffect } from "react"
import { useDemoStore } from "@/stores/useDemoStore"
import { Download } from "lucide-react"

export function ReportTab() {
  const { report, fetchReport, loading } = useDemoStore()

  useEffect(() => { fetchReport() }, [fetchReport])

  if (loading.report || !report) {
    return <div className="animate-pulse py-12 text-center text-muted-foreground">Loading report...</div>
  }

  const downloadCSV = () => {
    const blob = new Blob([report.csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cost_report.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={downloadCSV}
          className="inline-flex items-center gap-2 rounded-lg border border-cinnamon/30 bg-cream px-4 py-2 text-sm font-medium text-syrup transition-colors hover:bg-cinnamon/10"
        >
          <Download className="h-4 w-4" /> Download CSV
        </button>
      </div>
      <div className="cafe-card p-6">
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap rounded-lg bg-cream/60 p-4 text-xs text-choco">
            {report.markdown}
          </pre>
        </div>
      </div>
    </div>
  )
}
