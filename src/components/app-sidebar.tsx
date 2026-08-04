import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  PhoneCall,
  FolderKanban,
  Users,
  UserCheck,
  HardHat,
  CalendarCheck,
  Wrench,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  Bot,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Enquiries", url: "/enquiries", icon: PhoneCall },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Engineers", url: "/engineers", icon: UserCheck },
  { title: "Labours", url: "/labours", icon: HardHat },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck },
  { title: "Machines & Tools", url: "/machines", icon: Wrench },
  { title: "Payments & Credit", url: "/payments", icon: Wallet },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-background">
      <SidebarHeader className="border-b border-border/60 p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-xs ring-1 ring-blue-700/20">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold tracking-tight text-foreground">
              Robotics ERP
            </div>
            <div className="truncate text-xs font-medium text-muted-foreground">
              Enterprise Operations Suite
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase font-semibold text-muted-foreground/70 px-2 tracking-wider">
            Main Enterprise Modules
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu className="space-y-1">
              {items.map((item) => {
                const isActive =
                  item.url === "/"
                    ? currentPath === "/"
                    : currentPath.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`h-10 rounded-lg font-medium transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-3">
                        <item.icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-blue-600" : ""}`} />
                        <span className="text-[15px]">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-3 text-xs text-muted-foreground text-center">
        <div className="truncate text-[11px] font-medium">Single Source of Truth ERP</div>
      </SidebarFooter>
    </Sidebar>
  );
}
