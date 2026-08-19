import { useState } from "react";
import type { AgendaItem } from "../types";
import { TYPE_KORT, TYPE_LABEL, URGENTIE_LABEL, URGENTIE_STIJL } from "../utils/labels";
import { vandaagIso } from "../utils/datum";
import { ItemForm, type ItemFormWaarden } from "./ItemForm";
import { IconBewerk, IconVerwijder, IconVink } from "./icons";

interface Props {
  item: AgendaItem;
  onToggle: (id: string) => void;
  onVerwijder: (id: string) => void;
  onBewerk: (id: string, waarden: ItemFormWaarden) => void;
}

export function ItemCard({ item, onToggle, onVerwijder, onBewerk }: Props) {
  const [bewerken, setBewerken] = useState(false);
  const stijl = URGENTIE_STIJL[item.urgentie];
  const isVandaag = item.datum === vandaagIso();

  if (bewerken) {
    return (
      <ItemForm
        initieel={item}
        onOpslaan={(waarden) => {
          onBewerk(item.id, waarden);
          setBewerken(false);
        }}
        onAnnuleren={() => setBewerken(false)}
      />
    );
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-md border-l-4 bg-paper p-3 shadow-sm ring-1 ring-line ${stijl.rand} ${
        item.afgerond ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={() => onToggle(item.id)}
        aria-label={item.afgerond ? "Markeer als niet afgerond" : "Markeer als afgerond"}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          item.afgerond
            ? "border-navy bg-navy text-white"
            : "border-line text-transparent hover:border-navy"
        }`}
      >
        <IconVink className="h-3 w-3" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm bg-navy-soft px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-navy">
            {TYPE_KORT[item.type]}
          </span>
          <span
            className={`truncate font-medium text-ink ${
              item.afgerond ? "line-through" : ""
            }`}
          >
            {item.titel}
          </span>
          {isVandaag && !item.afgerond && (
            <span className="rounded-sm bg-gold-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
              Vandaag
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span>{TYPE_LABEL[item.type]}</span>
          <span>·</span>
          <span className="font-mono">{item.tijd}</span>
          <span className={`rounded-sm px-1.5 py-0.5 font-medium ${stijl.badge}`}>
            {URGENTIE_LABEL[item.urgentie]}
          </span>
        </div>
        {item.notitie && (
          <p className="mt-1 text-sm text-ink-soft">{item.notitie}</p>
        )}
        {item.voorstel && (
          <div className="mt-2 rounded-sm bg-bg p-2 text-xs text-ink-soft ring-1 ring-line">
            <span className="font-medium text-ink">Voorstel akkoord:</span>{" "}
            {item.voorstel.tijdsinschatting}
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => setBewerken(true)}
          aria-label="Bewerken"
          className="rounded-sm p-1.5 text-ink-soft hover:bg-bg hover:text-ink"
        >
          <IconBewerk className="h-4 w-4" />
        </button>
        <button
          onClick={() => onVerwijder(item.id)}
          aria-label="Verwijderen"
          className="rounded-sm p-1.5 text-ink-soft hover:bg-urgentie-hoog-soft hover:text-urgentie-hoog"
        >
          <IconVerwijder className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
