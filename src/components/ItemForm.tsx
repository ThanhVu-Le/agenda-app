import { useState } from "react";
import type { AgendaItem, ItemType, Urgentie } from "../types";
import { TYPE_LABEL, URGENTIE_LABEL } from "../utils/labels";
import { vandaagIso } from "../utils/datum";

export interface ItemFormWaarden {
  titel: string;
  type: ItemType;
  datum: string;
  tijd: string;
  urgentie: Urgentie;
  notitie: string;
}

interface Props {
  initieel?: AgendaItem;
  onOpslaan: (waarden: ItemFormWaarden) => void;
  onAnnuleren: () => void;
}

const TYPES: ItemType[] = ["afspraak", "taak", "uitzoek", "analyse"];
const URGENTIES: Urgentie[] = ["laag", "midden", "hoog"];

const VELD =
  "w-full rounded-sm border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy-soft";
const LABEL = "mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft";

export function ItemForm({ initieel, onOpslaan, onAnnuleren }: Props) {
  const [waarden, setWaarden] = useState<ItemFormWaarden>({
    titel: initieel?.titel ?? "",
    type: initieel?.type ?? "taak",
    datum: initieel?.datum ?? vandaagIso(),
    tijd: initieel?.tijd ?? "10:00",
    urgentie: initieel?.urgentie ?? "midden",
    notitie: initieel?.notitie ?? "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!waarden.titel.trim()) return;
    onOpslaan(waarden);
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-md border border-line bg-paper p-4 shadow-sm"
    >
      <div>
        <label className={LABEL}>Titel</label>
        <input
          autoFocus
          value={waarden.titel}
          onChange={(e) => setWaarden({ ...waarden, titel: e.target.value })}
          className={VELD}
          placeholder="Bijv. Klantgesprek voorbereiden"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Type</label>
          <select
            value={waarden.type}
            onChange={(e) =>
              setWaarden({ ...waarden, type: e.target.value as ItemType })
            }
            className={VELD}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Urgentie</label>
          <select
            value={waarden.urgentie}
            onChange={(e) =>
              setWaarden({ ...waarden, urgentie: e.target.value as Urgentie })
            }
            className={VELD}
          >
            {URGENTIES.map((u) => (
              <option key={u} value={u}>
                {URGENTIE_LABEL[u]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Datum</label>
          <input
            type="date"
            value={waarden.datum}
            onChange={(e) => setWaarden({ ...waarden, datum: e.target.value })}
            className={VELD}
          />
        </div>

        <div>
          <label className={LABEL}>Tijd</label>
          <input
            type="time"
            value={waarden.tijd}
            onChange={(e) => setWaarden({ ...waarden, tijd: e.target.value })}
            className={VELD}
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>Notitie (optioneel)</label>
        <textarea
          value={waarden.notitie}
          onChange={(e) => setWaarden({ ...waarden, notitie: e.target.value })}
          rows={2}
          className={`${VELD} resize-none`}
          placeholder="Extra context..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onAnnuleren}
          className="rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft hover:bg-bg"
        >
          Annuleren
        </button>
        <button
          type="submit"
          className="rounded-sm bg-navy px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-navy-dark"
        >
          Opslaan
        </button>
      </div>
    </form>
  );
}
