"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IChat, ICornerDownLeft, IDocs, IKeyboard, ISearch, IUsers } from "@/components/Icons";
import { visibleGroups } from "@/components/shell/nav";

export type PaletteData = {
  documents: { id: string; title: string; client?: string; type?: string }[];
  clients: { id: string; name: string; sector?: string }[];
  research?: { id: string; title: string; updatedAt: string }[];
};

type Item = { id: string; group: string; label: string; hint?: string; Icon: typeof IDocs; keywords?: string; run: () => void };

/** Diacritic-insensitive: "c" matches "č"/"ć", "d" matches "đ". */
export function fold(value: string) {
  return value.toLocaleLowerCase("hr").replace(/đ/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function matches(query: string, item: Item) {
  if (!query) return true;
  const haystack = fold(`${item.label} ${item.hint ?? ""} ${item.keywords ?? ""}`);
  return fold(query).split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}

export default function CommandPalette({ open, onClose, data, features, actions }: {
  open: boolean;
  onClose: () => void;
  data: PaletteData;
  features?: string[];
  actions: { label: string; Icon: typeof IDocs; kbd?: string; run: () => void; keywords?: string }[];
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      origin.current = document.activeElement as HTMLElement;
      setQuery(""); setIndex(0);
      el.showModal();
      requestAnimationFrame(() => input.current?.focus());
    }
    if (!open && el.open) { el.close(); origin.current?.focus(); }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => { onClose(); router.push(href); };
    const pages: Item[] = visibleGroups(features).flatMap((group) => group.links.map((link) => ({ id: `page:${link.href}`, group: "Skoči na", label: link.label, hint: group.label, Icon: link.Icon, run: go(link.href) })));
    pages.push({ id: "page:/racun", group: "Skoči na", label: "Moj račun", hint: "Ured", Icon: IUsers, keywords: "lozinka profil", run: go("/racun") });
    const acts: Item[] = actions.map((action) => ({ id: `action:${action.label}`, group: "Radnje", label: action.label, hint: action.kbd ? `Prečac ${action.kbd}` : undefined, Icon: action.Icon, keywords: action.keywords, run: () => { onClose(); action.run(); } }));
    const docs: Item[] = data.documents.map((doc) => ({ id: `doc:${doc.id}`, group: "Dokumenti", label: doc.title, hint: [doc.type, doc.client].filter(Boolean).join(" · "), Icon: IDocs, run: go(`/dokumenti/${doc.id}`) }));
    const research: Item[] = (data.research ?? []).map((t) => ({ id: `research:${t.id}`, group: "Istraživanja", label: t.title, hint: "Pravna pitanja", Icon: IChat, run: go(`/pitanja?nit=${t.id}`) }));
    const clients: Item[] = data.clients.map((client) => ({ id: `client:${client.id}`, group: "Klijenti", label: client.name, hint: client.sector && client.sector !== "—" ? client.sector : undefined, Icon: IUsers, run: go(`/klijenti/${client.id}`) }));
    return [...acts, ...pages, ...docs, ...research, ...clients];
  }, [actions, data, features, onClose, router]);

  const results = useMemo(() => {
    const filtered = items.filter((item) => matches(query, item));
    // Without a query keep the list short: actions, pages and the five most recent documents.
    if (!query) {
      let docCount = 0;
      let researchCount = 0;
      return filtered.filter((item) => item.group !== "Klijenti" && (item.group !== "Dokumenti" || docCount++ < 5) && (item.group !== "Istraživanja" || researchCount++ < 3));
    }
    return filtered.slice(0, 40);
  }, [items, query]);

  useEffect(() => { setIndex(0); }, [query]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") { event.preventDefault(); setIndex((i) => Math.min(results.length - 1, i + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (event.key === "Enter") {
      event.preventDefault();
      const item = results[index];
      if (!item) return;
      if ((event.metaKey || event.ctrlKey) && item.id.startsWith("doc:")) { window.open(`/dokumenti/${item.id.slice(4)}`, "_blank", "noopener"); return; }
      item.run();
    }
  }

  let lastGroup = "";
  return <dialog ref={dialog} className="dialog palette" aria-label="Pretraži i skoči" onClose={() => { if (open) onClose(); }} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === dialog.current) onClose(); }}>
    <div className="palette-input">
      <ISearch aria-hidden="true" />
      <input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onKeyDown} placeholder="Pretražite dokumente, klijente ili radnje…" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={results[index] ? `palette-${index}` : undefined} aria-autocomplete="list" />
      <kbd>Esc</kbd>
    </div>
    <div ref={list} id="palette-list" className="palette-list" role="listbox" aria-label="Rezultati">
      {results.length === 0 && <div className="palette-empty">Nema rezultata za „{query}”.</div>}
      {results.map((item, i) => {
        const header = item.group !== lastGroup ? <div className="palette-group" role="presentation">{item.group}</div> : null;
        lastGroup = item.group;
        return <div key={item.id}>
          {header}
          <div id={`palette-${i}`} data-index={i} role="option" aria-selected={i === index} className="palette-item" onMouseMove={() => setIndex(i)} onClick={() => item.run()}>
            <item.Icon aria-hidden="true" />
            <span>{item.label}{item.hint && <small>{item.hint}</small>}</span>
            <ICornerDownLeft className="enter" size={16} aria-hidden="true" />
          </div>
        </div>;
      })}
    </div>
    <div className="palette-foot" aria-hidden="true">
      <span><kbd>↑</kbd><kbd>↓</kbd> odabir</span>
      <span><kbd>↵</kbd> otvori</span>
      <span><kbd>⌘</kbd><kbd>↵</kbd> nova kartica</span>
      <span className="push"><IKeyboard size={14} /> <kbd>?</kbd> svi prečaci</span>
    </div>
  </dialog>;
}

