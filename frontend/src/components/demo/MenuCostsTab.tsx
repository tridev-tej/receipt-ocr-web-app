import { useEffect, useState } from "react"
import { useDemoStore } from "@/stores/useDemoStore"
import { formatEur, formatPct, confidenceColor } from "@/lib/constants"
import { ChevronDown, ChevronRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

function marginColor(pct: number): string {
  if (pct >= 75) return "#009588"
  if (pct >= 60) return "#fcbb00"
  return "#f05100"
}

export function MenuCostsTab() {
  const { menuCosts, fetchMenuCosts, loading } = useDemoStore()
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { fetchMenuCosts() }, [fetchMenuCosts])

  if (loading.menu || !menuCosts) {
    return <div className="animate-pulse py-12 text-center text-muted-foreground">Loading menu costs...</div>
  }

  const chartData = menuCosts.map((m) => ({
    name: m.name.length > 18 ? m.name.slice(0, 16) + ".." : m.name,
    margin: m.margin_percent,
    fullName: m.name,
  }))

  return (
    <div className="space-y-6">
      {/* Margin Chart */}
      <div className="cafe-card p-6">
        <h3 className="mb-4 font-serif text-lg font-bold text-choco">Margin by Menu Item</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v) => [`${Number(v).toFixed(1)}%`, "Margin"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
              contentStyle={{ background: "#fff9f3", border: "1px solid #dbbda0", borderRadius: 8 }}
            />
            <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={marginColor(d.margin)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost Table */}
      <div className="cafe-card overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-chai/30 bg-cream">
              <th className="px-4 py-3 text-left font-semibold text-choco">Item</th>
              <th className="px-4 py-3 text-right font-semibold text-choco">Sell</th>
              <th className="px-4 py-3 text-right font-semibold text-choco">COGS</th>
              <th className="px-4 py-3 text-right font-semibold text-choco">Margin</th>
              <th className="px-4 py-3 text-right font-semibold text-choco">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {menuCosts.map((m) => (
              <>
                <tr
                  key={m.menu_item_id}
                  className="cursor-pointer border-b border-chai/10 transition-colors hover:bg-cream/40"
                  onClick={() => setExpanded(expanded === m.menu_item_id ? null : m.menu_item_id)}
                >
                  <td className="px-4 py-3 font-medium text-choco">
                    <span className="mr-2 inline-block">
                      {expanded === m.menu_item_id ? <ChevronDown className="inline h-4 w-4" /> : <ChevronRight className="inline h-4 w-4" />}
                    </span>
                    {m.name}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatEur(m.sell_price)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatEur(m.total_cogs)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-semibold" style={{ color: marginColor(m.margin_percent) }}>
                      {formatPct(m.margin_percent)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: confidenceColor(m.confidence) }}
                    >
                      {m.confidence.toFixed(2)}
                    </span>
                  </td>
                </tr>
                {expanded === m.menu_item_id && m.breakdown.length > 0 && (
                  <tr key={`${m.menu_item_id}-exp`}>
                    <td colSpan={5} className="bg-cream/30 px-8 py-3">
                      <div className="text-xs">
                        <div className="mb-1 font-semibold text-muted-foreground">Ingredient Breakdown</div>
                        <div className="space-y-1">
                          {m.breakdown.map((b, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-choco">{b.display_name || b.ingredient}</span>
                              <span className="font-mono text-muted-foreground">
                                {b.qty} {b.unit} x {formatEur(b.cost_per_unit, 4)} = {formatEur(b.line_cost)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
