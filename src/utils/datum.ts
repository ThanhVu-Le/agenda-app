const DAGNAMEN = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
];

export function naarIso(d: Date): string {
  const jaar = d.getFullYear();
  const maand = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${jaar}-${maand}-${dag}`;
}

export function vandaagIso(): string {
  return naarIso(new Date());
}

export function isoMetOffset(dagen: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dagen);
  return naarIso(d);
}

/** Zoekt de eerstvolgende datum die op de gegeven weekdag valt (0 = vandaag als het klopt, anders komende week). */
export function eerstvolgendeWeekdag(doelDag: number): string {
  const d = new Date();
  const huidigeDag = d.getDay();
  let verschil = (doelDag - huidigeDag + 7) % 7;
  if (verschil === 0) verschil = 7; // "vrijdag" bedoelt de komende vrijdag, niet vandaag
  d.setDate(d.getDate() + verschil);
  return naarIso(d);
}

/** Herkent eenvoudige Nederlandse tijdsaanduidingen zoals "morgen", "vrijdag", "over 3 dagen". */
export function parseNatuurlijkeDatum(tekst: string): string | null {
  const t = tekst.toLowerCase();
  if (/\bvandaag\b/.test(t)) return vandaagIso();
  if (/\bovermorgen\b/.test(t)) return isoMetOffset(2);
  if (/\bmorgen\b/.test(t)) return isoMetOffset(1);

  const overDagenMatch = t.match(/over (\d+) dagen?/);
  if (overDagenMatch) return isoMetOffset(Number(overDagenMatch[1]));

  for (let i = 0; i < DAGNAMEN.length; i++) {
    if (t.includes(DAGNAMEN[i])) {
      return eerstvolgendeWeekdag(i);
    }
  }
  return null;
}

/** Herkent tijdsaanduidingen zoals "15 uur", "15:00", "om 9u". */
export function parseTijd(tekst: string): string | null {
  const dubbelePunt = tekst.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (dubbelePunt) {
    return `${dubbelePunt[1].padStart(2, "0")}:${dubbelePunt[2]}`;
  }
  const uurWoord = tekst.match(/\b([01]?\d|2[0-3])\s?u(?:ur)?\b/);
  if (uurWoord) {
    return `${uurWoord[1].padStart(2, "0")}:00`;
  }
  return null;
}

/** Vriendelijk label voor een datum: "vandaag", "morgen", weekdag, of volledige datum. */
export function formatDatumLabel(datumIso: string): string {
  const vandaag = vandaagIso();
  const morgen = isoMetOffset(1);
  if (datumIso === vandaag) return "vandaag";
  if (datumIso === morgen) return "morgen";

  const doel = new Date(`${datumIso}T00:00:00`);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const verschilDagen = Math.round(
    (doel.getTime() - start.getTime()) / 86_400_000
  );

  if (verschilDagen >= 0 && verschilDagen < 7) return DAGNAMEN[doel.getDay()];
  return doel.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
}

export function dagdeelGroet(datum: Date = new Date()): string {
  const uur = datum.getHours();
  if (uur < 12) return "Goedemorgen";
  if (uur < 18) return "Goedemiddag";
  return "Goedenavond";
}
