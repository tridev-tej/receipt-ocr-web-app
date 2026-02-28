import { Routes, Route, Link } from "react-router-dom"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Landing } from "@/pages/Landing"
import { Demo } from "@/pages/Demo"
import { Upload } from "@/pages/Upload"
import { Showcase } from "@/pages/Showcase"
import { Toaster } from "sonner"

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <h1 className="text-6xl font-bold text-choco">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
      <Link to="/" className="mt-6 inline-flex items-center rounded-[var(--radius)] bg-syrup px-6 py-3 font-semibold text-cream no-underline hover:bg-choco">
        Back to Home
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/showcase" element={<Showcase />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#fff9f3",
            border: "1px solid #dbbda0",
            color: "#311e10",
            fontFamily: "Raleway, sans-serif",
          },
        }}
      />
    </div>
  )
}
