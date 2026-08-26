import logoUrl from "@/assets/samaa-logo.png";

import { cn } from "@/lib/utils";

/** Local brand mark — does not rely on Lovable `__l5e` asset URLs. */
export function SamaaLogo({
  className,
  alt = "شعار Samaa Dev",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      className={cn("object-contain", className)}
      width={36}
      height={36}
      decoding="async"
    />
  );
}
