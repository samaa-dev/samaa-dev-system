import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Settings2, Inbox } from "lucide-react";

import { LandingShell } from "@/components/landing/LandingShell";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  ensureLandingAuditDefaults,
  landingAuditSettingsQuery,
  siteAuditLeadsQuery,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/landing/")({
  head: () => ({
    meta: [
      { title: "صفحة الهبوط — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandingOverviewPage,
});

function LandingOverviewPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);

  useEffect(() => {
    if (!enabled) return;
    void ensureLandingAuditDefaults().catch(() => undefined);
  }, [enabled]);

  const settings = useQuery({ ...landingAuditSettingsQuery(), enabled });
  const leads = useQuery({ ...siteAuditLeadsQuery(), enabled });

  const inProgress = (leads.data ?? []).filter((l) => l.status === "in_progress").length;
  const fresh = (leads.data ?? []).filter((l) => l.status === "new").length;
  const optionsCount =
    (settings.data?.business_types.length ?? 0) +
    (settings.data?.monthly_volumes.length ?? 0) +
    (settings.data?.team_sizes.length ?? 0) +
    (settings.data?.challenges.length ?? 0);

  return (
    <LandingShell
      title="صفحة الهبوط"
      description="إدارة محتوى فحص النظام والطلبات الواردة من audit"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="طلبات جديدة" value={String(fresh)} icon={Inbox} tone="warning" />
        <StatCard
          label="قيد التعبئة"
          value={String(inProgress)}
          icon={ClipboardList}
          tone="info"
        />
        <StatCard
          label="خيارات الأسئلة"
          value={String(optionsCount)}
          icon={Settings2}
          tone="primary"
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/landing/settings">تعديل محتوى الأسئلة</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/landing/leads">عرض الطلبات</Link>
        </Button>
      </div>
    </LandingShell>
  );
}
