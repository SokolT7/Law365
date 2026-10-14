"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useWorkspace, type NotificationItem } from "@/components/shell/WorkspaceContext";
import { IAlert, IBell, ICheckCircle, IClock, IFlag } from "@/components/Icons";

const ICON: Record<NotificationItem["kind"], { Icon: typeof IBell; tone: string }> = {
  analysis: { Icon: ICheckCircle, tone: "ok" }, error: { Icon: IAlert, tone: "hi" }, regulation: { Icon: IFlag, tone: "mid" }, processing: { Icon: IClock, tone: "info" },
};

function relative(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("hr-HR", { numeric: "auto" });
  if (minutes < 1) return "upravo";
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (minutes < 1440) return rtf.format(-Math.round(minutes / 60), "hour");
  return rtf.format(-Math.round(minutes / 1440), "day");
}

/** Bell with unread count; "read" is remembered per user in this browser only. */
export default function NotificationBell() {
  const workspace = useWorkspace();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string>("");
  const wrap = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const key = workspace ? `ltb:notifications-seen:${workspace.userId}` : "";
  // Fetched on mount, when opened and every minute so finished analyses appear without a reload.
  useEffect(() => {
    if (!workspace) return;
    let stopped = false;
    const load = () => fetch("/api/notifications", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((data) => { if (!stopped && data) setItems(data.notifications); }).catch(() => { /* keep last state */ });
    load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60000);
    window.addEventListener("ltb:notifications-refresh", load);
    return () => { stopped = true; clearInterval(timer); window.removeEventListener("ltb:notifications-refresh", load); };
  }, [workspace]);
  useEffect(() => { if (!key) return; try { setSeen(localStorage.getItem(key) ?? ""); } catch { /* storage unavailable */ } }, [key]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); wrap.current?.querySelector<HTMLButtonElement>("button")?.focus(); } };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const unread = useMemo(() => items.filter((n) => n.kind !== "processing" && n.at > seen).length, [items, seen]);
  if (!workspace) return null;
  const markRead = () => { const now = new Date().toISOString(); setSeen(now); try { localStorage.setItem(key, now); } catch { /* storage unavailable */ } };

  return <div className="notif" ref={wrap}>
    <button type="button" className="btn btn-ghost btn-md btn-icon notif-button" aria-haspopup="dialog" aria-expanded={open} aria-label={unread ? `Obavijesti, ${unread} nepročitanih` : "Obavijesti"} title="Obavijesti" onClick={() => { if (!open) window.dispatchEvent(new Event("ltb:notifications-refresh")); setOpen((v) => !v); }}>
      <IBell aria-hidden="true" />{unread > 0 && <span className="notif-count" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <div className="menu notif-panel" role="dialog" aria-label="Obavijesti">
      <div className="notif-head"><b>Obavijesti</b>{unread > 0 && <button type="button" className="link" onClick={markRead}>Označi sve pročitanim</button>}</div>
      {items.length ? <ul className="notif-list">{items.map((n) => {
        const { Icon, tone } = ICON[n.kind];
        return <li key={n.id}><Link href={n.href} className={`notif-item${n.kind !== "processing" && n.at > seen ? " unread" : ""}`} onClick={() => setOpen(false)}>
          <span className={`attention-icon ${tone}`} aria-hidden="true"><Icon /></span>
          <span className="notif-text"><b>{n.title}</b><span>{n.sub}</span></span>
          <time dateTime={n.at}>{relative(n.at)}</time>
        </Link></li>;
      })}</ul> : <p className="notif-empty"><ICheckCircle aria-hidden="true" />Nema novih obavijesti.</p>}
    </div>}
  </div>;
}
