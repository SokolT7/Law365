"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { IAlert, ICheckCircle, IInfo, IX } from "@/components/Icons";

/* ---------- Toasts ---------- */

type Tone = "success" | "error" | "info";
type ToastInput = { message: string; tone?: Tone; action?: { label: string; onClick: () => void }; duration?: number };
type ToastItem = ToastInput & { id: number; leaving?: boolean };

/* ---------- Confirm ---------- */

type ConfirmInput = { title: string; body?: React.ReactNode; confirmLabel: string; cancelLabel?: string; destructive?: boolean };

const FeedbackContext = createContext<{ toast: (input: ToastInput) => void; confirm: (input: ConfirmInput) => Promise<boolean> } | null>(null);

export function useToast() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useToast requires FeedbackProvider.");
  return context.toast;
}

export function useConfirm() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useConfirm requires FeedbackProvider.");
  return context.confirm;
}

const ICON: Record<Tone, React.ReactNode> = {
  success: <ICheckCircle size={18} aria-hidden="true" />,
  error: <IAlert size={18} aria-hidden="true" />,
  info: <IInfo size={18} aria-hidden="true" />,
};

function Toast({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
  const remaining = useRef(item.duration ?? (item.action ? 8000 : 4500));
  const started = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useCallback(() => { started.current = Date.now(); timer.current = setTimeout(() => onClose(item.id), remaining.current); }, [item.id, onClose]);
  const pause = () => { clearTimeout(timer.current); remaining.current -= Date.now() - started.current; };
  useEffect(() => { start(); return () => clearTimeout(timer.current); }, [start]);
  return <div className={`toast toast-${item.tone ?? "success"}${item.leaving ? " leaving" : ""}`} onMouseEnter={pause} onMouseLeave={start} onFocus={pause} onBlur={start}>
    <span className="toast-icon">{ICON[item.tone ?? "success"]}</span>
    <span className="toast-message">{item.message}</span>
    {item.action && <button type="button" className="toast-action" onClick={() => { item.action?.onClick(); onClose(item.id); }}>{item.action.label}</button>}
    <button type="button" className="toast-close" aria-label="Zatvori obavijest" onClick={() => onClose(item.id)}><IX size={14} /></button>
  </div>;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const [pending, setPending] = useState<(ConfirmInput & { resolve: (value: boolean) => void }) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);

  const close = useCallback((id: number) => {
    setToasts((all) => all.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), 160);
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setToasts((all) => [...all.slice(-2), { ...input, id }]);
  }, []);

  const confirm = useCallback((input: ConfirmInput) => new Promise<boolean>((resolve) => {
    origin.current = document.activeElement as HTMLElement;
    setPending({ ...input, resolve });
  }), []);

  useEffect(() => {
    if (!pending) return;
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    // Destructive dialogs focus the safe choice first.
    el?.querySelector<HTMLButtonElement>(pending.destructive ? "[data-cancel]" : "[data-confirm]")?.focus();
  }, [pending]);

  function settle(value: boolean) {
    pending?.resolve(value);
    dialog.current?.close();
    setPending(null);
    origin.current?.focus();
  }

  return <FeedbackContext.Provider value={{ toast, confirm }}>
    {children}
    <div className="toast-region" aria-live="polite" aria-relevant="additions">
      {toasts.map((item) => <Toast key={item.id} item={item} onClose={close} />)}
    </div>
    <dialog ref={dialog} className="dialog" aria-labelledby="confirm-title" onCancel={(event) => { event.preventDefault(); settle(false); }} onClick={(event) => { if (event.target === dialog.current) settle(false); }}>
      {pending && <div className="dialog-inner">
        <h2 id="confirm-title" className="dialog-title">{pending.title}</h2>
        {pending.body && <div className="dialog-body">{pending.body}</div>}
        <div className="dialog-actions">
          <Button data-cancel onClick={() => settle(false)}>{pending.cancelLabel ?? "Odustani"}</Button>
          <Button data-confirm variant={pending.destructive ? "danger-solid" : "primary"} onClick={() => settle(true)}>{pending.confirmLabel}</Button>
        </div>
      </div>}
    </dialog>
  </FeedbackContext.Provider>;
}
