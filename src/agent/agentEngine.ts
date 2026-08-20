import type { AgendaItem, ItemType, Urgentie } from "../types";
import { dagdeelGroet, formatDatumLabel } from "../utils/datum";

const URGENTIE_WAARDE: Record<Urgentie, number> = { laag: 0, midden: 1, hoog: 2 };

const TYPE_LABEL: Record<ItemType, string> = {
  afspraak: "afspraak",
  taak: "taak",
  uitzoek: "uitzoek-opdracht",
  analyse: "analyse",
};

/** Sorteert openstaande items van minst naar meest urgent (urgentieniveau eerst, dan hoe dichterbij de datum). */
export function sorteerOpUrgentie(items: AgendaItem[]): AgendaItem[] {
  return [...items].sort((a, b) => {
    const verschil = URGENTIE_WAARDE[a.urgentie] - URGENTIE_WAARDE[b.urgentie];
    if (verschil !== 0) return verschil;
    return `${a.datum}${a.tijd}`.localeCompare(`${b.datum}${b.tijd}`);
  });
}

export function genereerBriefing(items: AgendaItem[]): string {
  const open = sorteerOpUrgentie(items.filter((i) => !i.afgerond));
  const groet = dagdeelGroet();

  if (open.length === 0) {
    return `${groet}! Je agenda is helemaal leeg op dit moment — een mooi rustpunt. Zin om iets nieuws op te pakken, of geniet gewoon van de ruimte.`;
  }

  const regels = open.map((item) => {
    const label = formatDatumLabel(item.datum);
    return `- **${item.titel}** (${TYPE_LABEL[item.type]}) — ${label} om ${item.tijd}`;
  });

  const meestUrgent = open[open.length - 1];
  const afsluiter =
    open.length === 1
      ? `Met maar één ding op je bordje kun je rustig aan **${meestUrgent.titel}** beginnen wanneer het jou uitkomt.`
      : `Ik zou vandaag rustig beginnen en richting **${meestUrgent.titel}** toewerken — dat heeft de meeste urgentie.`;

  return [
    `${groet}! Hier is je overzicht, van minst naar meest urgent:`,
    "",
    ...regels,
    "",
    afsluiter,
  ].join("\n");
}

// ---------- Agent-actie contract (gedeeld met de backend-proxy in server/) ----------

export type CommandoActie =
  | { soort: "geen" }
  | { soort: "verplaats"; itemId: string; nieuweTijd: string; nieuweDatum?: string }
  | { soort: "afronden"; itemId: string }
  | { soort: "verwijderen"; itemId: string }
  | {
      soort: "toevoegen";
      item: {
        titel: string;
        type: ItemType;
        datum: string;
        tijd: string;
        urgentie: Urgentie;
        notitie?: string;
      };
    };
