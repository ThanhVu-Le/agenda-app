import type { AgendaItem, Urgentie } from "../types";
import { URGENTIE_LABEL, URGENTIE_STIJL } from "../utils/labels";

interface Props {
  items: AgendaItem[];
}

const URGENTIES: Urgentie[] = ["laag", "midden", "hoog"];

export function UrgencyOverview({ items }: Props) {
  const open = items.filter((i) => !i.afgerond);
  const afgerond = items.filter((i) => i.afgerond).length;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-paper p-3 shadow-sm">
      {URGENTIES.map((u) => {
        const aantal = open.filter((i) => i.urgentie === u).length;
        const stijl = URGENTIE_STIJL[u];
        return (
          <div key={u} className="flex items-center gap-2 rounded-sm px-2.5 py-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${stijl.stip}`} />
            <span className="text-xs uppercase tracking-wide text-ink-soft">
              {URGENTIE_LABEL[u]}{" "}
              <span className="font-semibold text-ink">{aantal}</span>
            </span>
          </div>
        );
      })}
      <div className="ml-auto flex items-center gap-2 rounded-sm bg-bg px-2.5 py-1.5">
        <span className="text-xs uppercase tracking-wide text-ink-soft">
          Afgerond <span className="font-semibold text-ink">{afgerond}</span>
        </span>
      </div>
    </div>
  );
}
