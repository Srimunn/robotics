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
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white text-slate-900">
      <SidebarHeader className="border-b border-slate-200 p-3 bg-white">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-xs">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-extrabold tracking-tight text-slate-900">
              Robotics ERP
            </div>
            <div className="truncate text-[11px] font-semibold text-slate-500">
              Enterprise Operations Suite
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">
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
                      className={`h-10 rounded-xl font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-blue-100/80 text-blue-950 font-extrabold border-l-4 border-blue-600 dark:bg-blue-900/50 dark:text-blue-100 shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 active:bg-blue-100 active:text-blue-950"
                      }`}
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-3">
                        <item.icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-blue-700 dark:text-blue-300" : "text-slate-400 group-hover:text-slate-700"}`} />
                        <span className="text-[14px] font-bold">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 p-3 text-xs text-slate-500 text-center bg-white">
        <div className="truncate text-[11px] font-semibold text-slate-400">Single Source of Truth ERP</div>
      </SidebarFooter>
    </Sidebar>
  );
}
