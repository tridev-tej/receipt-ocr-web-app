import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { WingsLogo } from "@/components/WingsLogo"
import { Menu, X } from "lucide-react"

const NAV = [
  { to: "/", label: "Home" },
  { to: "/showcase", label: "Showcase" },
  { to: "/demo", label: "Demo" },
  { to: "/upload", label: "Upload" },
]

export function Header() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-chai/30 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-syrup text-cream">
            <WingsLogo className="h-5 w-5" />
          </div>
          <span className="font-serif text-xl font-bold text-choco">
            Cafe Super44
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={pathname === item.to ? "page" : undefined}
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

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-lg p-2 text-muted-foreground hover:bg-cream sm:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="border-t border-chai/20 bg-bg/95 px-4 pb-3 pt-2 backdrop-blur-md sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              aria-current={pathname === item.to ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3.5 py-2.5 text-sm font-medium no-underline transition-colors",
                pathname === item.to
                  ? "bg-cream text-syrup"
                  : "text-muted-foreground hover:bg-cream/50 hover:text-choco"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
