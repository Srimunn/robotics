import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { RoboticsProvider, useRobotics } from "@/lib/robotics-context";
import { Toaster } from "@/components/ui/sonner";
import { GlobalSearchModal } from "@/components/global-search-modal";
import { Search, Plus, Bell, User, CheckCircle2, AlertCircle, PhoneCall, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Application Error
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong loading this view. You can reload or return to the main dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Robotics Service Management System" },
      { name: "description", content: "Enterprise ERP for Robotics & Industrial Automation Service Operations" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function MainHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { enquiries, projects, resetToCleanDemoMode } = useRobotics();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global Search: Ctrl+K or Ctrl+F
      if ((e.key === "k" || e.key === "f") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Print: Ctrl+P
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeEnquiriesCount = enquiries.filter((e) => e.customerDecision === "Thinking" || e.customerDecision === "Follow-up").length;
  const pendingPaymentsProjects = projects.filter((p) => p.paymentStatus !== "Paid").length;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white text-slate-900 px-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-slate-700 hover:text-slate-900 hover:bg-slate-100" />
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
            <span className="font-bold text-slate-900 tracking-wide">Robotics ERP</span>
            <span className="text-slate-300">/</span>
            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold text-[10px] border border-slate-200 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> MongoDB Atlas Connected
            </span>
          </div>
        </div>

        {/* Global Search trigger */}
        <div className="flex-1 max-w-md">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between text-xs text-slate-500 bg-slate-100/80 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Search Customer, Project, Enquiry, Phone (Ctrl+K)...</span>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400">
              Ctrl + K
            </kbd>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Clean Demo Mode Reset Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (confirm("Reset ERP to Clean Demo Mode?\n\nAll current enquiry, project, payment, and attendance records will be cleared for a 100% fresh live executive demonstration.")) {
                resetToCleanDemoMode();
              }
            }}
            className="text-xs rounded-lg gap-1 border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100"
          >
            🧹 Clean Demo Reset
          </Button>
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-lg">
                <Bell className="h-4 w-4" />
                {activeEnquiriesCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-xl p-0 overflow-hidden">
              <div className="p-3 bg-muted/30 border-b flex justify-between items-center">
                <h4 className="text-xs font-semibold text-foreground">System Notifications</h4>
                <Badge variant="secondary" className="text-[10px]">
                  {activeEnquiriesCount + pendingPaymentsProjects} Alerts
                </Badge>
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                {activeEnquiriesCount > 0 && (
                  <Link
                    to="/enquiries"
                    className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-accent text-xs transition-colors"
                  >
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">
                        {activeEnquiriesCount} Active Customer Enquiry(ies)
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Site visit & quotation decision pending.
                      </p>
                    </div>
                  </Link>
                )}

                {pendingPaymentsProjects > 0 && (
                  <Link
                    to="/payments"
                    className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-accent text-xs transition-colors"
                  >
                    <DollarSign className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">
                        {pendingPaymentsProjects} Project(s) Pending Collection
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Outstanding contract balances awaiting entry.
                      </p>
                    </div>
                  </Link>
                )}

                <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-accent text-xs transition-colors">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Workflow Engine Active</p>
                    <p className="text-[11px] text-muted-foreground">
                      "Enter Data Once. Never Type Twice" active.
                    </p>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 rounded-lg px-2 text-xs">
                <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 font-bold grid place-items-center text-[10px]">
                  AD
                </div>
                <span className="hidden md:inline font-medium text-foreground">Admin User</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuLabel>
                <p className="text-xs font-semibold">Service Admin</p>
                <p className="text-[10px] text-muted-foreground font-normal">admin@robotics-mgmt.com</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">System Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/reports">Export Reports</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <RoboticsProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-slate-50/50 dark:bg-background">
            <AppSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <MainHeader />
              <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full space-y-6">
                <Outlet />
              </main>
            </div>
          </div>
          <Toaster richColors position="top-right" />
        </SidebarProvider>
      </RoboticsProvider>
    </QueryClientProvider>
  );
}
