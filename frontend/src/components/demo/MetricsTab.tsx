import { useEffect } from "react"
import { useDemoStore } from "@/stores/useDemoStore"
import {
  FileText, AlertTriangle, Layers, Gauge,
  Clock, DollarSign, Timer, Zap,
} from "lucide-react"

export function MetricsTab() {
  const { metrics, fetchMetrics, loading } = useDemoStore()

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  if (loading.metrics || !metrics) {
    return <div className="animate-pulse py-12 text-center text-muted-foreground">Loading metrics...</div>
  }

  const claudeCost = metrics.total_api_cost_usd
  const geminiEstimate = +(claudeCost * 0.1).toFixed(2) // ~10x cheaper

  const cards = [
    { icon: FileText, label: "Receipts Processed", value: metrics.receipts_processed },
    { icon: AlertTriangle, label: "Receipts Failed", value: metrics.receipts_failed },
    { icon: Layers, label: "Total Line Items", value: metrics.total_line_items },
    { icon: Gauge, label: "Avg OCR Confidence", value: `${(metrics.avg_ocr_confidence * 100).toFixed(1)}%` },
    { icon: Clock, label: "Mapping Rate", value: `${(metrics.mapping_rate * 100).toFixed(1)}%` },
    { icon: Timer, label: "Duration", value: `${Math.round(metrics.duration_seconds)}s` },
    { icon: DollarSign, label: "API Cost (Claude Vision)", value: `$${claudeCost.toFixed(2)}` },
    { icon: Zap, label: "Est. Cost (Gemini Flash)", value: `$${geminiEstimate.toFixed(2)}` },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="cafe-card p-6 text-center">
            <c.icon className="mx-auto mb-3 h-8 w-8 text-cinnamon" />
            <p className="text-2xl font-bold text-choco">{c.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="cafe-card overflow-hidden">
        <div className="border-b border-chai/20 bg-cream px-5 py-3">
          <h3 className="text-sm font-semibold text-choco">OCR Model Comparison</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-chai/20">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-choco">Metric</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-choco">Claude Vision</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-choco">Gemini Flash</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-chai/10">
              <td className="px-5 py-2.5 text-choco">Role</td>
              <td className="px-5 py-2.5 text-right font-mono">Primary</td>
              <td className="px-5 py-2.5 text-right font-mono">Fallback</td>
            </tr>
            <tr className="border-b border-chai/10">
              <td className="px-5 py-2.5 text-choco">Cost per receipt</td>
              <td className="px-5 py-2.5 text-right font-mono">~$0.03</td>
              <td className="px-5 py-2.5 text-right font-mono">~$0.003</td>
            </tr>
            <tr className="border-b border-chai/10">
              <td className="px-5 py-2.5 text-choco">Cost for 40 receipts</td>
              <td className="px-5 py-2.5 text-right font-mono">${claudeCost.toFixed(2)}</td>
              <td className="px-5 py-2.5 text-right font-mono">~${geminiEstimate.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-chai/10">
              <td className="px-5 py-2.5 text-choco">Monthly (100 receipts)</td>
              <td className="px-5 py-2.5 text-right font-mono">~$3.00</td>
              <td className="px-5 py-2.5 text-right font-mono">~$0.30</td>
            </tr>
            <tr className="border-b border-chai/10">
              <td className="px-5 py-2.5 text-choco">Extraction accuracy</td>
              <td className="px-5 py-2.5 text-right font-mono">~95%</td>
              <td className="px-5 py-2.5 text-right font-mono">~90%</td>
            </tr>
            <tr className="border-b border-chai/10">
              <td className="px-5 py-2.5 text-choco">Output format</td>
              <td className="px-5 py-2.5 text-right font-mono">tool_use JSON</td>
              <td className="px-5 py-2.5 text-right font-mono">JSON mode</td>
            </tr>
            <tr>
              <td className="px-5 py-2.5 text-choco">Latency</td>
              <td className="px-5 py-2.5 text-right font-mono">~2-3s</td>
              <td className="px-5 py-2.5 text-right font-mono">~1-2s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
