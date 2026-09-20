import { AppShell } from "@/components/layout/AppShell";
import { LandingSubnav } from "@/components/landing/LandingSubnav";
import { useCurrentUser } from "@/hooks/use-auth";
import type { ReactNode } from "react";

export function LandingShell({
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
  const { data: me, isFetched } = useCurrentUser();

  if (isFetched && me && !me.isStaff) {
    return (
      <AppShell title="صفحة الهبوط">
        <p className="panel p-10 text-center text-sm text-muted-foreground">
          قسم صفحة الهبوط متاح للمديرين فقط.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title={title} {...(description ? { description } : {})} {...(actions ? { actions } : {})}>
      <LandingSubnav />
      {children}
    </AppShell>
  );
}
