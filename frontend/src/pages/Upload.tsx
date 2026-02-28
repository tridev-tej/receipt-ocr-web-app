import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useUploadStore } from "@/stores/useUploadStore"
import { PIPELINE_STAGES, formatEur, formatPct, confidenceColor } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  Upload as UploadIcon, X, FileImage, Rocket, RotateCcw,
  Eye, ShieldCheck, Ruler, Tags, Link, Calculator, Database, FileText,
  CheckCircle2, Loader2,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const STAGE_ICONS: Record<string, typeof Eye> = {
  ocr: Eye, validate: ShieldCheck, normalize: Ruler, classify: Tags,
  map: Link, calculate: Calculator, database: Database, report: FileText,
}

function ReceiptDropzone() {
  const { files, setFiles, removeFile } = useUploadStore()

  const onDrop = useCallback(
    (accepted: File[]) => setFiles([...files, ...accepted]),
    [files, setFiles],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    multiple: true,
    maxFiles: 20,
  })

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
          isDragActive
            ? "border-cinnamon bg-cinnamon/5"
            : "border-chai hover:border-cinnamon/50 hover:bg-cream/30"
        )}
      >
        <input {...getInputProps()} />
        <UploadIcon className="mb-2 h-10 w-10 text-cinnamon/60" />
        <p className="text-sm font-medium text-choco">
          {isDragActive ? "Drop receipt images here" : "Drag & drop receipt images or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG - max 20 files</p>
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-chai/30 bg-white px-3 py-2 text-sm">
              <FileImage className="h-4 w-4 text-cinnamon" />
              <span className="flex-1 truncate text-choco">{f.name}</span>
              <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => removeFile(i)} className="rounded p-0.5 hover:bg-cream">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProcessingIndicator() {
  const { stage, currentReceipt, totalReceipts } = useUploadStore()

  const stageIdx = PIPELINE_STAGES.findIndex((s) => s.key === stage)

  return (
    <div className="cafe-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold text-choco">Processing Pipeline</h3>
        {stage !== "complete" && (
          <span className="flex items-center gap-2 text-sm text-cinnamon">
            <Loader2 className="h-4 w-4 animate-spin" />
            {currentReceipt}/{totalReceipts} receipts
          </span>
        )}
      </div>

      <div className="flex gap-1">
        {PIPELINE_STAGES.map((s, i) => {
          const Icon = STAGE_ICONS[s.key] || Eye
          const done = stageIdx > i || stage === "complete"
          const active = stageIdx === i && stage !== "complete"
          return (
            <div key={s.key} className="flex flex-1 flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border transition-all",
                  done && "border-chart-2 bg-chart-2/10 text-chart-2",
                  active && "border-cinnamon bg-cinnamon/10 text-cinnamon animate-pulse",
                  !done && !active && "border-chai/40 bg-cream text-muted-foreground"
                )}
              >
                {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                "mt-1.5 text-[10px] font-medium",
                done ? "text-chart-2" : active ? "text-cinnamon" : "text-muted-foreground"
              )}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResultsView() {
  const { menuCosts, ingredients, reportMd } = useUploadStore()

  if (!menuCosts || !menuCosts.length) return null

  const chartData = menuCosts.map((m) => ({
    name: m.name.length > 16 ? m.name.slice(0, 14) + ".." : m.name,
    margin: m.margin_percent,
  }))

  function marginColor(pct: number): string {
    if (pct >= 75) return "#009588"
    if (pct >= 60) return "#fcbb00"
    return "#f05100"
  }

  return (
    <div className="space-y-6">
      <div className="cafe-card p-6">
        <h3 className="mb-4 font-serif text-lg font-bold text-choco">Your Menu Costs</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Margin"]} />
            <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={marginColor(d.margin)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="cafe-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-chai/30 bg-cream">
              <th className="px-4 py-2 text-left text-xs font-semibold text-choco">Item</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-choco">Sell</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-choco">COGS</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-choco">Margin</th>
            </tr>
          </thead>
          <tbody>
            {menuCosts.map((m) => (
              <tr key={m.menu_item_id} className="border-b border-chai/10 last:border-0">
                <td className="px-4 py-2 text-choco">{m.name}</td>
                <td className="px-4 py-2 text-right font-mono">{formatEur(m.sell_price)}</td>
                <td className="px-4 py-2 text-right font-mono">{formatEur(m.total_cogs)}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold" style={{ color: marginColor(m.margin_percent) }}>
                  {formatPct(m.margin_percent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reportMd && (
        <div className="cafe-card p-4">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-choco">{reportMd}</pre>
        </div>
      )}
    </div>
  )
}

export function Upload() {
  const { files, stage, error, startUpload, reset, menuCosts } = useUploadStore()
  const isProcessing = stage !== "idle" && stage !== "complete" && stage !== "error"

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-choco">Upload Receipts</h1>
      <p className="mb-8 text-muted-foreground">
        Upload your own supplier receipt images and watch the pipeline process them live.
      </p>

      {stage === "idle" && (
        <>
          <ReceiptDropzone />
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""} selected` : "No files selected"}
            </p>
            <button
              onClick={startUpload}
              disabled={!files.length}
              className={cn(
                "inline-flex items-center gap-2 rounded-[var(--radius)] px-6 py-3 font-semibold shadow-lg transition-all",
                files.length > 0
                  ? "bg-syrup text-cream shadow-syrup/20 hover:bg-choco"
                  : "cursor-not-allowed bg-chai/50 text-muted-foreground"
              )}
            >
              <Rocket className="h-4 w-4" /> Run Pipeline
            </button>
          </div>
        </>
      )}

      {isProcessing && <ProcessingIndicator />}

      {error && (
        <div className="mt-4 cafe-card border-destructive/30 bg-red-50 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {stage === "complete" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-chart-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Pipeline Complete</span>
            </div>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg border border-chai bg-white px-4 py-2 text-sm font-medium text-choco hover:bg-cream"
            >
              <RotateCcw className="h-4 w-4" /> Start Over
            </button>
          </div>
          <ResultsView />
        </div>
      )}
    </div>
  )
}
