"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IChevronDown, IKeyboard, ILogout, IPanelLeft, IUser } from "@/components/Icons";
import Logo from "@/components/Logo";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Feedback";
import { useWorkspace } from "@/components/shell/WorkspaceContext";
import { NAV_LINKS, SETTINGS, activeHref, allowed, type NavLink } from "@/components/shell/nav";

export type NavCounts = Partial<Record<string, { value: number; alert?: boolean; label: string }>>;

function initialsOf(name: string) {
  return name.replace(/\s*(d\.o\.o\.|d\.d\.|·.*)$/i, "").split(/[\s&]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

/** Closes a popover on outside click or Escape and returns focus to its trigger. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLElement>(".menu-item")?.focus();
    const onDown = (event: MouseEvent) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); return; }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const items = Array.from(wrap.current?.querySelectorAll<HTMLElement>(".menu-item") ?? []);
      const index = items.indexOf(document.activeElement as HTMLElement);
      items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey, true); };
  }, [open]);
  return { open, setOpen, wrap, trigger };
}

export default function Sidebar({ firmName, userName, userRole, features, counts = {}, open, onClose, collapsed, onToggleCollapse }: {
  firmName: string;
  userName: string;
  userRole: string;
  features?: string[];
  counts?: NavCounts;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const toast = useToast();
  const workspace = useWorkspace();
  const asideRef = useRef<HTMLElement>(null);
  const profileMenu = usePopover();
  const [loggingOut, setLoggingOut] = useState(false);
  const links = allowed(NAV_LINKS, features);
  const active = activeHref(pathname, [...links, SETTINGS]);

  // Mobile drawer: trap focus, close on Escape.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    asideRef.current?.querySelector<HTMLElement>(".nav-link")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const items = Array.from(asideRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []).filter((el) => el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  async function logout() {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.assign("/prijava");
    } catch {
      setLoggingOut(false);
      toast({ tone: "error", message: "Odjava nije uspjela. Provjerite vezu i pokušajte ponovno." });
    }
  }

  return (
    <>
      {open && <button className="nav-backdrop" tabIndex={-1} aria-label="Zatvori izbornik" onClick={onClose} />}
      <aside ref={asideRef} id="workspace-navigation" className={`sidebar${open ? " open" : ""}`} aria-label="Navigacija radnog prostora">
        <div className="side-head">
          <Link href="/" className="brand" aria-label="LTB Law — početna">
            <Logo size={30} />
            <span className="brand-name">LTB <span>Law</span></span>
          </Link>
          {/* Collapsing is a keyboard/search action; the way back out is always visible. */}
          {collapsed && <Button variant="ghost" size="sm" iconOnly icon={<IPanelLeft />} className="side-collapse" onClick={onToggleCollapse} title="Proširi izbornik">Proširi izbornik</Button>}
        </div>

        <div className="side-body">
          <div className="side-body-inner">
            <nav className="nav" aria-label="Glavni izbornik">
              {links.map((link) => <NavItem key={link.href} link={link} active={active === link.href} count={counts[link.href]} collapsed={collapsed} onClick={onClose} />)}
            </nav>

            <div className="sidebar-foot" ref={profileMenu.wrap}>
              <NavItem link={SETTINGS} active={active === SETTINGS.href} collapsed={collapsed} onClick={onClose} />
              {profileMenu.open && <div className="menu up" role="menu" aria-label="Račun">
                <div className="menu-label"><b>{userName}</b><span>{firmName}</span></div>
                <Link href="/racun" role="menuitem" className="menu-item" onClick={() => { profileMenu.setOpen(false); onClose(); }}><IUser aria-hidden="true" />Moj račun</Link>
                <button type="button" role="menuitem" className="menu-item" onClick={() => { profileMenu.setOpen(false); workspace?.openShortcuts(); }}><IKeyboard aria-hidden="true" />Prečaci tipkovnice</button>
                <div className="menu-sep" role="separator" />
                <button type="button" role="menuitem" className="menu-item danger" disabled={loggingOut} onClick={logout}><ILogout aria-hidden="true" />{loggingOut ? "Odjavljivanje…" : "Odjava"}</button>
              </div>}
              <button ref={profileMenu.trigger} type="button" className="profile-button" aria-haspopup="menu" aria-expanded={profileMenu.open} onClick={() => profileMenu.setOpen(!profileMenu.open)} title={collapsed ? userName : undefined}>
                <span className="profile-avatar" aria-hidden="true">{initialsOf(userName) || "U"}</span>
                <span className="who"><b>{userName}</b><span>{userRole}</span></span>
                <IChevronDown aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({ link: { href, label, Icon }, active, count, collapsed, onClick }: { link: NavLink; active: boolean; count?: NavCounts[string]; collapsed: boolean; onClick: () => void }) {
  return <Link href={href} onClick={onClick} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined}>
    <Icon aria-hidden="true" /><span className="nav-label">{label}</span>
    {count && count.value > 0 && <span className={`nav-count${count.alert ? " alert" : ""}`} aria-label={count.label}>{count.value}</span>}
  </Link>;
}
