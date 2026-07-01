"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IDashboard,
  IDocs,
  IShield,
  IChat,
  IClock,
  IDatabase,
  IUsers,
  IFlag,
} from "@/components/Icons";
import type { Mode } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Nadzorna ploča", Icon: IDashboard },
  { href: "/dokumenti", label: "Dokumenti", Icon: IDocs },
  { href: "/klijenti", label: "Klijenti", Icon: IUsers },
  { href: "/provjera", label: "Provjera ugovora", Icon: IShield },
  { href: "/pitanja", label: "Pitanja i odgovori", Icon: IChat },
  { href: "/propisi", label: "Praćenje propisa", Icon: IFlag },
  { href: "/izvori", label: "Izvori prava", Icon: IDatabase },
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

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">LTB</div>
        <div>
          <div className="brand-name">LTBLaw</div>
        </div>
      </div>
      <div className="brand-firm">
        × <b>{firmName}</b>
      </div>

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
    </aside>
  );
}
