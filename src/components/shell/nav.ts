import { IDashboard, IDocs, IShield, IChat, IClock, IUsers, IFlag, IBook, ISpark, ISettings, IUser } from "@/components/Icons";

export type NavLink = { href: string; label: string; Icon: typeof IDocs; feature: string; key?: string; also?: string[] };

/** The menu: five everyday destinations. Everything else lives in Postavke. */
export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Početna", Icon: IDashboard, feature: "", key: "h" },
  { href: "/dokumenti", label: "Dokumenti", Icon: IDocs, feature: "documents", key: "d", also: ["/provjera"] },
  { href: "/klijenti", label: "Klijenti", Icon: IUsers, feature: "clients", key: "k" },
  { href: "/pitanja", label: "Pitanja", Icon: IChat, feature: "legal_questions", key: "p" },
  { href: "/propisi", label: "Propisi", Icon: IFlag, feature: "regulatory_tracking", key: "r" },
];

/** Pages listed on the Postavke page. */
export const SETTINGS_LINKS: NavLink[] = [
  { href: "/racun", label: "Moj račun", Icon: IUser, feature: "" },
  { href: "/izvori", label: "Izvori prava", Icon: IBook, feature: "source_settings", key: "i" },
  { href: "/asistenti", label: "Asistenti", Icon: ISpark, feature: "legal_questions" },
  { href: "/provjera/predlosci", label: "Predlošci provjere", Icon: IShield, feature: "contract_review" },
  { href: "/zapisnik", label: "Zapisnik aktivnosti", Icon: IClock, feature: "activity_log", key: "z" },
];

export const SETTINGS: NavLink = { href: "/postavke", label: "Postavke", Icon: ISettings, feature: "", also: SETTINGS_LINKS.map((link) => link.href) };

/** Every page search and shortcuts can jump to, including ones kept out of the menu. */
export const DESTINATIONS: NavLink[] = [
  ...NAV_LINKS,
  { href: "/provjera", label: "Provjera ugovora", Icon: IShield, feature: "contract_review", key: "u" },
  ...SETTINGS_LINKS,
  SETTINGS,
];

export function allowed<T extends { feature: string }>(links: T[], features?: string[]) {
  return links.filter((link) => !link.feature || !features || features.includes(link.feature));
}

/** The menu entry that owns a path: the longest matching prefix wins, so /provjera/predlosci belongs to Postavke. */
export function activeHref(pathname: string, links: NavLink[]) {
  let best = "", length = -1;
  for (const link of links) {
    for (const prefix of [link.href, ...(link.also ?? [])]) {
      const hit = prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`);
      if (hit && prefix.length > length) { best = link.href; length = prefix.length; }
    }
  }
  return best;
}
