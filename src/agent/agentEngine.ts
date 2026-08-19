import type { AgendaItem, ItemType, TaakVoorstel, Urgentie } from "../types";
import {
  dagdeelGroet,
  formatDatumLabel,
  parseNatuurlijkeDatum,
  parseTijd,
  vandaagIso,
  isoMetOffset,
} from "../utils/datum";

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

// ---------- Taak-voorstel ----------

interface VoorstelTemplate {
  herken: RegExp;
  type: ItemType;
  stappen: (onderwerp: string) => string[];
  tijdsinschatting: string;
}

const VOORSTEL_TEMPLATES: VoorstelTemplate[] = [
  {
    herken: /uitzoek|vergelijk|welke.*(geschikt|beste|passen)|opties/i,
    type: "uitzoek",
    stappen: (onderwerp) => [
      `Bepalen welke criteria belangrijk zijn voor "${onderwerp}"`,
      "Een shortlist van 3-5 opties verzamelen",
      "Opties naast elkaar leggen op prijs, geschiktheid en betrouwbaarheid",
      "Een korte vergelijking en aanbeveling opstellen",
      "Voorstel aan jou voorleggen ter beslissing",
    ],
    tijdsinschatting: "ongeveer 1,5 tot 2 uur",
  },
  {
    herken: /analyseer|analyse|cijfers|uitgaven|overzicht van/i,
    type: "analyse",
    stappen: (onderwerp) => [
      `Relevante gegevens verzamelen voor "${onderwerp}"`,
      "Data ordenen en controleren op volledigheid",
      "Patronen en opvallende zaken signaleren",
      "Bevindingen samenvatten in een kort, leesbaar overzicht",
      "Overzicht met jou doornemen en toelichten",
    ],
    tijdsinschatting: "ongeveer 1 tot 1,5 uur",
  },
];

const STANDAARD_TEMPLATE: VoorstelTemplate = {
  herken: /.*/,
  type: "taak",
  stappen: (onderwerp) => [
    `De opdracht "${onderwerp}" concreet maken`,
    "Benodigde informatie of stappen in kaart brengen",
    "De taak stap voor stap uitvoeren",
    "Resultaat kort samenvatten voor jou",
  ],
  tijdsinschatting: "ongeveer 45 minuten tot 1 uur",
};

export interface TaakVoorstelResultaat {
  type: ItemType;
  stappen: string[];
  tijdsinschatting: string;
  voorgesteldeDatum: string;
  voorgesteldeTijd: string;
}

export function genereerTaakVoorstel(beschrijving: string): TaakVoorstelResultaat {
  const template =
    VOORSTEL_TEMPLATES.find((t) => t.herken.test(beschrijving)) ?? STANDAARD_TEMPLATE;

  const gevondenDatum = parseNatuurlijkeDatum(beschrijving);
  const voorgesteldeDatum = gevondenDatum ?? isoMetOffset(2);

  return {
    type: template.type,
    stappen: template.stappen(beschrijving.trim()),
    tijdsinschatting: template.tijdsinschatting,
    voorgesteldeDatum,
    voorgesteldeTijd: "10:00",
  };
}

// ---------- Commando-herkenning ----------

export type CommandoActie =
  | { soort: "geen" }
  | { soort: "verplaats"; itemId: string; nieuweTijd: string; nieuweDatum?: string }
  | { soort: "afronden"; itemId: string }
  | { soort: "verwijderen"; itemId: string }
  | {
      soort: "toevoegen";
      item: { titel: string; type: ItemType; datum: string; tijd: string; urgentie: Urgentie };
    };

export interface CommandoResultaat {
  herkend: boolean;
  antwoord: string;
  actie: CommandoActie;
}

function vindItem(zoekterm: string, items: AgendaItem[]): AgendaItem | undefined {
  const t = zoekterm.trim().toLowerCase();
  if (!t) return undefined;
  const open = items.filter((i) => !i.afgerond);

  // Relatieve verwijzingen zoals "mijn eerste afspraak" of "de volgende taak"
  if (/\b(eerste|volgende|eerstvolgende|laatste)\b/.test(t)) {
    let kandidaten = open;
    if (t.includes("vandaag")) kandidaten = kandidaten.filter((i) => i.datum === vandaagIso());
    if (t.includes("afspraak")) kandidaten = kandidaten.filter((i) => i.type === "afspraak");
    else if (t.includes("taak")) kandidaten = kandidaten.filter((i) => i.type === "taak");

    const gesorteerd = [...kandidaten].sort((a, b) =>
      `${a.datum}${a.tijd}`.localeCompare(`${b.datum}${b.tijd}`)
    );
    return t.includes("laatste") ? gesorteerd[gesorteerd.length - 1] : gesorteerd[0];
  }

  return open.find((i) => i.titel.toLowerCase().includes(t));
}

/**
 * Probeert de invoer te herkennen als een van de ondersteunde commando's.
 * Geeft herkend: false terug als het geen commando is (dan behandelen we het als een nieuwe taak).
 */
export function verwerkCommando(
  input: string,
  items: AgendaItem[]
): CommandoResultaat {
  const tekst = input.trim();
  const t = tekst.toLowerCase();

  // "wat staat er (vandaag|morgen|deze week)"
  const overzichtMatch = t.match(/wat staat er(.*)/);
  if (overzichtMatch) {
    return beantwoordOverzicht(overzichtMatch[1], items);
  }

  // "verplaats <item> naar <tijd>"
  const verplaatsMatch = tekst.match(/verplaats (.+?) naar (.+)/i);
  if (verplaatsMatch) {
    const [, zoekterm, tijdDeel] = verplaatsMatch;
    const item = vindItem(zoekterm, items);
    const nieuweTijd = parseTijd(tijdDeel);
    const nieuweDatum = parseNatuurlijkeDatum(tijdDeel) ?? undefined;

    if (!item) {
      return {
        herkend: true,
        antwoord: `Ik kon geen openstaand item vinden dat lijkt op "${zoekterm.trim()}". Kun je het iets specifieker noemen?`,
        actie: { soort: "geen" },
      };
    }
    if (!nieuweTijd && !nieuweDatum) {
      return {
        herkend: true,
        antwoord: `Naar welk tijdstip of welke datum wil je "${item.titel}" verplaatsen?`,
        actie: { soort: "geen" },
      };
    }
    const label = nieuweDatum ? `${formatDatumLabel(nieuweDatum)}` : formatDatumLabel(item.datum);
    const tijdLabel = nieuweTijd ?? item.tijd;
    return {
      herkend: true,
      antwoord: `Gedaan — "${item.titel}" staat nu op ${label} om ${tijdLabel}.`,
      actie: {
        soort: "verplaats",
        itemId: item.id,
        nieuweTijd: nieuweTijd ?? item.tijd,
        nieuweDatum,
      },
    };
  }

  // "markeer <item> als klaar" / "rond <item> af"
  const afvinkMatch =
    tekst.match(/markeer (.+?) als (klaar|afgerond|af)/i) ??
    tekst.match(/rond (.+?) af/i);
  if (afvinkMatch) {
    const item = vindItem(afvinkMatch[1], items);
    if (!item) {
      return {
        herkend: true,
        antwoord: `Ik kon geen openstaand item vinden dat lijkt op "${afvinkMatch[1].trim()}".`,
        actie: { soort: "geen" },
      };
    }
    return {
      herkend: true,
      antwoord: `Top, ik heb "${item.titel}" afgevinkt. Eén ding minder op je bordje.`,
      actie: { soort: "afronden", itemId: item.id },
    };
  }

  // "verwijder <item>"
  const verwijderMatch = tekst.match(/verwijder (.+)/i);
  if (verwijderMatch) {
    const item = vindItem(verwijderMatch[1], items);
    if (!item) {
      return {
        herkend: true,
        antwoord: `Ik kon geen openstaand item vinden dat lijkt op "${verwijderMatch[1].trim()}".`,
        actie: { soort: "geen" },
      };
    }
    return {
      herkend: true,
      antwoord: `"${item.titel}" is verwijderd uit je agenda.`,
      actie: { soort: "verwijderen", itemId: item.id },
    };
  }

  // "voeg (afspraak|taak|uitzoek-taak|analyse) toe ... voor <dag>"
  const toevoegMatch = tekst.match(
    /voeg (?:een )?(afspraak|taak|uitzoek-?(?:taak|opdracht)?|analyse)?\s*toe(?: voor)? (.+)/i
  );
  if (toevoegMatch) {
    const [, typeRuw, rest] = toevoegMatch;
    const type = herkenType(typeRuw);
    const datum = parseNatuurlijkeDatum(rest) ?? isoMetOffset(1);
    const tijd = parseTijd(rest) ?? "10:00";
    const titel = maakTitelUitInvoer(rest, type);

    return {
      herkend: true,
      antwoord: `Toegevoegd: "${titel}" (${TYPE_LABEL[type]}) op ${formatDatumLabel(datum)} om ${tijd}.`,
      actie: {
        soort: "toevoegen",
        item: { titel, type, datum, tijd, urgentie: "midden" },
      },
    };
  }

  return { herkend: false, antwoord: "", actie: { soort: "geen" } };
}

function herkenType(ruw: string | undefined): ItemType {
  if (!ruw) return "taak";
  const t = ruw.toLowerCase();
  if (t.startsWith("afspraak")) return "afspraak";
  if (t.startsWith("uitzoek")) return "uitzoek";
  if (t.startsWith("analyse")) return "analyse";
  return "taak";
}

function maakTitelUitInvoer(rest: string, type: ItemType): string {
  // Haal herkenbare datum/tijd-woorden eruit zodat de titel schoon blijft
  const schoon = rest
    .replace(/\b(vandaag|morgen|overmorgen)\b/gi, "")
    .replace(/\bover \d+ dagen?\b/gi, "")
    .replace(
      /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/gi,
      ""
    )
    .replace(/\b(voor|op|om)\b/gi, "")
    .replace(/\b([01]?\d|2[0-3])(:[0-5]\d)?\s?u(?:ur)?\b/gi, "")
    .trim()
    .replace(/\s{2,}/g, " ");

  if (schoon.length > 0) {
    return schoon.charAt(0).toUpperCase() + schoon.slice(1);
  }
  return `Nieuwe ${TYPE_LABEL[type]}`;
}

function beantwoordOverzicht(periodeTekst: string, items: AgendaItem[]): CommandoResultaat {
  const t = periodeTekst.toLowerCase();
  let doelDatum: string | null = null;
  let periodeLabel = "vandaag";

  if (/morgen/.test(t)) {
    doelDatum = parseNatuurlijkeDatum("morgen");
    periodeLabel = "morgen";
  } else if (/week/.test(t)) {
    const open = sorteerOpUrgentie(
      items.filter((i) => !i.afgerond && binnenDezeWeek(i.datum))
    );
    return {
      herkend: true,
      antwoord: formatteerLijst(open, "Deze week staat er op je agenda:"),
      actie: { soort: "geen" },
    };
  } else {
    doelDatum = vandaagIso();
  }

  const open = items.filter((i) => !i.afgerond && i.datum === doelDatum);
  return {
    herkend: true,
    antwoord: formatteerLijst(sorteerOpUrgentie(open), `Op ${periodeLabel} staat er:`),
    actie: { soort: "geen" },
  };
}

function binnenDezeWeek(datumIso: string): boolean {
  const doel = new Date(`${datumIso}T00:00:00`);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const verschil = Math.round((doel.getTime() - start.getTime()) / 86_400_000);
  return verschil >= 0 && verschil < 7;
}

function formatteerLijst(items: AgendaItem[], titelRegel: string): string {
  if (items.length === 0) {
    return `${titelRegel}\n\nNiets gepland — lekker rustig.`;
  }
  const regels = items.map(
    (i) => `- **${i.titel}** (${TYPE_LABEL[i.type]}) om ${i.tijd}`
  );
  return [titelRegel, "", ...regels].join("\n");
}

export function bouwVoorstel(resultaat: TaakVoorstelResultaat): TaakVoorstel {
  return {
    stappen: resultaat.stappen,
    tijdsinschatting: resultaat.tijdsinschatting,
    akkoord: false,
  };
}
