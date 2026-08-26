import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Timer,
  Wallet,
  Users,
  UserCog,
  Building2,
} from "lucide-react";

import { SamaaLogo } from "@/components/brand/SamaaLogo";
import { cn } from "@/lib/utils";
import { sprintUiLabels } from "@/lib/samaa";
import { useCurrentUser } from "@/hooks/use-auth";

const items = [
  { title: "عرض الشركة", url: "/overview", icon: Building2, staffOnly: false },
  { title: "لوحة القيادة", url: "/dashboard", icon: LayoutDashboard, staffOnly: false },
  { title: "المشاريع", url: "/projects", icon: FolderKanban, staffOnly: false },
  { title: "المهام", url: "/tasks", icon: ListChecks, staffOnly: false },
  { title: sprintUiLabels.module, url: "/sprints", icon: Timer, staffOnly: false },
  { title: "الحسابات المالية", url: "/finance", icon: Wallet, staffOnly: true },
  { title: "العملاء", url: "/clients", icon: Users, staffOnly: false },
  { title: "الفريق", url: "/team", icon: UserCog, staffOnly: false },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: me } = useCurrentUser();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar p-4 md:flex">
      <Link to="/overview" className="mb-8 flex items-center gap-3 px-2">
        <SamaaLogo className="h-9 w-9 shrink-0" />
        <span className="leading-tight">
          <span className="block text-base font-bold text-sidebar-foreground">Samaa Dev</span>
          <span className="block text-[11px] tracking-widest text-muted-foreground">
            MANAGEMENT SYSTEM
          </span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {items
          .filter((item) => !item.staffOnly || me?.isStaff)
          .map((item) => {
            const active = pathname === item.url || pathname.startsWith(`${item.url}/`);
            return (
              <Link
                key={item.url}
                to={item.url}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
      </nav>

      <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3 text-xs text-muted-foreground">
        نظام إدارة داخلي — كل البيانات محفوظة لحظياً في قاعدة بيانات الوكالة.
      </div>
    </aside>
  );
}
