import { AppShell } from "@/components/layout/AppShell";
import { WebsiteSubnav } from "@/components/website/WebsiteSubnav";
import { useCurrentUser } from "@/hooks/use-auth";
import type { ReactNode } from "react";

export function WebsiteShell({
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
      <AppShell title="الموقع">
        <p className="panel p-10 text-center text-sm text-muted-foreground">
          قسم الموقع متاح للمديرين فقط.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title={title} {...(description ? { description } : {})} {...(actions ? { actions } : {})}>
      <WebsiteSubnav />
      {children}
    </AppShell>
  );
}
