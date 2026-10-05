import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const links: { to: string; label: string; exact?: boolean }[] = [
  { to: "/landing", label: "نظرة عامة", exact: true },
  { to: "/landing/vsl", label: "محتوى الصفحة" },
  { to: "/website/diagnose-leads", label: "طلبات الحجز" },
];

export function LandingSubnav() {
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
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
