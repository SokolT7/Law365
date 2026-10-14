"use client";

import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * A GET filter form that applies itself: selects immediately, search after a short pause.
 * Works without JavaScript too (Enter submits), and keeps state in the URL so views are shareable.
 */
export default function AutoFilter({ children, className = "register-toolbar", resultLabel, clearHref, active }: {
  children: React.ReactNode;
  className?: string;
  resultLabel?: string;
  clearHref?: string;
  active?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function apply() {
    if (!form.current) return;
    const params = new URLSearchParams();
    // Skip empty fields and selects left on their first (default) option to keep URLs short.
    form.current.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[name], select[name]").forEach((field) => {
      if (field instanceof HTMLSelectElement && field.selectedIndex === 0) return;
      if (field.value.trim()) params.set(field.name, field.value.trim());
    });
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  return <form ref={form} className={className} method="get" role="search"
    onSubmit={(event) => { event.preventDefault(); clearTimeout(timer.current); apply(); }}
    onChange={(event) => {
      const target = event.target as unknown as HTMLInputElement;
      clearTimeout(timer.current);
      if (target.type === "search" || target.type === "text") timer.current = setTimeout(apply, 280);
      else apply();
    }}>
    {children}
    <button type="submit" className="sr-only">Primijeni filtre</button>
    <span className="toolbar-status" role="status">
      {pending && <span className="btn-spinner" aria-hidden="true" />}
      {resultLabel}
      {active && clearHref && <a className="link" href={clearHref} onClick={(event) => {
        event.preventDefault();
        // Uncontrolled fields keep their typed values across navigation, so clear them explicitly.
        form.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input:not([type=hidden]), select").forEach((field) => {
          if (field instanceof HTMLSelectElement) field.selectedIndex = 0; else field.value = "";
        });
        startTransition(() => router.replace(clearHref, { scroll: false })); }}>Očisti filtre</a>}
    </span>
  </form>;
}
