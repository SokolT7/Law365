import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { IChevronRight } from "@/components/Icons";
import { SETTINGS_LINKS, allowed } from "@/components/shell/nav";
import ShortcutsRow from "@/components/shell/ShortcutsRow";
import { workspaceSession } from "@/lib/workspace";

export const dynamic = "force-dynamic";

/** Everything that is set once and rarely changed, out of the everyday menu. */
export default async function SettingsPage() {
  const { firm } = await workspaceSession();
  const links = allowed(SETTINGS_LINKS, [...firm.features]);
  return <>
    <PageHeader title="Postavke" />
    <div className="content">
      <nav className="card settings-list" aria-label="Postavke">
        {links.map(({ href, label, Icon }) => <Link key={href} href={href} className="settings-row">
          <Icon aria-hidden="true" /><span>{label}</span><IChevronRight className="settings-chev" aria-hidden="true" />
        </Link>)}
        <ShortcutsRow />
      </nav>
    </div>
  </>;
}
