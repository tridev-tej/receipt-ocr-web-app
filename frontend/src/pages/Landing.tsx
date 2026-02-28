import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Eye, ShieldCheck, Ruler, Tags, Link as LinkIcon,
  Calculator, Database, FileText, ArrowRight,
  Zap, Target, BarChart3, CheckCircle2, AlertTriangle,
  Layers, Cpu, FlaskConical,
} from "lucide-react"
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
function Hero() {
  return (
    <section className="relative overflow-hidden gradient-hero">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23311e10' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      <div className="relative mx-auto max-w-4xl px-4 py-28 text-center md:py-36">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-cinnamon/30 bg-cream px-4 py-1.5 text-sm font-medium text-syrup"
        >
          <WingsLogo className="h-4 w-4" />
          Receipt OCR Pipeline
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl font-bold leading-tight text-choco md:text-6xl lg:text-7xl"
        >
          Know your{" "}
          <span className="text-gradient">real costs.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
        >
          Automate cafe COGS from supplier receipts. Claude Vision extracts, validates,
          normalizes, and maps 100 receipts into per-item cost breakdowns with
          statistical confidence.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-syrup px-6 py-3 font-semibold text-cream shadow-lg shadow-syrup/20 no-underline transition-all hover:bg-choco hover:shadow-xl"
          >
            See Demo <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border-2 border-cinnamon/40 bg-white px-6 py-3 font-semibold text-syrup no-underline transition-all hover:border-cinnamon hover:bg-cream"
          >
            Upload Receipts
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Pipeline Visualization ────────────────────────────
const STAGES = [
  { icon: Eye, label: "Extract", desc: "Claude Vision OCR" },
  { icon: ShieldCheck, label: "Validate", desc: "Math checks, dedup" },
  { icon: Ruler, label: "Normalize", desc: "Units, currency, EUR" },
  { icon: Tags, label: "Classify", desc: "Ingredient/packaging" },
  { icon: LinkIcon, label: "Map", desc: "3-tier matching" },
  { icon: Calculator, label: "Calculate", desc: "IQR, weighted avg" },
  { icon: Database, label: "Store", desc: "SQLite with lineage" },
  { icon: FileText, label: "Report", desc: "Markdown + CSV" },
]

function PipelineViz() {
  return (
    <Section className="bg-white">
      <SectionTitle sub="8-stage automated pipeline from receipt scan to cost report">
        How It Works
      </SectionTitle>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        {STAGES.map((s, i) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            className="group flex flex-col items-center text-center"
          >
            <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-chai/40 bg-cream transition-all duration-300 group-hover:border-cinnamon group-hover:shadow-md">
              <s.icon className="h-6 w-6 text-syrup transition-colors group-hover:text-cinnamon" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cinnamon text-[10px] font-bold text-white">
                {i + 1}
              </span>
            </div>
            <p className="text-sm font-semibold text-choco">{s.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

// ─── Stats Cards ───────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {typeof value === "number" && value % 1 !== 0 ? value.toFixed(3) : value}
      {suffix}
    </motion.span>
  )
}

const STATS = [
  { value: 100, suffix: "", label: "Receipts Processed", icon: FileText },
  { value: 1.0, suffix: "", label: "Mapping F1 Score", icon: Target },
  { value: 100, suffix: "%", label: "Cost Accuracy", icon: CheckCircle2 },
  { value: 22, suffix: "", label: "Ingredients Tracked", icon: BarChart3 },
]

function StatsCards() {
  return (
    <Section>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((s) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            className="cafe-card-hover p-6 text-center"
          >
            <s.icon className="mx-auto mb-3 h-8 w-8 text-cinnamon" />
            <p className="text-3xl font-bold text-choco">
              <AnimatedNumber value={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

// ─── Mapping Tiers ─────────────────────────────────────
function MappingTiers() {
  return (
    <Section className="bg-white">
      <SectionTitle sub="Three cascading strategies ensure every line item finds its match">
        3-Tier Ingredient Mapping
      </SectionTitle>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            tier: "Tier 1",
            title: "Manual Overrides",
            desc: "Known mappings from learning loop. Instant, perfect confidence.",
            example: '"Lait Entier 1L" -> whole_milk',
            confidence: "1.00",
            color: "bg-chart-2",
            icon: Zap,
          },
          {
            tier: "Tier 2",
            title: "Fuzzy Match",
            desc: "Token sort ratio with 85+ auto-accept threshold. Fast, reliable.",
            example: '"Whole Milk 2L" -> whole_milk (score: 92)',
            confidence: "0.85+",
            color: "bg-chart-4",
            icon: Target,
          },
          {
            tier: "Tier 3",
            title: "LLM Fallback",
            desc: "Claude batch mapping for uncertain items (65-84 fuzzy). Smart, contextual.",
            example: '"Bio Hafermilch Barista" -> oat_milk',
            confidence: "LLM conf",
            color: "bg-chart-1",
            icon: Cpu,
          },
        ].map((t) => (
          <motion.div
            key={t.tier}
            variants={fadeUp}
            className="cafe-card-hover overflow-hidden"
          >
            <div className={`${t.color} px-4 py-2 text-sm font-bold text-white`}>
              {t.tier} - Confidence: {t.confidence}
            </div>
            <div className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <t.icon className="h-5 w-5 text-cinnamon" />
                <h3 className="text-lg font-bold text-choco">{t.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
              <div className="mt-3 rounded-lg bg-cream/60 px-3 py-2 font-mono text-xs text-syrup">
                {t.example}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

// ─── Confidence Model ──────────────────────────────────
function ConfidenceModel() {
  return (
    <Section>
      <SectionTitle sub="Every cost comes with a statistical confidence score">
        Confidence Propagation
      </SectionTitle>
      <motion.div variants={fadeUp} className="cafe-card mx-auto max-w-3xl p-8">
        <div className="mb-6 rounded-lg bg-cream p-4 font-mono text-sm text-choco">
          <p className="mb-2 font-semibold">confidence = min(0.95,</p>
          <p className="pl-4">sqrt(n) / (n + K)</p>
          <p className="pl-4">x avg_mapping_confidence</p>
          <p className="pl-4">x avg_ocr_confidence</p>
          <p className="pl-4">x cv_penalty</p>
          <p>)</p>
        </div>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          {[
            { label: "Volume Factor", desc: "sqrt(n)/(n+K) - penalizes < 5 data points" },
            { label: "0.95 Cap", desc: "System never claims certainty" },
            { label: "CV Penalty", desc: "High price variance lowers confidence" },
            { label: "OCR Weight", desc: "Low OCR confidence propagates through" },
          ].map((f) => (
            <div key={f.label} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-chart-2" />
              <div>
                <p className="font-semibold text-choco">{f.label}</p>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </Section>
  )
}

// ─── Edge Cases ────────────────────────────────────────
const EDGES = [
  { icon: "🇪🇺", title: "EU Number Formats", desc: "Comma decimals, thousand separators" },
  { icon: "🌍", title: "7 Languages", desc: "French, German, Spanish OCR" },
  { icon: "💱", title: "8 Currencies", desc: "Auto-conversion to EUR" },
  { icon: "📦", title: "Pack Sizes", desc: '"Box of 500 cups" -> qty=500' },
  { icon: "🔄", title: "Refunds/Credits", desc: "Negative values preserved correctly" },
  { icon: "⚡", title: "Rate Limiting", desc: "Token bucket + circuit breaker" },
  { icon: "🎯", title: "IQR Outliers", desc: "Tukey fence removes price anomalies" },
  { icon: "🔍", title: "Dedup Detection", desc: "Catches duplicate receipts" },
]

function EdgeCases() {
  return (
    <Section className="bg-white">
      <SectionTitle sub="Production-hardened against real-world receipt chaos">
        Edge Cases Handled
      </SectionTitle>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {EDGES.map((e) => (
          <motion.div key={e.title} variants={fadeUp} className="cafe-card-hover p-4 text-center">
            <span className="mb-2 block text-2xl">{e.icon}</span>
            <p className="text-sm font-semibold text-choco">{e.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{e.desc}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

// ─── Eval Summary ──────────────────────────────────────
function EvalSummary() {
  return (
    <Section>
      <SectionTitle sub="Formal evaluation against ground truth data">
        Pipeline Score: 0.958
      </SectionTitle>
      <motion.div variants={fadeUp} className="mx-auto max-w-2xl">
        <div className="cafe-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-chai/30 bg-cream">
                <th className="px-4 py-3 text-left font-semibold text-choco">Metric</th>
                <th className="px-4 py-3 text-right font-semibold text-choco">Score</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Mapping Precision", "1.000"],
                ["Mapping Recall", "1.000"],
                ["Mapping F1", "1.000"],
                ["Classification Accuracy", "0.788"],
                ["Cost Accuracy", "1.000"],
                ["Composite Score", "0.958"],
              ].map(([metric, score]) => (
                <tr key={metric} className="border-b border-chai/10 last:border-0">
                  <td className="px-4 py-2.5 text-choco">{metric}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-syrup">{score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </Section>
  )
}

// ─── Tech Stack ────────────────────────────────────────
const TECH = [
  "Python 3.10", "Claude Vision", "Pydantic v2", "SQLite + WAL",
  "thefuzz", "asyncio", "Pillow", "FastAPI", "React", "Recharts",
  "Tailwind CSS", "Zustand",
]

function TechStack() {
  return (
    <Section className="bg-white">
      <SectionTitle>Built With</SectionTitle>
      <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2">
        {TECH.map((t) => (
          <span
            key={t}
            className="rounded-full border border-chai/40 bg-cream px-4 py-1.5 text-sm font-medium text-syrup"
          >
            {t}
          </span>
        ))}
      </motion.div>
    </Section>
  )
}

// ─── Landing ───────────────────────────────────────────
export function Landing() {
  return (
    <>
      <Hero />
      <PipelineViz />
      <StatsCards />
      <MappingTiers />
      <ConfidenceModel />
      <EdgeCases />
      <EvalSummary />
      <TechStack />
    </>
  )
}
