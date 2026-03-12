import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DashboardNav } from "@/components/dashboard-nav";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { navigation } from "@/lib/dashboard-nav-config";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Mobile header: menu + user only — branding moved to footer */}
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <nav className="flex flex-col gap-1 pt-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <UserButton />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar: nav + user — section labels, active state, hover life */}
        <aside className="hidden w-56 shrink-0 border-r bg-background lg:flex lg:flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            <DashboardNav />
            <div className="shrink-0 border-t p-3">
              <UserButton />
            </div>
          </div>
        </aside>

        {/* Main content — fills remaining space; only this area scrolls when needed */}
        <main className="min-h-0 flex-1 overflow-y-auto pb-16 lg:pb-0">
          <div className="container mx-auto min-h-full px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation for quick access between main sections */}
      <MobileBottomNav />

      {/* Footer: always at bottom of viewport */}
      <footer className="shrink-0 border-t bg-muted/30 py-2.5">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-1 px-6 text-sm text-muted-foreground">
          <Link href="/" className="font-semibold hover:text-foreground">
            Home Maintenance Pro
          </Link>
          <Link href="/privacy" className="hover:text-foreground underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground underline">
            Terms of Service
          </Link>
          <span className="w-full text-center lg:w-auto">
            &copy; {new Date().getFullYear()} Home Maintenance Pro
          </span>
        </div>
      </footer>
    </div>
  );
}

