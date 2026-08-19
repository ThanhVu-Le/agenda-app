import { useMemo, useState } from "react";
import type { AgendaItem } from "../types";
import { naarIso, vandaagIso } from "../utils/datum";
import { ItemCard } from "./ItemCard";
import { ItemForm, type ItemFormWaarden } from "./ItemForm";
import { MonthView } from "./MonthView";

interface Props {
  items: AgendaItem[];
  onToggle: (id: string) => void;
  onVerwijder: (id: string) => void;
  onBewerk: (id: string, waarden: ItemFormWaarden) => void;
  onToevoegen: (waarden: ItemFormWaarden) => void;
}

type Modus = "dag" | "week" | "maand";

const WEEKDAG_LANG = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
];

function startVanWeek(datumIso: string): Date {
  const d = new Date(`${datumIso}T00:00:00`);
  const dag = d.getDay();
  const verschilTotMaandag = dag === 0 ? 6 : dag - 1;
  d.setDate(d.getDate() - verschilTotMaandag);
  return d;
}

export function AgendaView({ items, onToggle, onVerwijder, onBewerk, onToevoegen }: Props) {
  const [modus, setModus] = useState<Modus>("dag");
  const vandaag = vandaagIso();
  const [anker, setAnker] = useState<string>(vandaag);
  const [geselecteerdeDag, setGeselecteerdeDag] = useState<string>(vandaag);
  const [toevoegen, setToevoegen] = useState(false);

  function navigeer(richting: -1 | 1) {
    if (modus === "maand") {
      const d = new Date(`${anker}T00:00:00`);
      d.setDate(1);
      d.setMonth(d.getMonth() + richting);
      setAnker(naarIso(d));
      return;
    }
    const stap = modus === "week" ? richting * 7 : richting;
    const d = new Date(`${anker}T00:00:00`);
    d.setDate(d.getDate() + stap);
    setAnker(naarIso(d));
  }

  function gaNaarVandaag() {
    setAnker(vandaag);
    setGeselecteerdeDag(vandaag);
  }

  const weekDagen = useMemo(() => {
    const start = startVanWeek(anker);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return naarIso(d);
    });
  }, [anker]);

  const opVandaag = useMemo(() => {
    if (modus === "dag") return anker === vandaag;
    if (modus === "week") return weekDagen.includes(vandaag);
    const d = new Date(`${anker}T00:00:00`);
    const nu = new Date(`${vandaag}T00:00:00`);
    return d.getFullYear() === nu.getFullYear() && d.getMonth() === nu.getMonth();
  }, [modus, anker, weekDagen, vandaag]);

  const itemsPerDag = (datumIso: string) =>
    items
      .filter((i) => i.datum === datumIso)
      .sort((a, b) => a.tijd.localeCompare(b.tijd));

  const dagLabel = useMemo(() => {
    const d = new Date(`${anker}T00:00:00`);
    const naam = WEEKDAG_LANG[d.getDay()];
    const datumTekst = d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
    return `${naam.charAt(0).toUpperCase()}${naam.slice(1)} ${datumTekst}`;
  }, [anker]);

  const geselecteerdeDagLabel = useMemo(() => {
    const d = new Date(`${geselecteerdeDag}T00:00:00`);
    const naam = WEEKDAG_LANG[d.getDay()];
    const datumTekst = d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
    return `${naam.charAt(0).toUpperCase()}${naam.slice(1)} ${datumTekst}`;
  }, [geselecteerdeDag]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-md border border-line bg-bg-dark/50 p-1">
          {(["dag", "week", "maand"] as Modus[]).map((m) => (
            <button
              key={m}
              onClick={() => setModus(m)}
              className={`rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                modus === m ? "bg-navy text-white" : "text-ink-soft hover:bg-bg-dark"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigeer(-1)}
            aria-label="Vorige"
            className="rounded-sm px-2 py-1.5 text-ink-soft hover:bg-bg-dark"
          >
            ‹
          </button>
          {!opVandaag && (
            <button
              onClick={gaNaarVandaag}
              className="rounded-sm px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-navy hover:bg-navy-soft"
            >
              Naar vandaag
            </button>
          )}
          <button
            onClick={() => navigeer(1)}
            aria-label="Volgende"
            className="rounded-sm px-2 py-1.5 text-ink-soft hover:bg-bg-dark"
          >
            ›
          </button>
        </div>

        <button
          onClick={() => setToevoegen(true)}
          className="rounded-sm bg-navy px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-navy-dark"
        >
          + Nieuw item
        </button>
      </div>

      {toevoegen && (
        <ItemForm
          initieel={{
            id: "",
            titel: "",
            type: "taak",
            datum: modus === "maand" ? geselecteerdeDag : anker,
            tijd: "10:00",
            urgentie: "midden",
            afgerond: false,
          }}
          onOpslaan={(waarden) => {
            onToevoegen(waarden);
            setToevoegen(false);
          }}
          onAnnuleren={() => setToevoegen(false)}
        />
      )}

      {modus === "dag" && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {anker === vandaag ? `Vandaag — ${dagLabel}` : dagLabel}
          </h2>
          <DagLijst items={itemsPerDag(anker)} {...{ onToggle, onVerwijder, onBewerk }} />
        </div>
      )}

      {modus === "week" && (
        <div className="space-y-5">
          {weekDagen.map((datumIso) => (
            <div key={datumIso} className="space-y-2">
              <h2
                className={`text-xs font-semibold uppercase tracking-wide ${
                  datumIso === vandaag ? "text-navy" : "text-ink-soft"
                }`}
              >
                {formatteerWeekdagHeader(datumIso, vandaag)}
              </h2>
              <DagLijst
                items={itemsPerDag(datumIso)}
                {...{ onToggle, onVerwijder, onBewerk }}
                compact
              />
            </div>
          ))}
        </div>
      )}

      {modus === "maand" && (
        <div className="space-y-4">
          <MonthView
            maandAnker={anker}
            geselecteerd={geselecteerdeDag}
            vandaag={vandaag}
            items={items}
            onSelecteer={setGeselecteerdeDag}
          />
          <div className="space-y-2 border-t border-line pt-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {geselecteerdeDag === vandaag ? `Vandaag — ${geselecteerdeDagLabel}` : geselecteerdeDagLabel}
            </h2>
            <DagLijst items={itemsPerDag(geselecteerdeDag)} {...{ onToggle, onVerwijder, onBewerk }} />
          </div>
        </div>
      )}
    </div>
  );
}

function formatteerWeekdagHeader(datumIso: string, vandaag: string): string {
  const d = new Date(`${datumIso}T00:00:00`);
  const naam = WEEKDAG_LANG[d.getDay()];
  const datumTekst = d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
  const prefix = `${naam.charAt(0).toUpperCase()}${naam.slice(1)} ${datumTekst}`;
  return datumIso === vandaag ? `${prefix} · vandaag` : prefix;
}

function DagLijst({
  items,
  onToggle,
  onVerwijder,
  onBewerk,
  compact,
}: {
  items: AgendaItem[];
  onToggle: (id: string) => void;
  onVerwijder: (id: string) => void;
  onBewerk: (id: string, waarden: ItemFormWaarden) => void;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className={`text-sm text-ink-soft/70 ${compact ? "" : "py-4"}`}>
        Niets gepland.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onToggle={onToggle}
          onVerwijder={onVerwijder}
          onBewerk={onBewerk}
        />
      ))}
    </div>
  );
}
