import { useMemo } from "react";
import type { AgendaItem, Urgentie } from "../types";
import { naarIso } from "../utils/datum";
import { URGENTIE_STIJL } from "../utils/labels";

interface Props {
  maandAnker: string; // een willekeurige datum binnen de te tonen maand
  geselecteerd: string;
  vandaag: string;
  items: AgendaItem[];
  onSelecteer: (datumIso: string) => void;
}

const WEEKDAG_KORT = ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"];
const URGENTIE_WAARDE: Record<Urgentie, number> = { laag: 0, midden: 1, hoog: 2 };

function beginVanKalenderGrid(maandAnker: string): Date {
  const d = new Date(`${maandAnker}T00:00:00`);
  d.setDate(1);
  const dag = d.getDay();
  const offset = dag === 0 ? 6 : dag - 1;
  d.setDate(d.getDate() - offset);
  return d;
}

function hoogsteUrgentie(items: AgendaItem[]): Urgentie | null {
  if (items.length === 0) return null;
  return items.reduce<Urgentie>(
    (hoogst, i) => (URGENTIE_WAARDE[i.urgentie] > URGENTIE_WAARDE[hoogst] ? i.urgentie : hoogst),
    items[0].urgentie
  );
}

export function MonthView({ maandAnker, geselecteerd, vandaag, items, onSelecteer }: Props) {
  const referentie = new Date(`${maandAnker}T00:00:00`);
  const doelMaand = referentie.getMonth();
  const maandLabel = referentie.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

  const dagen = useMemo(() => {
    const start = beginVanKalenderGrid(maandAnker);
    const daysInMonth = new Date(referentie.getFullYear(), doelMaand + 1, 0).getDate();
    const eersteVanMaand = new Date(referentie.getFullYear(), doelMaand, 1);
    const offset = Math.round((eersteVanMaand.getTime() - start.getTime()) / 86_400_000);
    const totaalCellen = Math.ceil((offset + daysInMonth) / 7) * 7;

    return Array.from({ length: totaalCellen }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { iso: naarIso(d), inMaand: d.getMonth() === doelMaand, dagNummer: d.getDate() };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maandAnker]);

  const itemsPerDatum = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of items) {
      const lijst = map.get(item.datum) ?? [];
      lijst.push(item);
      map.set(item.datum, lijst);
    }
    return map;
  }, [items]);

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{maandLabel}</h2>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold tracking-wide text-ink-soft">
        {WEEKDAG_KORT.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dagen.map(({ iso, inMaand, dagNummer }) => {
          const dagItems = itemsPerDatum.get(iso) ?? [];
          const urgentie = hoogsteUrgentie(dagItems);
          const isVandaag = iso === vandaag;
          const isGeselecteerd = iso === geselecteerd;

          return (
            <button
              key={iso}
              disabled={!inMaand}
              onClick={() => onSelecteer(iso)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-sm text-sm transition ${
                !inMaand
                  ? "text-ink-soft/30"
                  : isGeselecteerd
                  ? "bg-navy font-semibold text-white"
                  : isVandaag
                  ? "bg-navy-soft font-semibold text-navy ring-1 ring-navy/40"
                  : "text-ink hover:bg-bg-dark/60"
              }`}
            >
              <span>{dagNummer}</span>
              {urgentie && inMaand && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isGeselecteerd ? "bg-white" : URGENTIE_STIJL[urgentie].stip
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
