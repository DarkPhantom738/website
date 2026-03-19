"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/awards", label: "Awards" },
  { href: "/projects", label: "Projects" },
  { href: "/papers", label: "Papers" },
  { href: "/mini-projects", label: "Mini Projects" },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-6 right-6 z-50">
      <div className="bg-card/80 backdrop-blur-xl border border-border rounded-full px-6 py-3 shadow-lg">
        <ul className="flex items-center gap-1">
          {navItems.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap",
                  pathname === href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
