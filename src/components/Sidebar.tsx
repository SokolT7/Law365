"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IDashboard, IDocs, IShield, IChat, IClock, IUsers, IFlag, IBook, ILock } from "@/components/Icons";
import LogoutButton from "@/components/LogoutButton";
import Logo from "@/components/Logo";
import type { Mode } from "@/lib/types";

const GROUPS = [
  { label: "Pregled", links: [{ href: "/", label: "Radni prostor", Icon: IDashboard, feature: "" }] },
  { label: "Rad s dokumentima", links: [
    { href: "/dokumenti", label: "Dokumenti", Icon: IDocs, feature: "documents" },
    { href: "/klijenti", label: "Klijenti", Icon: IUsers, feature: "clients" },
    { href: "/provjera", label: "Provjera ugovora", Icon: IShield, feature: "contract_review" },
  ] },
  { label: "Pravno istraživanje", links: [
    { href: "/pitanja", label: "Pravna pitanja", Icon: IChat, feature: "legal_questions" },
    { href: "/propisi", label: "Praćenje propisa", Icon: IFlag, feature: "regulatory_tracking" },
  ] },
  { label: "Ured", links: [
    { href: "/izvori", label: "Izvori prava", Icon: IBook, feature: "source_settings" },
    { href: "/zapisnik", label: "Zapisnik aktivnosti", Icon: IClock, feature: "activity_log" },
  ] },
];

export default function Sidebar({ firmName, userName, userRole, features, accent, isAdmin = false }: {
  firmName: string;
  mode?: Mode;
  userName: string;
  userRole: string;
  features?: string[];
  accent?: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const safeAccent = accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : undefined;

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => { setMobile(query.matches); if (!query.matches) setOpen(false); };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!open || !mobile) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    asideRef.current?.querySelector<HTMLAnchorElement>(".nav-link")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault(); setOpen(false); toggleRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const items = Array.from(asideRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []).filter((el) => el.getClientRects().length > 0);
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [open, mobile]);

  return (
    <>
      {open && mobile && <button className="nav-backdrop" tabIndex={-1} aria-label="Zatvori izbornik" onClick={() => { setOpen(false); toggleRef.current?.focus(); }} />}
      <aside ref={asideRef} className={`sidebar${open ? " open" : ""}`} style={safeAccent ? { "--firm-accent": safeAccent } as CSSProperties : undefined} aria-label="Navigacija radnog prostora">
        <div className="side-head">
          <Link href={isAdmin ? "/admin" : "/"} className="brand" aria-label="LTB Law — početna stranica">
            <Logo size={36} />
            <span className="brand-name">LTB <span>Law</span></span>
          </Link>
          <button ref={toggleRef} type="button" className="menu-toggle" aria-controls="workspace-navigation" aria-expanded={open} aria-label={open ? "Zatvori izbornik" : "Otvori izbornik"} onClick={() => setOpen((value) => !value)}>
            <span className="mt-bar" /><span className="mt-bar" />
          </button>
        </div>
        <div className="brand-firm"><span>{isAdmin ? "LTB administracija" : "Radni prostor ureda"}</span><b>{firmName}</b></div>
        <div id="workspace-navigation" className="side-body" inert={mobile && !open}>
          <div className="side-body-inner">
            <nav className="nav" aria-label="Glavni izbornik">
              {GROUPS.map((group) => {
                const links = group.links.filter((link) => !link.feature || !features || features.includes(link.feature));
                if (!links.length) return null;
                return <div className="nav-group" key={group.label}>
                  <div className="nav-group-label">{group.label}</div>
                  {links.map(({ href, label, Icon }) => {
                    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                    return <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={18} aria-hidden="true" /><span>{label}</span>{active && <span className="nav-active-mark" aria-hidden="true" />}</Link>;
                  })}
                </div>;
              })}
              {isAdmin && <div className="nav-group"><div className="nav-group-label">Administracija</div>
                <Link href="/admin" className={`nav-link${pathname === "/admin" ? " active" : ""}`} aria-current={pathname === "/admin" ? "page" : undefined}><IShield size={18} aria-hidden="true" /><span>Pregled administracije</span></Link>
                <Link href="/admin/firms" className={`nav-link${pathname.startsWith("/admin/firms") ? " active" : ""}`} aria-current={pathname.startsWith("/admin/firms") ? "page" : undefined}><IUsers size={18} aria-hidden="true" /><span>Uredi i korisnici</span></Link>
              </div>}
            </nav>
            <div className="sidebar-foot">
              <div className="workspace-private"><ILock size={13} aria-hidden="true" /> Pristup po odobrenju</div>
              <div className="profile-row">
                <Link className="profile-link" href="/racun" aria-label={`Moj račun: ${userName}`}>
                  <span className="profile-avatar" aria-hidden="true">{initials || "U"}</span>
                  <span className="who"><b>{userName}</b><span>{userRole}</span></span>
                </Link>
                <LogoutButton compact />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
