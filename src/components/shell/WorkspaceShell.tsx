"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Sidebar, { type NavCounts } from "@/components/Sidebar";
import Logo from "@/components/Logo";
import { Button } from "@/components/Button";
import { IChat, IKeyboard, IMenu, IMore, IPanelLeft, ISearch, IShield, IUpload, IUsers } from "@/components/Icons";
import CommandPalette, { type PaletteData } from "@/components/shell/CommandPalette";
import UploadDialog from "@/components/shell/UploadDialog";
import { WorkspaceContext, type UploadOptions, type WorkspaceApi } from "@/components/shell/WorkspaceContext";
import NotificationBell from "@/components/shell/NotificationBell";
import { isActive, visibleGroups } from "@/components/shell/nav";

const COLLAPSE_KEY = "ltb:sidebar-collapsed";

function typingInField(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

const SHORTCUTS: [string, string[]][] = [
  ["Pretraži i skoči", ["⌘", "K"]],
  ["Učitaj dokument", ["U"]],
  ["Idi na Pregled", ["G", "H"]],
  ["Idi na Dokumente", ["G", "D"]],
  ["Idi na Klijente", ["G", "K"]],
  ["Idi na Pravna pitanja", ["G", "P"]],
  ["Idi na Propise", ["G", "R"]],
  ["Sažmi / proširi izbornik", ["["]],
  ["Pošalji pitanje", ["↵"]],
  ["Novi red u pitanju", ["⇧", "↵"]],
  ["Zatvori prozor ili izbornik", ["Esc"]],
  ["Prikaži prečace", ["?"]],
];

export default function WorkspaceShell({ children, firmName, userName, userRole, features, counts, palette, accent, userId, clientScope }: {
  children: React.ReactNode;
  firmName: string;
  userName: string;
  userRole: string;
  features: string[];
  counts: NavCounts;
  palette: PaletteData;
  accent?: string;
  userId: string;
  clientScope: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [upload, setUpload] = useState<{ open: boolean; options: UploadOptions }>({ open: false, options: {} });
  const [dragging, setDragging] = useState(false);
  const shortcuts = useRef<HTMLDialogElement>(null);
  const pendingG = useRef<number>(0);
  const has = useCallback((key: string) => features.includes(key), [features]);
  const canUpload = has("documents");

  useEffect(() => { try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1"); } catch { /* storage unavailable */ } }, []);
  const toggleCollapse = useCallback(() => setCollapsed((value) => {
    try { localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1"); } catch { /* storage unavailable */ }
    return !value;
  }), []);
  useEffect(() => { setDrawer(false); }, [pathname]);

  // While the workspace is scoped to a client, new uploads default to that client.
  const openUpload = useCallback((options: UploadOptions = {}) => { if (canUpload) setUpload({ open: true, options: { ...options, clientId: options.clientId ?? clientScope?.id } }); }, [canUpload, clientScope]);
  const openShortcuts = useCallback(() => { if (!shortcuts.current?.open) shortcuts.current?.showModal(); }, []);
  const api = useMemo<WorkspaceApi>(() => ({ openUpload, openPalette: () => setPaletteOpen(true), openShortcuts, canUpload, userId }), [openUpload, openShortcuts, canUpload, userId]);

  // Global keyboard shortcuts; single keys never fire while typing.
  useEffect(() => {
    const go: Record<string, string> = { h: "/", d: "/dokumenti", k: "/klijenti", p: "/pitanja", r: "/propisi", u: "/provjera", z: "/zapisnik", i: "/izvori" };
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen((value) => !value); return; }
      if (event.metaKey || event.ctrlKey || event.altKey || typingInField(event.target) || document.querySelector("dialog[open]")) return;
      const key = event.key.toLowerCase();
      if (Date.now() - pendingG.current < 900 && go[key]) {
        pendingG.current = 0;
        const target = visibleGroups(features).flatMap((g) => g.links).find((link) => link.href === go[key]);
        if (target) { event.preventDefault(); router.push(target.href); }
        return;
      }
      if (key === "g") { pendingG.current = Date.now(); return; }
      if (key === "[") { event.preventDefault(); toggleCollapse(); }
      else if (key === "u" && canUpload) { event.preventDefault(); openUpload(); }
      else if (event.key === "?") { event.preventDefault(); openShortcuts(); }
      else if (key === "/") { event.preventDefault(); setPaletteOpen(true); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [features, router, toggleCollapse, canUpload, openUpload, openShortcuts]);

  // Files dragged anywhere onto the workspace open the upload dialog.
  useEffect(() => {
    if (!canUpload) return;
    let depth = 0;
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const enter = (event: DragEvent) => { if (!hasFiles(event) || document.querySelector("dialog[open]")) return; depth++; setDragging(true); };
    const leave = (event: DragEvent) => { if (!hasFiles(event)) return; depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const over = (event: DragEvent) => { if (hasFiles(event) && !document.querySelector("dialog[open]")) event.preventDefault(); };
    const drop = (event: DragEvent) => {
      depth = 0; setDragging(false);
      // A local drop target (e.g. an upload card) already handled it.
      if (!hasFiles(event) || event.defaultPrevented || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length) openUpload({ files, contract: pathname.startsWith("/provjera"), clientId: pathname.match(/^\/klijenti\/([^/]+)/)?.[1] });
    };
    window.addEventListener("dragenter", enter); window.addEventListener("dragleave", leave); window.addEventListener("dragover", over); window.addEventListener("drop", drop);
    return () => { window.removeEventListener("dragenter", enter); window.removeEventListener("dragleave", leave); window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); };
  }, [canUpload, openUpload, pathname]);

  // Sticky header gains a hairline only once content scrolls beneath it.
  useEffect(() => {
    const onScroll = () => document.querySelector(".topbar")?.classList.toggle("scrolled", window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const paletteActions = useMemo(() => [
    canUpload && { label: "Učitaj dokument", Icon: IUpload, kbd: "U", keywords: "upload novi dodaj", run: () => openUpload() },
    canUpload && has("contract_review") && { label: "Nova provjera ugovora", Icon: IShield, keywords: "rizik ugovor", run: () => openUpload({ contract: true }) },
    has("legal_questions") && { label: "Novo pravno pitanje", Icon: IChat, keywords: "istraži pitaj", run: () => router.push("/pitanja") },
    has("clients") && { label: "Novi klijent", Icon: IUsers, keywords: "dodaj klijenta", run: () => router.push("/klijenti?novi=1") },
    { label: collapsed ? "Proširi izbornik" : "Sažmi izbornik", Icon: IPanelLeft, kbd: "[", run: toggleCollapse },
    { label: "Prečaci tipkovnice", Icon: IKeyboard, kbd: "?", run: openShortcuts },
  ].filter(Boolean) as { label: string; Icon: typeof IUpload; kbd?: string; keywords?: string; run: () => void }[], [canUpload, has, openUpload, router, collapsed, toggleCollapse, openShortcuts]);

  // Mobile tab bar: up to four primary destinations plus "Više".
  const preferred = ["/", "/dokumenti", "/pitanja", "/propisi", "/klijenti", "/provjera"];
  const tabs = visibleGroups(features).flatMap((g) => g.links).filter((link) => preferred.includes(link.href)).sort((a, b) => preferred.indexOf(a.href) - preferred.indexOf(b.href)).slice(0, 4);
  const accentStyle = { "--firm-accent": accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : undefined } as React.CSSProperties;

  return <WorkspaceContext.Provider value={api}>
    <div className={`app${collapsed ? " collapsed" : " expanded"}`} style={accentStyle}>
      <a className="skip-link" href="#main-content">Preskoči na sadržaj</a>
      <header className="mobile-bar">
        <Button variant="ghost" iconOnly icon={<IMenu />} className="menu-toggle" aria-controls="workspace-navigation" aria-expanded={drawer} onClick={() => setDrawer(true)}>Otvori izbornik</Button>
        <Link href="/" className="brand" aria-label="LTB Law — pregled ureda"><Logo size={26} /><span className="brand-name">LTB <span>Law</span></span></Link>
        <Button variant="ghost" iconOnly icon={<ISearch />} onClick={() => setPaletteOpen(true)}>Pretraži</Button>
        <NotificationBell />
        {canUpload && <Button variant="ghost" iconOnly icon={<IUpload />} onClick={() => openUpload()}>Učitaj dokument</Button>}
      </header>
      <Sidebar clients={palette.clients} clientScope={clientScope} firmName={firmName} userName={userName} userRole={userRole} features={features} counts={counts} open={drawer} onClose={() => setDrawer(false)} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <main id="main-content" className="main">{children}</main>
      <nav className="tabbar" aria-label="Brza navigacija">
        {tabs.map(({ href, short, Icon }) => {
          const active = isActive(pathname, href);
          const count = counts[href];
          return <Link key={href} href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            <Icon aria-hidden="true" />{short}{count && count.value > 0 && <span className="tab-badge" aria-label={count.label}>{count.value}</span>}
          </Link>;
        })}
        <button type="button" onClick={() => setDrawer(true)} aria-controls="workspace-navigation" aria-expanded={drawer}><IMore aria-hidden="true" />Više</button>
      </nav>
    </div>

    {dragging && <div className="drop-overlay" aria-hidden="true"><div><IUpload />Ispustite datoteke za učitavanje</div></div>}
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} data={palette} features={features} actions={paletteActions} />
    {canUpload && <UploadDialog open={upload.open} options={upload.options} onClose={() => setUpload((state) => ({ ...state, open: false }))} clients={palette.clients} features={features} />}
    <dialog ref={shortcuts} className="dialog" aria-labelledby="shortcuts-title" onClick={(event) => { if (event.target === shortcuts.current) shortcuts.current?.close(); }}>
      <div className="dialog-inner">
        <h2 id="shortcuts-title" className="dialog-title">Prečaci tipkovnice</h2>
        <dl className="shortcut-list">{SHORTCUTS.map(([label, keys]) => <div key={label} className="contents"><dt>{label}</dt><dd>{keys.map((key) => <kbd key={key}>{key}</kbd>)}</dd></div>)}</dl>
        <div className="dialog-actions"><Button variant="primary" onClick={() => shortcuts.current?.close()}>Zatvori</Button></div>
      </div>
    </dialog>
  </WorkspaceContext.Provider>;
}
