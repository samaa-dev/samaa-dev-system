import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const links: { to: string; label: string; exact?: boolean }[] = [
  { to: "/website", label: "نظرة عامة", exact: true },
  { to: "/website/settings", label: "الإعدادات" },
  { to: "/website/sections", label: "أقسام الصفحة" },
  { to: "/website/projects", label: "مشاريع المعرض" },
  { to: "/website/team", label: "الفريق" },
  { to: "/website/testimonials", label: "الآراء والعبارات" },
  { to: "/website/diagnose", label: "صفحة التشخيص" },
  { to: "/website/diagnose-leads", label: "طلبات التشخيص والأفكار" },
  { to: "/website/leads", label: "طلبات التواصل" },
];

export function WebsiteSubnav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.to || pathname === `${link.to}/`
          : pathname === link.to || pathname.startsWith(`${link.to}/`);
        return (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
