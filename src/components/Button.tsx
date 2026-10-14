"use client";

import { forwardRef, useEffect, useState } from "react";
import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "subtle" | "danger" | "danger-solid";
export type ButtonSize = "sm" | "md" | "lg";

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon; replaced by a spinner while loading. */
  icon?: React.ReactNode;
  /** Trailing icon, e.g. a chevron for menus. */
  iconEnd?: React.ReactNode;
  /** Square icon-only button; children become the accessible label via aria-label. */
  iconOnly?: boolean;
  loading?: boolean;
  block?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function buttonClass({ variant = "secondary", size = "md", iconOnly, block, className }: Pick<Common, "variant" | "size" | "iconOnly" | "block" | "className">) {
  return ["btn", `btn-${variant}`, `btn-${size}`, iconOnly && "btn-icon", block && "btn-block", className].filter(Boolean).join(" ");
}

/** Show the spinner only after 150ms so fast actions do not flash. */
function useDelayed(on: boolean, delay = 150) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!on) { setShown(false); return; }
    const timer = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(timer);
  }, [on, delay]);
  return shown;
}

function Inner({ icon, iconEnd, loading, iconOnly, children }: Common) {
  const spinning = useDelayed(!!loading);
  return <>
    {spinning ? <span className="btn-spinner" aria-hidden="true" /> : icon}
    {iconOnly ? <span className="sr-only">{children}</span> : children}
    {iconEnd}
  </>;
}

type ButtonProps = Common & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, iconEnd, iconOnly, loading, block, className, children, type = "button", onClick, title, ...rest }, ref,
) {
  return <button
    ref={ref}
    type={type}
    className={buttonClass({ variant, size, iconOnly, block, className })}
    aria-busy={loading || undefined}
    title={title ?? (iconOnly && typeof children === "string" ? children : undefined)}
    onClick={loading ? (event) => event.preventDefault() : onClick}
    {...rest}
  ><Inner icon={icon} iconEnd={iconEnd} loading={loading} iconOnly={iconOnly}>{children}</Inner></button>;
});

type LinkProps = Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children">;

export function ButtonLink({ variant, size, icon, iconEnd, iconOnly, block, className, children, href, title, ...rest }: LinkProps) {
  return <Link
    href={href}
    className={buttonClass({ variant, size, iconOnly, block, className })}
    title={title ?? (iconOnly && typeof children === "string" ? children : undefined)}
    {...rest}
  ><Inner icon={icon} iconEnd={iconEnd} iconOnly={iconOnly}>{children}</Inner></Link>;
}
