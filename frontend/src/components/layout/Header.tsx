import { Link, useLocation } from "react-router-dom"
import { Coffee } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/", label: "Home" },
  { to: "/demo", label: "Demo" },
  { to: "/upload", label: "Upload" },
]

export function Header() {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-50 border-b border-chai/30 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-syrup text-cream">
            <Coffee className="h-5 w-5" />
          </div>
          <span className="font-serif text-xl font-bold text-choco">
            Cafe Super44
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium no-underline transition-colors",
                pathname === item.to
                  ? "bg-cream text-syrup"
                  : "text-muted-foreground hover:bg-cream/50 hover:text-choco"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
