import { useEffect, useState } from "react"
import { useDemoStore } from "@/stores/useDemoStore"
import { formatEur, confidenceColor, confidenceLabel } from "@/lib/constants"
import type { IngredientItem } from "@/lib/api"
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { X } from "lucide-react"

export function IngredientsTab() {
  const { ingredients, fetchIngredients, loading } = useDemoStore()
  const [selected, setSelected] = useState<IngredientItem | null>(null)

  useEffect(() => { fetchIngredients() }, [fetchIngredients])

  if (loading.ingredients || !ingredients) {
    return <div className="animate-pulse py-12 text-center text-muted-foreground">Loading ingredients...</div>
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ingredients.map((ing) => (
          <button
            key={ing.ingredient_id}
            onClick={() => setSelected(ing)}
            className="cafe-card-hover cursor-pointer p-4 text-left"
          >
            <p className="text-sm font-semibold text-choco">{ing.display_name}</p>
            <p className="mt-1 font-mono text-lg font-bold text-syrup">
              {formatEur(ing.avg_cost_per_unit, 4)}<span className="text-xs text-muted-foreground">/{ing.unit}</span>
            </p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{ing.num_data_points} pts</span>
              <span
                className="rounded-full px-1.5 py-0.5 font-semibold text-white"
                style={{ backgroundColor: confidenceColor(ing.confidence) }}
              >
                {ing.confidence.toFixed(2)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-choco/30 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl cafe-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-choco">{selected.display_name}</h3>
                <p className="text-sm text-muted-foreground">{selected.ingredient_id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1 hover:bg-cream">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Avg Cost", value: `${formatEur(selected.avg_cost_per_unit, 4)}/${selected.unit}` },
                { label: "Std Dev", value: formatEur(selected.std_dev, 4) },
                { label: "Range", value: `${formatEur(selected.min_cost, 4)} - ${formatEur(selected.max_cost, 4)}` },
                { label: "Confidence", value: `${selected.confidence.toFixed(2)} (${confidenceLabel(selected.confidence)})` },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-cream p-3 text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-choco">{s.value}</p>
                </div>
              ))}
            </div>

            {selected.data_points && selected.data_points.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-choco">Data Points ({selected.data_points.length})</p>
                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                    <XAxis dataKey="receipt_id" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis
                      dataKey="unit_price_eur"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `€${v.toFixed(3)}`}
                      width={65}
                    />
                    <Tooltip
                      contentStyle={{ background: "#fff9f3", border: "1px solid #dbbda0", borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [formatEur(Number(v), 4), "Unit Price"]}
                    />
                    <ReferenceLine
                      y={selected.avg_cost_per_unit}
                      stroke="#a56124"
                      strokeDasharray="4 4"
                      label={{ value: "avg", fill: "#a56124", fontSize: 10 }}
                    />
                    <Scatter
                      data={selected.data_points.filter((dp) => dp.unit_price_eur > 0)}
                      fill="#5d2609"
                      r={4}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
