import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu } from "lucide-react";
import type { ReactNode } from "react";

import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCurrentUser } from "@/hooks/use-auth";
import { roleLabels } from "@/lib/samaa";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <Sheet key={pathname}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="القائمة">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <AppSidebarMobile />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold md:text-xl">{title}</h1>
            {description ? (
              <p className="truncate text-xs text-muted-foreground md:text-sm">{description}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {actions}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-ring focus-visible:ring-2">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={me?.avatarUrl ?? undefined} alt={me?.fullName ?? "المستخدم"} />
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {(me?.fullName ?? me?.email ?? "S").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="space-y-1">
                  <div className="text-sm font-semibold">{me?.fullName ?? "عضو الفريق"}</div>
                  <div className="text-xs font-normal text-muted-foreground">{me?.email}</div>
                  <div className="text-xs font-normal text-primary">
                    {me?.roles.map((r) => roleLabels[r] ?? r).join(" · ")}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/team">إدارة الفريق</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function AppSidebarMobile() {
  return (
    <div className="flex h-full">
      <div className="flex w-full flex-col [&>aside]:flex [&>aside]:w-full">
        <AppSidebar />
      </div>
    </div>
  );
}
