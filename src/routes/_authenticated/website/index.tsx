import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FolderKanban, Inbox, Phone } from "lucide-react";

import { WebsiteShell } from "@/components/website/WebsiteShell";
import { useCurrentUser } from "@/hooks/use-auth";
import { ensureSiteDefaults, siteLeadsQuery, siteProjectsAdminQuery } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/website/")({
  head: () => ({
    meta: [
      { title: "الموقع — Samaa Dev" },
      { name: "description", content: "إدارة الموقع العام لشركة Samaa Dev." },
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
    void ensureSiteDefaults().catch(() => undefined);
  }, [enabled]);

  const projects = useQuery({ ...siteProjectsAdminQuery(), enabled });
  const leads = useQuery({ ...siteLeadsQuery(), enabled });

  const published = (projects.data ?? []).filter((p) => p.status === "published").length;
  const newLeads = (leads.data ?? []).filter((l) => l.status === "new").length;

  const cards = [
    {
      to: "/website/settings" as const,
      title: "التواصل",
      desc: "واتساب، الهاتف، والبريد، وروابط السوشيال المعروضة في الموقع.",
      icon: Phone,
      meta: "يظهر في التذييل وأزرار التواصل",
    },
    {
      to: "/website/projects" as const,
      title: "مشاريع المعرض",
      desc: "الأعمال المنشورة على الموقع وصفحة الهبوط.",
      icon: FolderKanban,
      meta: `${published} مشروع منشور`,
    },
    {
      to: "/website/leads" as const,
      title: "طلبات التواصل",
      desc: "الرسائل الواردة من نموذج التواصل في الموقع.",
      icon: Inbox,
      meta: newLeads > 0 ? `${newLeads} طلب جديد` : "لا طلبات جديدة",
      highlight: newLeads > 0,
    },
  ];

  return (
    <WebsiteShell title="الموقع" description="ما يظهر على الموقع الرئيسي فقط — بسيط ومباشر.">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className={cn(
              "group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
              card.highlight && "border-amber-300/80 bg-amber-50/40 dark:bg-amber-950/20",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <card.icon className="h-5 w-5" />
              </span>
              <ArrowLeft className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight">{card.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
            </div>
            <p className="mt-auto text-xs font-medium text-muted-foreground">{card.meta}</p>
          </Link>
        ))}
      </div>
    </WebsiteShell>
  );
}
