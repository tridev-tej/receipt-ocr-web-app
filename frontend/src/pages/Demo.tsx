import { useState } from "react"
import { cn } from "@/lib/utils"
import { MenuCostsTab } from "@/components/demo/MenuCostsTab"
import { IngredientsTab } from "@/components/demo/IngredientsTab"
import { ReceiptsTab } from "@/components/demo/ReceiptsTab"
import { MetricsTab } from "@/components/demo/MetricsTab"
import { EvaluationTab } from "@/components/demo/EvaluationTab"
import { FlaggedTab } from "@/components/demo/FlaggedTab"
import { ReportTab } from "@/components/demo/ReportTab"

const TABS = [
  { key: "menu", label: "Menu Costs" },
  { key: "ingredients", label: "Ingredients" },
  { key: "receipts", label: "Receipts" },
  { key: "metrics", label: "Metrics" },
  { key: "evaluation", label: "Evaluation" },
  { key: "flagged", label: "Flagged" },
  { key: "report", label: "Report" },
] as const

type TabKey = (typeof TABS)[number]["key"]

export function Demo() {
  const [tab, setTab] = useState<TabKey>("menu")

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-choco">Pipeline Results</h1>
      <p className="mb-8 text-muted-foreground">
        100 receipts processed, 22 ingredients mapped, 12 menu items costed.
      </p>

      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-chai/30 bg-cream/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
              tab === t.key
                ? "bg-white text-syrup shadow-sm"
                : "text-muted-foreground hover:text-choco"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "menu" && <MenuCostsTab />}
        {tab === "ingredients" && <IngredientsTab />}
        {tab === "receipts" && <ReceiptsTab />}
        {tab === "metrics" && <MetricsTab />}
        {tab === "evaluation" && <EvaluationTab />}
        {tab === "flagged" && <FlaggedTab />}
        {tab === "report" && <ReportTab />}
      </div>
    </div>
  )
}
