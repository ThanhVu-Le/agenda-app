export type ItemType = "afspraak" | "taak" | "uitzoek" | "analyse";

export type Urgentie = "laag" | "midden" | "hoog";

export interface AgendaItem {
  id: string;
  titel: string;
  type: ItemType;
  datum: string; // YYYY-MM-DD
  tijd: string; // HH:MM
  urgentie: Urgentie;
  notitie?: string;
  afgerond: boolean;
  /** Aanwezig zodra de agent voor deze taak een aanpak heeft voorgesteld en de gebruiker akkoord ging. */
  voorstel?: TaakVoorstel;
}

export interface TaakVoorstel {
  stappen: string[];
  tijdsinschatting: string;
  akkoord: boolean;
}

export interface ChatBericht {
  id: string;
  afzender: "gebruiker" | "agent";
  tekst: string;
  tijdstip: string;
}
