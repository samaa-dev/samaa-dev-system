import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, MessageSquareQuote, Inbox } from "lucide-react";

import { WebsiteShell } from "@/components/website/WebsiteShell";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  ensureSiteDefaults,
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

  const published = (projects.data ?? []).filter((p) => p.status === "published").length;
  const visibleQuotes = (testimonials.data ?? []).filter((t) => t.is_visible).length;
  const newLeads = (leads.data ?? []).filter((l) => l.status === "new").length;

  return (
    <WebsiteShell
      title="الموقع"
      description="إدارة محتوى الموقع العام (منفصل عن مشاريع التشغيل الداخلية)"
    >
      <div className="grid gap-4 sm:grid-cols-3">
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
        <StatCard label="طلبات جديدة" value={String(newLeads)} icon={Inbox} tone="warning" />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/website/settings">تعديل الإعدادات</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/website/projects">مشاريع المعرض</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/website/testimonials">الآراء والعبارات</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/website/leads">طلبات التواصل</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/landing">صفحة الهبوط</Link>
        </Button>
      </div>
    </WebsiteShell>
  );
}
