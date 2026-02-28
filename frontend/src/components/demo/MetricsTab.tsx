import { useEffect } from "react"
import { useDemoStore } from "@/stores/useDemoStore"
import {
  FileText, AlertTriangle, Layers, Gauge,
  Clock, DollarSign, Timer,
} from "lucide-react"

export function MetricsTab() {
  const { metrics, fetchMetrics, loading } = useDemoStore()

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  if (loading.metrics || !metrics) {
    return <div className="animate-pulse py-12 text-center text-muted-foreground">Loading metrics...</div>
  }

  const cards = [
    { icon: FileText, label: "Receipts Processed", value: metrics.receipts_processed },
    { icon: AlertTriangle, label: "Receipts Failed", value: metrics.receipts_failed },
    { icon: Layers, label: "Total Line Items", value: metrics.total_line_items },
    { icon: Gauge, label: "Avg OCR Confidence", value: `${(metrics.avg_ocr_confidence * 100).toFixed(1)}%` },
    { icon: Clock, label: "Mapping Rate", value: `${(metrics.mapping_rate * 100).toFixed(1)}%` },
    { icon: Timer, label: "Duration", value: `${Math.round(metrics.duration_seconds)}s` },
    { icon: DollarSign, label: "API Cost", value: `$${metrics.total_api_cost_usd.toFixed(2)}` },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="cafe-card p-6 text-center">
          <c.icon className="mx-auto mb-3 h-8 w-8 text-cinnamon" />
          <p className="text-2xl font-bold text-choco">{c.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{c.label}</p>
        </div>
      ))}
    </div>
  )
}
