"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IChat, IChevronDown, IKeyboard, ILock, ILogout, IPanelLeft, IPlus, IShield, IUpload, IUser, IUsers } from "@/components/Icons";
import Logo from "@/components/Logo";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Feedback";
import { useWorkspace } from "@/components/shell/WorkspaceContext";
import { isActive, visibleGroups } from "@/components/shell/nav";
import ClientScope from "@/components/shell/ClientScope";

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

export default function Sidebar({ clients = [], clientScope = null, firmName, userName, userRole, features, counts = {}, open, onClose, collapsed, onToggleCollapse }: {
  clients?: { id: string; name: string }[];
  clientScope?: { id: string; name: string } | null;
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
  const router = useRouter();
  const toast = useToast();
  const workspace = useWorkspace();
  const asideRef = useRef<HTMLElement>(null);
  const newMenu = usePopover();
  const profileMenu = usePopover();
  const [loggingOut, setLoggingOut] = useState(false);
  const has = (key: string) => !features || features.includes(key);

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

  const newItems = [
    has("documents") && { label: "Učitaj dokument", Icon: IUpload, kbd: "U", run: () => workspace?.openUpload() },
    has("contract_review") && has("documents") && { label: "Nova provjera ugovora", Icon: IShield, run: () => workspace?.openUpload({ contract: true }) },
    has("legal_questions") && { label: "Novo pravno pitanje", Icon: IChat, run: () => router.push("/pitanja") },
    has("clients") && { label: "Novi klijent", Icon: IUsers, run: () => router.push("/klijenti?novi=1") },
  ].filter(Boolean) as { label: string; Icon: typeof IUpload; kbd?: string; run: () => void }[];

  return (
    <>
      {open && <button className="nav-backdrop" tabIndex={-1} aria-label="Zatvori izbornik" onClick={onClose} />}
      <aside ref={asideRef} id="workspace-navigation" className={`sidebar${open ? " open" : ""}`} aria-label="Navigacija radnog prostora">
        <div className="side-head">
          <Link href="/" className="brand" aria-label="LTB Law — pregled ureda">
            <Logo size={30} />
            <span className="brand-name">LTB <span>Law</span></span>
          </Link>
          <Button variant="ghost" size="sm" iconOnly icon={<IPanelLeft />} className="side-collapse" onClick={onToggleCollapse} title={collapsed ? "Proširi izbornik  [" : "Sažmi izbornik  ["}>
            {collapsed ? "Proširi izbornik" : "Sažmi izbornik"}
          </Button>
        </div>

        <div className="brand-firm" title={firmName}>
          <span className="firm-mark" aria-hidden="true">{initialsOf(firmName) || "U"}</span>
          <span className="firm-text"><span>Radni prostor ureda</span><b>{firmName}</b></span>
        </div>

        <ClientScope clients={clients} active={clientScope} />

        {newItems.length > 0 && <div className="new-wrap" ref={newMenu.wrap}>
          <Button ref={newMenu.trigger} variant="primary" block icon={<IPlus />} aria-label="Novo" aria-haspopup="menu" aria-expanded={newMenu.open} onClick={() => newMenu.setOpen(!newMenu.open)} title={collapsed ? "Novo" : undefined}>
            <span className="new-label">Novo</span>
          </Button>
          {newMenu.open && <div className="menu down" role="menu" aria-label="Novo">
            {newItems.map(({ label, Icon, kbd, run }) => <button key={label} type="button" role="menuitem" className="menu-item" onClick={() => { newMenu.setOpen(false); onClose(); run(); }}>
              <Icon aria-hidden="true" />{label}{kbd && <kbd>{kbd}</kbd>}
            </button>)}
          </div>}
        </div>}

        <div className="side-body">
          <div className="side-body-inner">
            <nav className="nav" aria-label="Glavni izbornik">
              {visibleGroups(features).map((group) => <div className="nav-group" key={group.label}>
                <div className="nav-group-label">{group.label}</div>
                {group.links.map(({ href, label, Icon }) => {
                  const active = isActive(pathname, href);
                  const count = counts[href];
                  return <Link key={href} href={href} onClick={onClose} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined}>
                    <Icon aria-hidden="true" /><span className="nav-label">{label}</span>
                    {count && count.value > 0 && <span className={`nav-count${count.alert ? " alert" : ""}`} aria-label={count.label}>{count.value}</span>}
                  </Link>;
                })}
              </div>)}
            </nav>

            <div className="sidebar-foot" ref={profileMenu.wrap}>
              <div className="workspace-private"><ILock size={13} aria-hidden="true" /> Pristup po odobrenju</div>
              {profileMenu.open && <div className="menu up" role="menu" aria-label="Račun">
                <div className="menu-label">{userName}</div>
                <Link href="/racun" role="menuitem" className="menu-item" onClick={() => { profileMenu.setOpen(false); onClose(); }}><IUser aria-hidden="true" />Moj račun</Link>
                <button type="button" role="menuitem" className="menu-item" onClick={() => { profileMenu.setOpen(false); workspace?.openShortcuts(); }}><IKeyboard aria-hidden="true" />Prečaci tipkovnice<kbd>?</kbd></button>
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
