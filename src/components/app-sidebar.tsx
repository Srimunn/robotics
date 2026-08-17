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
  LogOut,
  FileSpreadsheet,
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

import { useRobotics } from "@/lib/robotics-context";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Enquiries", url: "/enquiries", icon: PhoneCall },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Engineers", url: "/engineers", icon: UserCheck },
  { title: "Labours", url: "/labours", icon: HardHat },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck },
  { title: "Tools", url: "/machines", icon: Wrench },
  { title: "Payments", url: "/payments", icon: Wallet },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { currentUser, logout } = useRobotics();

  const filteredItems = items.filter((item) => {
    if (currentUser?.role === "Worker" && item.title === "Settings") {
      return false;
    }
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white text-slate-900">
      <SidebarHeader className="border-b border-slate-200 p-3 bg-white">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="RPC Logo" className="h-8 w-8 object-contain shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-base font-extrabold tracking-tight text-slate-900">
              Robotics ERP
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu className="space-y-1">
              {filteredItems.map((item) => {
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

      <SidebarFooter className="border-t border-slate-200 p-3 bg-white space-y-2">
        <div className="flex items-center gap-2.5 p-1 text-left">
          <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-800 font-bold grid place-items-center text-[10px] border border-slate-200 shrink-0">
            {currentUser?.role === "CEO" ? "CEO" : "WK"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate leading-tight">
              {currentUser?.name || "User"}
            </p>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
              {currentUser?.role === "CEO" ? "Admin" : currentUser?.role === "Worker" ? "Worker" : "Manager"}
            </p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold cursor-pointer transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
