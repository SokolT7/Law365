"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IDashboard,
  IDocs,
  IShield,
  IChat,
  IClock,
  IUsers,
  IFlag,
} from "@/components/Icons";
import Logo from "@/components/Logo";
import type { Mode } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Nadzorna ploča", Icon: IDashboard },
  { href: "/dokumenti", label: "Dokumenti", Icon: IDocs },
  { href: "/klijenti", label: "Klijenti", Icon: IUsers },
  { href: "/provjera", label: "Provjera ugovora", Icon: IShield },
  { href: "/pitanja", label: "Pravna pitanja", Icon: IChat },
  { href: "/propisi", label: "Praćenje propisa", Icon: IFlag },
  { href: "/zapisnik", label: "Zapisnik aktivnosti", Icon: IClock },
];

export default function Sidebar({
  firmName,
  mode,
  userName,
  userRole,
}: {
  firmName: string;
  mode: Mode;
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // zatvori izbornik pri promjeni stranice
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="side-head">
        <div className="brand">
          <div className="brand-mark">
            <Logo size={38} />
          </div>
          <div>
            <div className="brand-name">LTBLaw</div>
          </div>
        </div>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-label={open ? "Zatvori izbornik" : "Otvori izbornik"}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="mt-bar" />
          <span className="mt-bar" />
        </button>
      </div>
      <div className="brand-firm">
        × <b>{firmName}</b>
      </div>

      <div className="side-body">
        <div className="side-body-inner">
          <nav className="nav">
            {LINKS.map(({ href, label, Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`}>
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-foot">
            <div className={`mode-pill ${mode === "live" ? "mode-live" : "mode-demo"}`}>
              <span className="dot" />
              {mode === "live" ? "Aktivni AI (Claude)" : "Demo način rada"}
            </div>
            <div className="who">
              <b>{userName}</b>
              {userRole}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
