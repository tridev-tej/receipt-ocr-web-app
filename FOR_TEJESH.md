# FOR_TEJESH.md - Receipt OCR Web App

## What Is This?

A web frontend wrapping your receipt-ocr-pipeline project. The assessor can now *experience* the pipeline interactively instead of just reading code. Three pages:

1. **Landing** (`/`) - Marketing-style page explaining the pipeline with animations
2. **Showcase** (`/showcase`) - Complete technical deep dive: 10-stage architecture, prompt engineering decisions, real-world challenges, production resilience, V1-V3 iteration history, validation gallery, business decisions, honest limitations
3. **Demo** (`/demo`) - 7-tab explorer of pre-computed results (100 receipts, 22 ingredients, 12 menu items)
4. **Upload** (`/upload`) - Drop real receipt images, watch the pipeline run live via Claude Vision API

## Architecture

```
Browser (React/Vite)
    |
    |  /api/* requests
    v
FastAPI (uvicorn)
    |
    ├── Demo endpoints --> reads pre-computed data from SQLite + JSON files
    ├── Upload endpoints --> runs actual pipeline stages, polls for status
    └── SPA catch-all --> serves frontend/dist/* for production
```

The backend is dead simple - it's mostly a read layer over the pre-computed pipeline output. The `api/services.py` file has all the DB reads with raw SQL against `output/cogs.db`. No ORM, no migrations, just SELECT queries.

The upload flow is more interesting: POST images -> background task runs each pipeline stage -> frontend polls status every 2 seconds -> results served from per-run SQLite DB.

## Directory Layout

```
api/
  main.py          # FastAPI app, CORS, SPA serving
  services.py      # All data access (DB reads, file reads, pipeline orchestration)
  routes/
    config.py      # GET /api/config
    demo.py        # 7 demo endpoints (menu, ingredients, receipts, metrics, etc.)
    upload.py      # POST upload, GET status, GET results
pipeline/          # Copied from receipt-ocr-pipeline/src/ (the actual pipeline code)
data/              # Extractions JSONs + receipt images
output/            # Pre-computed: cogs.db, metrics, evaluation, reports
frontend/
  src/
    pages/         # Landing.tsx, Showcase.tsx, Demo.tsx, Upload.tsx
    components/
      demo/        # 7 tab components (MenuCostsTab, IngredientsTab, etc.)
      layout/      # Header, Footer
    stores/        # Zustand: useDemoStore (lazy-fetch), useUploadStore (upload lifecycle)
    lib/           # api.ts (fetch wrapper), constants.ts, utils.ts
```

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Backend | FastAPI + uvicorn | Async, simple, great for API-only backends |
| Frontend | React 19 + TypeScript | Standard, good ecosystem |
| Build | Vite 7 | Fast HMR, clean builds |
| Styling | Tailwind CSS v4 | Utility-first, `@theme` for design tokens |
| State | Zustand | Tiny, no boilerplate, lazy-fetch pattern |
| Charts | Recharts | BarChart, ScatterChart, easy to theme |
| Animations | Framer Motion | `whileInView` scroll animations on landing |
| Upload | react-dropzone | Drag-drop file handling |
| DB | SQLite (read-only) | Pre-computed data, no setup needed |
| Container | Docker multi-stage | Node builds frontend, Python serves everything |

## Design System (Super44 Cafe Aesthetic)

The palette is warm cafe colors - not generic SaaS blue:

- **choco** `#311e10` - dark chocolate, main text
- **syrup** `#5d2609` - maple syrup, primary/buttons
- **cinnamon** `#a56124` - accent, emphasis, hover states
- **chai** `#dbbda0` - borders, muted elements
- **cream** `#f5ebe0` - secondary backgrounds
- **bg** `#fff9f3` - warm off-white page background

Fonts: **Bitter** (serif, headings) + **Raleway** (sans, body). Loaded from Google Fonts.

Custom utilities in CSS: `cafe-card`, `cafe-card-hover`, `gradient-hero`, `text-gradient`.

## Key Technical Decisions

**Why raw SQL instead of using the pipeline's Database class?**
The pipeline's Database class is designed for writes (INSERT/UPDATE). The web app only reads. Raw SQL is simpler and gives exact control over what columns we return. Also avoids importing the full pipeline dependency chain for reads.

**Why Zustand over React Context?**
Each demo tab lazy-fetches its data on first view and caches it. Zustand makes this pattern trivial - just check if the data is null, fetch if so. No provider nesting, no re-render cascades.

**Why not SSR/Next.js?**
This is a portfolio showcase app, not a production SaaS. SPA is simpler, deploys as static files + API, and the assessor doesn't care about SEO.

**Why copy pipeline code instead of pip install?**
The pipeline isn't published as a package. Copying the source files keeps it self-contained. The web app's `pipeline/` directory is a snapshot of the pipeline at the time of building.

## Lessons Learned

### The Receipt ID Format Mismatch
Spent time debugging why the receipt walkthrough showed 0 line items. Turns out the extraction files use `R-001` format while the database stores `R-000001`. The fix was a simple converter function `_to_db_receipt_id()` in services.py. Lesson: when you have IDs flowing between two systems, always check the format matches.

### Tailwind v4 Broke Custom Utilities
Tailwind v4 doesn't support `@layer utilities { .my-class { @apply ... } }` anymore. Had to switch to the new `@utility my-class { ... }` syntax with raw CSS properties. The build error was cryptic - just "unexpected token". Lesson: when upgrading major versions of CSS frameworks, check the migration guide for breaking changes.

### Framer Motion TypeScript Strictness
`ease: "easeOut"` throws a TypeScript error because Framer Motion's `Easing` type is complex. The fix is `ease: "easeOut" as const`. Same issue with Recharts `Tooltip formatter` - the parameter types are broader than you expect. Lesson: library types in the React ecosystem can be annoying, `as const` is your friend.

### Recharts Vertical BarChart Margin
The `margin={{ left: 120 }}` on vertical BarCharts is needed to prevent Y-axis labels from getting clipped. This isn't obvious from the docs - you have to set both `margin.left` on the chart AND `width` on the YAxis.

## Running Locally

```bash
# Terminal 1: Backend
cd ~/receipt-ocr-web-app
make api

# Terminal 2: Frontend (dev mode with HMR)
cd ~/receipt-ocr-web-app
make frontend-dev

# Or both together:
make dev  # runs api in background + frontend-dev in foreground
```

Frontend dev server at http://localhost:5173 (proxies /api/* to :8000)
Production build: `make frontend-build` then visit http://localhost:8000

## Docker

```bash
docker compose up --build
# App at http://localhost:8080
```

Multi-stage Dockerfile: Node 20 builds the frontend, Python 3.11-slim serves everything with uvicorn.

## Upload Mode

Needs `ANTHROPIC_API_KEY` in `.env` for real Claude Vision API calls. Without it, upload will fail at the OCR stage. Each upload gets its own run directory at `output/runs/{run_id}/`.
