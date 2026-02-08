import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  Home,
  Calendar,
  ListTodo,
  DollarSign,
  Settings,
  Menu,
  History,
  FileText,
  Shield,
  Hammer,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Homes", href: "/homes", icon: Home },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "DIY Projects", href: "/diy-projects", icon: Hammer },
  { name: "Tool Inventory", href: "/tools", icon: Wrench },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "History", href: "/maintenance-history", icon: History },
  { name: "Warranties", href: "/warranties", icon: FileText },
  { name: "Compliance", href: "/compliance", icon: Shield },
  { name: "Budget", href: "/budget", icon: DollarSign },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <nav className="flex flex-col gap-4">
              <Link href="/" className="mb-4 text-xl font-bold">
                Home Maintenance Pro
              </Link>
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex-1">
          <Link href="/" className="text-lg font-bold">
            Home Maintenance Pro
          </Link>
        </div>
        <UserButton />
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 border-r bg-background lg:block">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center border-b px-6">
              <Link href="/" className="text-xl font-bold">
                Home Maintenance Pro
              </Link>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t p-4">
              <UserButton />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>

        {/* Footer with legal links */}
        <footer className="border-t py-4">
          <div className="container mx-auto flex flex-wrap items-center justify-center gap-4 px-6 text-sm text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} Home Maintenance Pro</span>
            <Link href="/privacy" className="hover:text-foreground underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground underline">
              Terms of Service
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

