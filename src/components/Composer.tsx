"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Button } from "@/components/Button";
import { IArrowRight, IStop } from "@/components/Icons";

export type ComposerHandle = { focus: () => void };

/** Auto-growing question box: Enter sends, Shift+Enter adds a line, Stop cancels a pending answer. */
const Composer = forwardRef<ComposerHandle, {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  busy: boolean;
  canSubmit?: boolean;
  label: string;
  placeholder: string;
  tools?: React.ReactNode;
  above?: React.ReactNode;
}>(function Composer({ value, onChange, onSubmit, onStop, busy, canSubmit, label, placeholder, tools, above }, ref) {
  const area = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => area.current?.focus() }));

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const ready = canSubmit ?? !!value.trim();
  return <form className="composer" onSubmit={(event) => { event.preventDefault(); if (!busy && ready) onSubmit(); }}>
    {above}
    <label className="sr-only" htmlFor={`composer-${label}`}>{label}</label>
    <textarea
      id={`composer-${label}`}
      ref={area}
      rows={1}
      value={value}
      maxLength={12000}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          if (!busy && ready) onSubmit();
        }
      }}
    />
    <div className="composer-tools">
      {tools}
      <span className="spacer" />
      <span className="hint" aria-hidden="true"><kbd>↵</kbd> pošalji · <kbd>⇧</kbd><kbd>↵</kbd> novi red</span>
      {busy && onStop
        ? <Button variant="secondary" iconOnly icon={<IStop />} className="comp-send" onClick={onStop}>Zaustavi odgovor</Button>
        : <Button type="submit" variant="primary" iconOnly icon={<IArrowRight />} className="comp-send" disabled={busy || !ready}>Pošalji pitanje</Button>}
    </div>
  </form>;
});

export default Composer;

export function Typing({ label }: { label: string }) {
  return <div className="bubble ai" role="status"><span className="typing"><i /><i /><i /><span>{label}</span></span></div>;
}
