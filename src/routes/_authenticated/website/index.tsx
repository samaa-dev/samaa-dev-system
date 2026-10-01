import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, MessageSquareQuote, Inbox, Stethoscope, LayoutTemplate, Users } from "lucide-react";

import { WebsiteShell } from "@/components/website/WebsiteShell";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  ensureSiteDefaults,
  siteDiagnosticLeadsQuery,
  siteLeadsQuery,
  siteProjectsAdminQuery,
  siteTestimonialsAdminQuery,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/website/")({
  head: () => ({
    meta: [
      { title: "الموقع — Samaa Dev" },
      { name: "description", content: "إدارة محتوى الموقع العام لشركة Samaa Dev." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteOverviewPage,
});

function WebsiteOverviewPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);

  useEffect(() => {
    if (!enabled) return;
    void ensureSiteDefaults().catch(() => {
      /* seed best-effort */
    });
  }, [enabled]);

  const projects = useQuery({ ...siteProjectsAdminQuery(), enabled });
  const testimonials = useQuery({ ...siteTestimonialsAdminQuery(), enabled });
  const leads = useQuery({ ...siteLeadsQuery(), enabled });
  const diagnoseLeads = useQuery({ ...siteDiagnosticLeadsQuery(), enabled });

  const published = (projects.data ?? []).filter((p) => p.status === "published").length;
  const visibleQuotes = (testimonials.data ?? []).filter((t) => t.is_visible).length;
  const newLeads = (leads.data ?? []).filter((l) => l.status === "new").length;
  const newDiagnose = (diagnoseLeads.data ?? []).filter((l) => l.status === "new").length;

  return (
    <WebsiteShell
      title="الموقع"
      description="إدارة محتوى الموقع العام (منفصل عن مشاريع التشغيل الداخلية)"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="مشاريع منشورة"
          value={String(published)}
          icon={FolderKanban}
          tone="primary"
        />
        <StatCard
          label="آراء ظاهرة"
          value={String(visibleQuotes)}
          icon={MessageSquareQuote}
          tone="info"
        />
        <StatCard label="طلبات تواصل جديدة" value={String(newLeads)} icon={Inbox} tone="warning" />
        <StatCard
          label="طلبات تشخيص جديدة"
          value={String(newDiagnose)}
          icon={Stethoscope}
          tone="success"
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/website/settings">تعديل الإعدادات</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/website/sections">
            <LayoutTemplate className="h-4 w-4" />
            أقسام الصفحة
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/website/projects">مشاريع المعرض</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/website/team">
            <Users className="h-4 w-4" />
            الفريق
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/website/testimonials">الآراء والعبارات</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/website/diagnose">صفحة التشخيص</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/website/diagnose-leads">طلبات التشخيص والأفكار</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/website/leads">طلبات التواصل</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/landing">قمع التدقيق القديم</Link>
        </Button>
      </div>
    </WebsiteShell>
  );
}
