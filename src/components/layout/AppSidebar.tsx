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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

import { SamaaLogo } from "@/components/brand/SamaaLogo";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

type Props = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showCollapseControl?: boolean;
  className?: string;
};

export function AppSidebar({
  collapsed = false,
  onToggleCollapse,
  showCollapseControl = true,
  className,
}: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: me } = useCurrentUser();

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {items
        .filter((item) => !item.staffOnly || me?.isStaff)
        .map((item) => {
          const active = pathname === item.url || pathname.startsWith(`${item.url}/`);
          const link = (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed ? item.title : null}
            </Link>
          );

          if (!collapsed) return link;

          return (
            <Tooltip key={item.url}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="left">{item.title}</TooltipContent>
            </Tooltip>
          );
        })}
    </nav>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "shrink-0 flex-col border-e border-sidebar-border bg-sidebar transition-[width,padding] duration-200",
          collapsed ? "w-16 p-2" : "w-64 p-4",
          className ?? "hidden md:flex",
        )}
      >
        <div className={cn("mb-6 flex items-center", collapsed ? "justify-center" : "gap-3 px-2")}>
          <Link to="/overview" className={cn("flex items-center", collapsed ? "" : "gap-3")}>
            <SamaaLogo className="h-9 w-9 shrink-0" />
            {!collapsed ? (
              <span className="leading-tight">
                <span className="block text-base font-bold text-sidebar-foreground">Samaa Dev</span>
                <span className="block text-[11px] tracking-widest text-muted-foreground">
                  MANAGEMENT SYSTEM
                </span>
              </span>
            ) : null}
          </Link>
        </div>

        {nav}

        {!collapsed ? (
          <div className="mt-4 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3 text-xs text-muted-foreground">
            نظام إدارة داخلي — كل البيانات محفوظة لحظياً في قاعدة بيانات الوكالة.
          </div>
        ) : null}

        {showCollapseControl && onToggleCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn("mt-3", !collapsed && "w-full justify-start gap-2")}
            onClick={onToggleCollapse}
            aria-label={collapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                طي القائمة
              </>
            )}
          </Button>
        ) : null}
      </aside>
    </TooltipProvider>
  );
}
