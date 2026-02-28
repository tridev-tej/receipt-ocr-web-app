import { useEffect } from "react"
import { useDemoStore } from "@/stores/useDemoStore"
import { CheckCircle2, XCircle } from "lucide-react"

export function EvaluationTab() {
  const { evaluation, fetchEvaluation, loading } = useDemoStore()

  useEffect(() => { fetchEvaluation() }, [fetchEvaluation])

  if (loading.evaluation || !evaluation) {
    return <div className="animate-pulse py-12 text-center text-muted-foreground">Loading evaluation...</div>
  }

  return (
    <div className="space-y-6">
      {/* Composite Score */}
      <div className="cafe-card p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">Pipeline Composite Score</p>
        <p className="mt-2 font-serif text-5xl font-bold text-syrup">{evaluation.pipeline_score.toFixed(3)}</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          {evaluation.pass ? (
            <><CheckCircle2 className="h-5 w-5 text-chart-2" /><span className="font-semibold text-chart-2">PASS</span></>
          ) : (
            <><XCircle className="h-5 w-5 text-chart-1" /><span className="font-semibold text-chart-1">FAIL</span></>
          )}
          <span className="text-sm text-muted-foreground">(threshold: {evaluation.threshold})</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mapping */}
        <div className="cafe-card overflow-hidden">
          <div className="border-b border-chai/30 bg-cream px-4 py-2">
            <h3 className="text-sm font-bold text-choco">Mapping Quality</h3>
          </div>
          <div className="p-4">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["Precision", evaluation.mapping.precision],
                  ["Recall", evaluation.mapping.recall],
                  ["F1", evaluation.mapping.f1],
                ].map(([k, v]) => (
                  <tr key={k as string} className="border-b border-chai/10 last:border-0">
                    <td className="py-2 text-muted-foreground">{k as string}</td>
                    <td className="py-2 text-right font-mono font-semibold text-syrup">{(v as number).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              {evaluation.mapping.correct_mappings}/{evaluation.mapping.total_mapped} correct, {evaluation.mapping.incorrect_mappings} errors
            </p>
          </div>
        </div>

        {/* Classification */}
        <div className="cafe-card overflow-hidden">
          <div className="border-b border-chai/30 bg-cream px-4 py-2">
            <h3 className="text-sm font-bold text-choco">Classification</h3>
          </div>
          <div className="p-4">
            <p className="text-center">
              <span className="font-mono text-3xl font-bold text-syrup">{(evaluation.classification.accuracy * 100).toFixed(1)}%</span>
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {evaluation.classification.correct}/{evaluation.classification.total} correct
            </p>
            <div className="mt-3 space-y-1 text-xs">
              {Object.entries(evaluation.classification.confusion_matrix).map(([expected, preds]) => (
                <div key={expected}>
                  <span className="font-semibold text-choco">{expected}:</span>{" "}
                  {Object.entries(preds).map(([pred, count]) => (
                    <span key={pred} className={pred === expected ? "text-chart-2" : "text-chart-1"}>
                      {pred}={count}{" "}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cost Accuracy */}
        <div className="cafe-card overflow-hidden">
          <div className="border-b border-chai/30 bg-cream px-4 py-2">
            <h3 className="text-sm font-bold text-choco">Cost Accuracy</h3>
          </div>
          <div className="p-4">
            <p className="text-center">
              <span className="font-mono text-3xl font-bold text-chart-2">{evaluation.cost.within_range}/{evaluation.cost.total_checked}</span>
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              within tolerance (MAD: {evaluation.cost.mean_absolute_deviation.toFixed(6)})
            </p>
            <div className="mt-3 max-h-48 overflow-auto text-xs">
              {evaluation.cost.details.map((d) => (
                <div key={d.ingredient} className="flex items-center justify-between border-b border-chai/10 py-1 last:border-0">
                  <span className="text-choco">{d.ingredient}</span>
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-muted-foreground">dev: {d.deviation.toFixed(6)}</span>
                    <CheckCircle2 className="h-3 w-3 text-chart-2" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
