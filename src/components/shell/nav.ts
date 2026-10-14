import { IDashboard, IDocs, IShield, IChat, IClock, IUsers, IFlag, IBook, ISpark } from "@/components/Icons";

export type NavLink = { href: string; label: string; short: string; Icon: typeof IDocs; feature: string; key?: string };

export const NAV_GROUPS: { label: string; links: NavLink[] }[] = [
  { label: "Pregled", links: [{ href: "/", label: "Radni prostor", short: "Pregled", Icon: IDashboard, feature: "" }] },
  { label: "Rad s dokumentima", links: [
    { href: "/dokumenti", label: "Dokumenti", short: "Dokumenti", Icon: IDocs, feature: "documents", key: "d" },
    { href: "/klijenti", label: "Klijenti", short: "Klijenti", Icon: IUsers, feature: "clients", key: "k" },
    { href: "/provjera", label: "Provjera ugovora", short: "Provjera", Icon: IShield, feature: "contract_review", key: "u" },
  ] },
  { label: "Pravno istraživanje", links: [
    { href: "/pitanja", label: "Pravna pitanja", short: "Pitanja", Icon: IChat, feature: "legal_questions", key: "p" },
    { href: "/propisi", label: "Praćenje propisa", short: "Propisi", Icon: IFlag, feature: "regulatory_tracking", key: "r" },
    { href: "/asistenti", label: "Asistenti", short: "Asistenti", Icon: ISpark, feature: "legal_questions" },
  ] },
  { label: "Ured", links: [
    { href: "/izvori", label: "Izvori prava", short: "Izvori", Icon: IBook, feature: "source_settings", key: "i" },
    { href: "/zapisnik", label: "Zapisnik aktivnosti", short: "Zapisnik", Icon: IClock, feature: "activity_log", key: "z" },
  ] },
];

export function visibleGroups(features?: string[]) {
  return NAV_GROUPS
    .map((group) => ({ ...group, links: group.links.filter((link) => !link.feature || !features || features.includes(link.feature)) }))
    .filter((group) => group.links.length > 0);
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
