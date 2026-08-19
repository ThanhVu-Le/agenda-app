import type { ItemType, Urgentie } from "../types";

export const TYPE_LABEL: Record<ItemType, string> = {
  afspraak: "Afspraak",
  taak: "Taak",
  uitzoek: "Uitzoek-opdracht",
  analyse: "Analyse",
};

export const TYPE_KORT: Record<ItemType, string> = {
  afspraak: "AFS",
  taak: "TAAK",
  uitzoek: "UITZ",
  analyse: "ANL",
};

export const URGENTIE_LABEL: Record<Urgentie, string> = {
  laag: "Laag",
  midden: "Midden",
  hoog: "Hoog",
};

export const URGENTIE_STIJL: Record<
  Urgentie,
  { badge: string; stip: string; rand: string }
> = {
  laag: {
    badge: "bg-urgentie-laag-soft text-urgentie-laag ring-1 ring-urgentie-laag/25",
    stip: "bg-urgentie-laag",
    rand: "border-l-urgentie-laag",
  },
  midden: {
    badge: "bg-urgentie-midden-soft text-urgentie-midden ring-1 ring-urgentie-midden/25",
    stip: "bg-urgentie-midden",
    rand: "border-l-urgentie-midden",
  },
  hoog: {
    badge: "bg-urgentie-hoog-soft text-urgentie-hoog ring-1 ring-urgentie-hoog/25",
    stip: "bg-urgentie-hoog",
    rand: "border-l-urgentie-hoog",
  },
};
