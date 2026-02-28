import { useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Eye, ShieldCheck, Ruler, Tags, Link as LinkIcon,
  Calculator, Database, FileText, ArrowRight,
  Zap, Target, CheckCircle2, AlertTriangle,
  Image, Shield, Timer, DollarSign, Globe,
  Code, Lightbulb, TrendingUp, XCircle, ChevronDown,
  Lock, RotateCcw, Scan, Wrench, FlaskConical,
  ThermometerSun, Smartphone, Coffee,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WingsLogo } from "@/components/WingsLogo"

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
}

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
      className={`py-20 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4">{children}</div>
    </motion.section>
  )
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <motion.div variants={fadeUp} className="mb-12 text-center">
      <h2 className="text-3xl font-bold text-choco md:text-4xl">{children}</h2>
      {sub && <p className="mt-3 text-lg text-muted-foreground">{sub}</p>}
    </motion.div>
  )
}

// ─── Hero ──────────────────────────────────────────────
function ShowcaseHero() {
  const stats = [
    { value: "100", label: "Receipts" },
    { value: "318", label: "Line Items" },
    { value: "96.7%", label: "OCR Confidence" },
    { value: "94.9%", label: "Mapping Rate" },
    { value: "340", label: "Tests" },
    { value: "~4s", label: "Per Receipt" },
  ]

  return (
    <section className="relative overflow-hidden gradient-hero">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23311e10' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      <div className="relative mx-auto max-w-5xl px-4 py-24 text-center md:py-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-cinnamon/30 bg-cream px-4 py-1.5 text-sm font-medium text-syrup"
        >
          <WingsLogo className="h-4 w-4" />
          Technical Showcase
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl font-bold leading-tight text-choco md:text-5xl lg:text-6xl"
        >
          From messy receipts to{" "}
          <span className="text-gradient">menu item costs</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          Every engineering decision explained. A 5% COGS error across 12 items
          costs up to <span className="font-semibold text-chart-1">EUR 43,800/year</span> -
          that's why precision matters.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-6"
        >
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-chai/40 bg-white/60 px-3 py-3 backdrop-blur-sm">
              <p className="text-xl font-bold text-choco md:text-2xl">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-syrup px-6 py-3 font-semibold text-cream shadow-lg shadow-syrup/20 no-underline transition-all hover:bg-choco hover:shadow-xl"
          >
            Explore Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border-2 border-cinnamon/40 bg-white px-6 py-3 font-semibold text-syrup no-underline transition-all hover:border-cinnamon hover:bg-cream"
          >
            Try It Live
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// ─── 10-Stage Pipeline ─────────────────────────────────
const PIPELINE_STAGES = [
  { icon: Image, label: "Preprocess", detail: "Deskew, contrast, denoise, resize (4MP cap)", color: "bg-chart-3" },
  { icon: Eye, label: "OCR Extract", detail: "Claude Vision with tool_use; SHA256 cache; Tesseract fallback", color: "bg-chart-1" },
  { icon: Scan, label: "Cross-Validate", detail: "PaddleOCR as second reader (asymmetric trust)", color: "bg-chart-5" },
  { icon: ShieldCheck, label: "Validate", detail: "Math checks (qty x price = total), line sum verification", color: "bg-chart-2" },
  { icon: Ruler, label: "Normalize", detail: "Units to metric, 8 currencies to EUR, pack sizes per-unit", color: "bg-chart-4" },
  { icon: Tags, label: "Classify", detail: "COGS vs non-COGS using word-boundary regex", color: "bg-chart-3" },
  { icon: LinkIcon, label: "Map", detail: "3-tier: overrides -> fuzzy(85+) -> LLM batch (~70-80% free matches)", color: "bg-chart-1" },
  { icon: Calculator, label: "Calculate", detail: "IQR outlier removal (k=1.5), confidence-weighted averaging", color: "bg-chart-5" },
  { icon: Database, label: "Persist", detail: "SQLite upsert with run_id lineage; exit codes (0=ok, 3=bad OCR)", color: "bg-chart-2" },
  { icon: FileText, label: "Report", detail: "Markdown TL;DR, decision table, sensitivity analysis", color: "bg-chart-4" },
]

function PipelineArchitecture() {
  return (
    <Section className="bg-white">
      <SectionTitle sub="Each stage has Pydantic validation contracts. Concurrency capped at 8 via asyncio.Semaphore.">
        10-Stage Async Pipeline
      </SectionTitle>
      <div className="space-y-3">
        {PIPELINE_STAGES.map((s, i) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            className="group flex items-start gap-4 rounded-xl border border-chai/20 bg-bg/50 p-4 transition-all hover:border-cinnamon/40 hover:shadow-sm"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.color} text-white`}>
              <span className="text-sm font-bold">{i + 1}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-cinnamon" />
                <h3 className="font-semibold text-choco">{s.label}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p variants={fadeUp} className="mt-6 text-center text-sm text-muted-foreground">
        CPU preprocessing runs in <code className="rounded bg-cream px-1.5 py-0.5 font-mono text-xs text-syrup">asyncio.to_thread()</code> to prevent event loop blocking
      </motion.p>
    </Section>
  )
}

// ─── Prompt Engineering ────────────────────────────────
const PROMPT_RULES = [
  {
    rule: "Use tool_use, not free-text JSON",
    broke: "~15% malformed JSON output",
    fix: "Dropped to <1% with structured tool calls",
    icon: Code,
  },
  {
    rule: "NEVER invent information",
    broke: 'Claude "saw" Bananas when image showed Lemons',
    fix: "Explicit instruction: leave null if unreadable",
    icon: XCircle,
  },
  {
    rule: "Nullable fields for qty, unit_price, total",
    broke: "Claude guessed prices for illegible receipts",
    fix: "Fields can be null - flagged for manual review",
    icon: AlertTriangle,
  },
  {
    rule: 'Decimal format: "3,50" -> "3.50"',
    broke: "EU comma decimals broke float parsing",
    fix: "Explicit instruction to output dot-decimal floats",
    icon: Globe,
  },
  {
    rule: "Strict unit enum: kg, g, L, ml, each",
    broke: 'Claude invented "piece", "bottle", "pack"',
    fix: "Enforced enum - anything else defaults to 'each'",
    icon: Ruler,
  },
  {
    rule: "Match ONLY if confident",
    broke: '"Cafe en Grains Decaf" mapped to wrong ingredient',
    fix: "Confidence gating eliminated false positive mappings",
    icon: Target,
  },
  {
    rule: "Strip control chars, truncate to 200 chars",
    broke: "Potential prompt injection via receipt descriptions",
    fix: "Sanitization layer before any LLM processing",
    icon: Shield,
  },
]

function PromptEngineering() {
  return (
    <Section>
      <SectionTitle sub="Every rule exists because something broke without it">
        Prompt Engineering
      </SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {PROMPT_RULES.map((r) => (
          <motion.div
            key={r.rule}
            variants={fadeUp}
            className="cafe-card overflow-hidden"
          >
            <div className="border-b border-chai/20 bg-cream/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <r.icon className="h-4 w-4 text-cinnamon" />
                <h3 className="text-sm font-semibold text-choco">{r.rule}</h3>
              </div>
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs text-red-600">!</span>
                <p className="text-sm text-muted-foreground">{r.broke}</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-chart-2" />
                <p className="text-sm text-muted-foreground">{r.fix}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

// ─── Understanding the Numbers ─────────────────────────
const METRICS_EXPLAINED = [
  {
    metric: "OCR Confidence",
    value: "96.7%",
    definition: "Weighted average certainty across 318 line items. Confidence levels: high (0.95), medium (0.80), low (0.60).",
    detail: "Low-confidence items flagged for manual review.",
    formula: "weighted_avg(field_confidence per line_item)",
  },
  {
    metric: "Mapping Rate",
    value: "94.9%",
    definition: "Percentage of items successfully matched to known ingredients via 3-tier matching.",
    detail: "Unmapped 5.1% are correctly excluded - discounts, delivery fees, non-ingredient items.",
    formula: "matched_items / total_items",
  },
  {
    metric: "Average Margin",
    value: "73.7%",
    definition: "Profit after COGS. Target range for cafes: 65-75%. Items below 60% flagged.",
    detail: "EUR 0.10 increase on Cappuccino = EUR 150/month loss.",
    formula: "(sell_price - total_COGS) / sell_price x 100",
  },
  {
    metric: "Item Confidence",
    value: "0.86 - 0.95",
    definition: "Combines OCR, mapping, and data volume signals. Capped at 0.95.",
    detail: "Berry Smoothie shows lowest confidence due to cost volatility.",
    formula: "clamp(min(1, n/5) x avg_mapping x avg_ocr x cv_penalty, 0, 0.95)",
  },
  {
    metric: "COGS Range",
    value: "EUR 0.41 - 2.13",
    definition: "Total ingredient + packaging cost per item using weighted averages.",
    detail: "IQR outlier removal (k=1.5) eliminates price anomalies from supplier errors.",
    formula: "sum(ingredient_cost x qty) after IQR filtering",
  },
  {
    metric: "Sensitivity (95% CI)",
    value: "+/- 1.96 SD",
    definition: "Margin swing potential using standard deviation analysis across receipt history.",
    detail: "Berry Smoothie worst-case: 50.2% margin. Espresso shows stability due to consistent pricing.",
    formula: "margin +/- 1.96 x std_dev(unit_costs)",
  },
]

function MetricsExplained() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <Section className="bg-white">
      <SectionTitle sub="What each number actually means and how it's calculated">
        Understanding the Numbers
      </SectionTitle>
      <div className="mx-auto max-w-3xl space-y-3">
        {METRICS_EXPLAINED.map((m) => (
          <motion.div key={m.metric} variants={fadeUp} className="cafe-card overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === m.metric ? null : m.metric)}
              aria-expanded={expanded === m.metric}
              aria-controls={`metric-panel-${m.metric.replace(/\s/g, "-")}`}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-cream/30"
            >
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold text-cinnamon">{m.value}</span>
                <span className="font-semibold text-choco">{m.metric}</span>
              </div>
              <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", expanded === m.metric && "rotate-180")} />
            </button>
            <AnimatePresence>
              {expanded === m.metric && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div id={`metric-panel-${m.metric.replace(/\s/g, "-")}`} role="region" className="border-t border-chai/20 px-5 py-4 space-y-3">
                    <p className="text-sm text-muted-foreground">{m.definition}</p>
                    <p className="text-sm text-choco">{m.detail}</p>
                    <div className="rounded-lg bg-cream/60 px-3 py-2 font-mono text-xs text-syrup">
                      {m.formula}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

// ─── Real-World Challenges ─────────────────────────────
const CHALLENGES = [
  {
    icon: ThermometerSun,
    title: "Faded Thermal Print",
    problem: "Tesseract fails below 0.60 confidence on degraded thermal paper",
    solution: "Claude Vision uses context clues - surrounding text, receipt structure, common price patterns",
  },
  {
    icon: Smartphone,
    title: "Tilted Phone Capture",
    problem: "Traditional OCR requires perfectly aligned images",
    solution: "Vision handles ~15 degree rotation natively; preprocessing adds deskew for extreme cases",
  },
  {
    icon: FileText,
    title: "Worn Thermal Paper",
    problem: "Partial text loss from age, friction, or heat exposure",
    solution: "Context-based recovery: if 'Milk' is readable but price is gone, flag as null instead of guessing",
  },
  {
    icon: Coffee,
    title: "Coffee Stains & Tears",
    problem: "Physical damage obscures receipt data",
    solution: "Cross-validation with PaddleOCR catches what one reader misses; confidence scoring reflects uncertainty",
  },
  {
    icon: Zap,
    title: "Camera Flash Glare",
    problem: "Overexposed regions create blank spots in the image",
    solution: "Preprocessing normalizes contrast; Vision model reads around glare using surrounding context",
  },
  {
    icon: Globe,
    title: "7 Languages, 8 Currencies",
    problem: '"Espresso Mischung" in German, "3,50" in EU format, CHF/SEK/NOK/DKK alongside EUR',
    solution: "LLM-based mapping handles multilingual items; regex disambiguation for number formats",
  },
]

function RealWorldChallenges() {
  return (
    <Section>
      <SectionTitle sub="Production-hardened against real-world receipt chaos">
        Real-World Challenges
      </SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CHALLENGES.map((c) => (
          <motion.div key={c.title} variants={fadeUp} className="cafe-card-hover p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream">
                <c.icon className="h-5 w-5 text-cinnamon" />
              </div>
              <h3 className="font-semibold text-choco">{c.title}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-1" />
                <p className="text-sm text-muted-foreground">{c.problem}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-chart-2" />
                <p className="text-sm text-muted-foreground">{c.solution}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

// ─── Production Resilience ─────────────────────────────
const RESILIENCE_FEATURES = [
  {
    icon: RotateCcw,
    title: "Circuit Breaker",
    detail: "3 consecutive API failures trigger Tesseract fallback. Half-open retry after 60s. Prevents cascade failures.",
  },
  {
    icon: Shield,
    title: "Run Guard",
    detail: "Abort if >50% receipts fail OCR. Exit code 3: bad data in = bad data out. Better to fail loudly than produce garbage.",
  },
  {
    icon: Timer,
    title: "Rate Limiter",
    detail: "Token-bucket at 4 req/s. Fixed a deadlock where capacity <= rate caused permanent starvation.",
  },
  {
    icon: Lock,
    title: "Cost Guard (TOCTOU fix)",
    detail: "$10 budget cap. Reserve max cost under lock BEFORE API call, reconcile actual cost after. Prevents overspend race conditions.",
  },
  {
    icon: Scan,
    title: "Cross-Validation",
    detail: "PaddleOCR as second reader with asymmetric trust - can flag Claude but never override. Rule-based math checks break ties.",
  },
  {
    icon: FlaskConical,
    title: "340 Tests",
    detail: "Normalizer edge cases, full pipeline e2e, adversarial prompts, malformed images. ruff clean, 0 warnings.",
  },
]

function ProductionResilience() {
  return (
    <Section className="bg-white">
      <SectionTitle sub="Resilience-first engineering - every failure mode has a handler">
        Production-Grade Resilience
      </SectionTitle>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {RESILIENCE_FEATURES.map((f) => (
          <motion.div key={f.title} variants={fadeUp} className="cafe-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <f.icon className="h-5 w-5 text-cinnamon" />
              <h3 className="font-semibold text-choco">{f.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{f.detail}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

// ─── Key Iterations ────────────────────────────────────
const ITERATIONS = [
  {
    version: "V1",
    title: "Raw OCR",
    color: "bg-chart-1",
    problem: 'Tesseract priced a latte at EUR 28k. Claude hallucinated "Bananas" when the image showed Lemons.',
    insight: "OCR is an LLM problem, not regex. LLMs must be told it's OK to say 'I don't know.'",
  },
  {
    version: "V2",
    title: "Structured Extraction",
    color: "bg-chart-4",
    problem: "Free-text JSON was ~15% malformed. Fuzzy matching created false positive ingredient mappings.",
    insight: "tool_use guarantees structure, not semantics. Every path needs validation.",
  },
  {
    version: "V3",
    title: "Production Hardening",
    color: "bg-chart-2",
    problem: 'EU number parsing broke everything - "3,50" vs "1,500" vs "0,750". Race conditions in cost tracking.',
    insight: "Number parsing is never done. 5 formats, regex disambiguation. TOCTOU bugs hide in async code.",
  },
]

function KeyIterations() {
  return (
    <Section>
      <SectionTitle sub="How the pipeline evolved through real failures">
        3 Key Iterations
      </SectionTitle>
      <div className="mx-auto max-w-3xl space-y-0">
        {ITERATIONS.map((iter, i) => (
          <motion.div key={iter.version} variants={fadeUp} className="relative flex gap-6 pb-8 last:pb-0">
            {/* Timeline line */}
            {i < ITERATIONS.length - 1 && (
              <div className="absolute left-5 top-12 h-[calc(100%-2rem)] w-px bg-chai/40" />
            )}
            {/* Version badge */}
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iter.color} text-sm font-bold text-white`}>
              {iter.version}
            </div>
            {/* Content */}
            <div className="cafe-card flex-1 p-5">
              <h3 className="mb-2 font-semibold text-choco">{iter.title}</h3>
              <div className="mb-3 flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-chart-1" />
                <p className="text-sm text-muted-foreground">{iter.problem}</p>
              </div>
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-chart-4" />
                <p className="text-sm font-medium text-choco">{iter.insight}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

// ─── Validation Gallery ────────────────────────────────
function ValidationGallery() {
  const validationStats = [
    { value: "17/17", label: "Supplier Names Correct", icon: CheckCircle2, color: "text-chart-2" },
    { value: "17/17", label: "Receipt Totals Match", icon: CheckCircle2, color: "text-chart-2" },
    { value: "100%", label: "Tax/Discount Flags", icon: CheckCircle2, color: "text-chart-2" },
    { value: "2", label: "Items Flagged for Review", icon: AlertTriangle, color: "text-chart-4" },
  ]

  return (
    <Section className="bg-white">
      <SectionTitle sub="17 receipts hand-verified with image-vs-extraction side-by-side">
        Ground Truth Validation
      </SectionTitle>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {validationStats.map((s) => (
          <motion.div key={s.label} variants={fadeUp} className="cafe-card-hover p-5 text-center">
            <s.icon className={`mx-auto mb-2 h-8 w-8 ${s.color}`} />
            <p className="text-2xl font-bold text-choco">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
      <motion.div variants={fadeUp} className="mt-8 cafe-card mx-auto max-w-2xl p-6">
        <h3 className="mb-4 font-semibold text-choco">Validation Process</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-xs font-bold text-cinnamon">1</span>
            <p>Each receipt image opened side-by-side with extracted JSON output</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-xs font-bold text-cinnamon">2</span>
            <p>Supplier name, date, line items, totals, and tax verified field-by-field</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-xs font-bold text-cinnamon">3</span>
            <p>Discrepancies logged - 2 items flagged due to OCR confidence below threshold (correctly caught by pipeline)</p>
          </div>
        </div>
      </motion.div>
    </Section>
  )
}

// ─── Results & Decisions ───────────────────────────────
const DECISIONS = [
  {
    item: "Espresso",
    margin: "83.6%",
    status: "stable",
    action: "No action needed",
    badge: "bg-chart-2/10 text-chart-2",
    detail: "High confidence, consistent pricing across suppliers. Narrow CI band.",
  },
  {
    item: "Butter Croissant",
    margin: "59.6%",
    status: "flagged",
    action: "Price review",
    badge: "bg-chart-1/10 text-chart-1",
    detail: "Below 65% target. Butter cost volatility compressing margins.",
  },
  {
    item: "Berry Smoothie",
    margin: "~65%",
    status: "monitor",
    action: "Watch costs",
    badge: "bg-chart-4/10 text-chart-4",
    detail: "Widest confidence interval. Worst-case: 50.2% margin. Berry costs are seasonal.",
  },
]

function ResultsDecisions() {
  return (
    <Section>
      <SectionTitle sub="Numbers become actions - every insight tied to a business decision">
        Results that Drive Decisions
      </SectionTitle>
      <div className="mx-auto max-w-3xl space-y-4">
        {DECISIONS.map((d) => (
          <motion.div key={d.item} variants={fadeUp} className="cafe-card overflow-hidden">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-semibold text-choco">{d.item}</h3>
                  <p className="text-sm text-muted-foreground">{d.detail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:shrink-0">
                <span className="text-xl font-bold text-choco">{d.margin}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${d.badge}`}>
                  {d.action}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

// ─── Honest Limitations ────────────────────────────────
const LIMITATIONS = [
  { text: "Static currency rates (prototype only)", icon: DollarSign },
  { text: "No auto-learning from corrections (manual override feedback loop)", icon: RotateCcw },
  { text: "22-ingredient cap (10k+ SKUs would need embeddings)", icon: Database },
  { text: "Cost: ~$0.02-0.06 per receipt via Claude API", icon: Wrench },
  { text: "If starting over: Postgres from day 1", icon: Lightbulb },
]

function HonestLimitations() {
  return (
    <Section className="bg-white">
      <SectionTitle sub="False confidence is worse than honest gaps">
        Honest Limitations
      </SectionTitle>
      <motion.div variants={fadeUp} className="mx-auto max-w-2xl space-y-3">
        {LIMITATIONS.map((l) => (
          <div key={l.text} className="flex items-start gap-3 rounded-lg border border-chai/20 bg-bg/50 px-4 py-3">
            <l.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-choco">{l.text}</p>
          </div>
        ))}
      </motion.div>
    </Section>
  )
}

// ─── Guiding Principle ─────────────────────────────────
function GuidingPrinciple() {
  return (
    <Section>
      <motion.div variants={fadeUp} className="mx-auto max-w-3xl text-center">
        <div className="rounded-2xl border border-cinnamon/20 bg-cream/50 px-8 py-10">
          <TrendingUp className="mx-auto mb-4 h-8 w-8 text-cinnamon" />
          <blockquote className="text-lg font-medium leading-relaxed text-choco md:text-xl">
            "Validation parity: every path a receipt can take must be tested, not just the happy path.
            340 tests - normalizer edge cases, full pipeline e2e, adversarial prompts, malformed images.
            ruff clean, 0 warnings."
          </blockquote>
          <p className="mt-6 text-sm font-medium text-muted-foreground">
            Guiding principle - false confidence is worse than honest gaps
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-syrup px-6 py-3 font-semibold text-cream shadow-lg shadow-syrup/20 no-underline transition-all hover:bg-choco hover:shadow-xl"
          >
            Explore the Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border-2 border-cinnamon/40 bg-white px-6 py-3 font-semibold text-syrup no-underline transition-all hover:border-cinnamon hover:bg-cream"
          >
            Upload Your Receipts
          </Link>
        </div>
      </motion.div>
    </Section>
  )
}

// ─── Showcase Page ─────────────────────────────────────
export function Showcase() {
  return (
    <>
      <ShowcaseHero />
      <PipelineArchitecture />
      <PromptEngineering />
      <MetricsExplained />
      <RealWorldChallenges />
      <ProductionResilience />
      <KeyIterations />
      <ValidationGallery />
      <ResultsDecisions />
      <HonestLimitations />
      <GuidingPrinciple />
    </>
  )
}
