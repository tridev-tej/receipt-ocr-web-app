import { Routes, Route } from "react-router-dom"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Landing } from "@/pages/Landing"
import { Demo } from "@/pages/Demo"
import { Upload } from "@/pages/Upload"
import { Toaster } from "sonner"

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/upload" element={<Upload />} />
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
