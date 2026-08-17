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
import { LoginPage } from "@/components/LoginPage";
import { LaborDashboard } from "@/components/LaborDashboard";
import { GlobalSearchModal } from "@/components/global-search-modal";
import { Search, Plus, Bell, User, CheckCircle2, AlertCircle, PhoneCall, Banknote, Calendar, X } from "lucide-react";
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
      { name: "theme-color", content: "#1a56db" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
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
  const { enquiries, projects, resetToCleanDemoMode, currentUser, logout } = useRobotics();
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
            <img src="/logo.png" alt="RPC Logo" className="h-6 w-6 object-contain" />
            <span className="font-bold text-slate-900 tracking-wide">Robotics ERP</span>
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
              <span className="truncate">Search (Ctrl+K)...</span>
            </div>
            <kbd className="hidden sm:inline-block text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400">
              Ctrl + K
            </kbd>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
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
                    <Banknote className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
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
                  {currentUser?.role === "CEO" ? "CEO" : "SP"}
                </div>
                <span className="hidden md:inline font-medium text-foreground">{currentUser?.name || "Admin User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuLabel>
                <p className="text-xs font-semibold">{currentUser?.name || "Service Admin"}</p>
                <p className="text-[10px] text-muted-foreground font-normal">
                  {currentUser?.role === "CEO" ? "CEO / Super Admin" : "Supervisor / Staff"}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {currentUser?.role === "CEO" && (
                <DropdownMenuItem asChild>
                  <Link to="/settings">System Settings</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/reports">Export Reports</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => logout()}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold cursor-pointer"
              >
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Client-side Service Worker Registration
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch((err) => console.error("ServiceWorker registration failed:", err));
    }

    // Check if user previously dismissed prompt
    const isDismissed = typeof window !== "undefined" && localStorage.getItem("pwa_install_dismissed") === "true";

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (window.innerWidth < 768 && !isDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem("pwa_install_dismissed", "true");
    } catch {}
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-blue-600 text-white p-3 shadow-2xl rounded-t-2xl flex items-center justify-between gap-3 border-t border-blue-500 md:hidden">
      <div className="flex items-center gap-2.5 min-w-0">
        <img src="/logo.png" alt="RPC Logo" className="h-8 w-8 object-contain shrink-0 drop-shadow-xs" />
        <div className="min-w-0">
          <p className="text-xs font-bold truncate">Install Robotics ERP</p>
          <p className="text-[10px] text-blue-100 truncate">Install Robotics ERP for a better experience</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstall}
          className="bg-white text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-blue-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <RoboticsProvider>
        <RootLayout />
        <PwaInstallBanner />
        <Toaster richColors position="top-right" />
      </RoboticsProvider>
    </QueryClientProvider>
  );
}

function RootLayout() {
  const { currentUser } = useRobotics();

  if (!currentUser) {
    return <LoginPage />;
  }

  if (currentUser.role === "Labor") {
    return <LaborDashboard />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50 dark:bg-background overflow-x-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <MainHeader />
          <main className="flex-1 p-3 sm:p-6 lg:p-8 w-full max-w-full space-y-6 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
