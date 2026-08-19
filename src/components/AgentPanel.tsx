import { useEffect, useRef, useState } from "react";
import type { AgendaItem, ChatBericht } from "../types";
import {
  genereerBriefing,
  genereerTaakVoorstel,
  verwerkCommando,
  type TaakVoorstelResultaat,
} from "../agent/agentEngine";
import { TYPE_LABEL } from "../utils/labels";
import { formatDatumLabel } from "../utils/datum";

interface Props {
  items: AgendaItem[];
  onVoegToe: (item: Omit<AgendaItem, "id" | "afgerond">) => void;
  onWerkBij: (id: string, wijzigingen: Partial<AgendaItem>) => void;
  onVerwijder: (id: string) => void;
  onToggleAfgerond: (id: string) => void;
}

function nieuwBericht(afzender: ChatBericht["afzender"], tekst: string): ChatBericht {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    afzender,
    tekst,
    tijdstip: new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
  };
}

interface WachtendVoorstel {
  beschrijving: string;
  resultaat: TaakVoorstelResultaat;
}

export function AgentPanel({ items, onVoegToe, onWerkBij, onVerwijder, onToggleAfgerond }: Props) {
  const [berichten, setBerichten] = useState<ChatBericht[]>(() => [
    nieuwBericht("agent", genereerBriefing(items)),
  ]);
  const [invoer, setInvoer] = useState("");
  const [wachtendVoorstel, setWachtendVoorstel] = useState<WachtendVoorstel | null>(null);
  const eindeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    eindeRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [berichten, wachtendVoorstel]);

  function voegAgentBericht(tekst: string) {
    setBerichten((prev) => [...prev, nieuwBericht("agent", tekst)]);
  }

  function bevestigVoorstel() {
    if (!wachtendVoorstel) return;
    const { beschrijving, resultaat } = wachtendVoorstel;
    const titel = beschrijving.charAt(0).toUpperCase() + beschrijving.slice(1);

    onVoegToe({
      titel,
      type: resultaat.type,
      datum: resultaat.voorgesteldeDatum,
      tijd: resultaat.voorgesteldeTijd,
      urgentie: "midden",
      voorstel: {
        stappen: resultaat.stappen,
        tijdsinschatting: resultaat.tijdsinschatting,
        akkoord: true,
      },
    });

    voegAgentBericht(
      `Ingepland: **${titel}** op ${formatDatumLabel(resultaat.voorgesteldeDatum)} om ${resultaat.voorgesteldeTijd}. Let op: dit is het voorstel voor de aanpak — ik heb de taak nog niet uitgevoerd, alleen ingepland.`
    );
    setWachtendVoorstel(null);
  }

  function wijsVoorstelAf() {
    voegAgentBericht("Oké, ik laat het zo. Zeg het gerust als je het later toch wilt inplannen.");
    setWachtendVoorstel(null);
  }

  function verstuur() {
    const tekst = invoer.trim();
    if (!tekst) return;
    setBerichten((prev) => [...prev, nieuwBericht("gebruiker", tekst)]);
    setInvoer("");

    if (wachtendVoorstel) {
      const t = tekst.toLowerCase();
      if (/^(ja|akkoord|oke|ok|prima|goed|doe maar)/.test(t)) {
        bevestigVoorstel();
      } else if (/^(nee|niet akkoord|toch niet|laat maar)/.test(t)) {
        wijsVoorstelAf();
      } else {
        voegAgentBericht(
          "Wil je dat ik dit voorstel inplan? Zeg 'akkoord' om te bevestigen, of 'toch niet' om het te laten."
        );
      }
      return;
    }

    const commando = verwerkCommando(tekst, items);
    if (commando.herkend) {
      switch (commando.actie.soort) {
        case "verplaats": {
          const wijzigingen: Partial<AgendaItem> = { tijd: commando.actie.nieuweTijd };
          if (commando.actie.nieuweDatum) wijzigingen.datum = commando.actie.nieuweDatum;
          onWerkBij(commando.actie.itemId, wijzigingen);
          break;
        }
        case "afronden":
          onToggleAfgerond(commando.actie.itemId);
          break;
        case "verwijderen":
          onVerwijder(commando.actie.itemId);
          break;
        case "toevoegen":
          onVoegToe({ ...commando.actie.item });
          break;
      }
      voegAgentBericht(commando.antwoord);
      return;
    }

    // Geen herkend commando: behandel als nieuwe taak en kom met een voorstel
    const resultaat = genereerTaakVoorstel(tekst);
    setWachtendVoorstel({ beschrijving: tekst, resultaat });
    voegAgentBericht(formatteerVoorstelBericht(tekst, resultaat));
  }

  return (
    <div className="flex h-full flex-col rounded-md border border-line bg-paper shadow-sm">
      <div className="rounded-t-md border-b border-gold/30 bg-navy px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white">
          Persoonlijke agent
        </h2>
        <p className="text-xs text-white/50">Bewaakt je planning en denkt mee</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {berichten.map((b) => (
          <ChatBubbel key={b.id} bericht={b} />
        ))}

        {wachtendVoorstel && (
          <VoorstelKaart
            resultaat={wachtendVoorstel.resultaat}
            onAkkoord={bevestigVoorstel}
            onAfwijzen={wijsVoorstelAf}
          />
        )}
        <div ref={eindeRef} />
      </div>

      <div className="border-t border-line p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verstuur();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={invoer}
            onChange={(e) => setInvoer(e.target.value)}
            placeholder="Vraag of geef een taak, bijv. 'wat staat er morgen?'"
            className="flex-1 rounded-sm border border-line bg-paper px-4 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy-soft"
          />
          <button
            type="submit"
            className="shrink-0 rounded-sm bg-navy px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-navy-dark"
          >
            Stuur
          </button>
        </form>
      </div>
    </div>
  );
}

function formatteerVoorstelBericht(beschrijving: string, resultaat: TaakVoorstelResultaat): string {
  return `Ik begrijp het als: "${beschrijving.trim()}" (${TYPE_LABEL[resultaat.type].toLowerCase()}). Hieronder mijn voorstel voor de aanpak — nog niet uitgevoerd, alleen een plan.`;
}

function ChatBubbel({ bericht }: { bericht: ChatBericht }) {
  const isAgent = bericht.afzender === "agent";
  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[90%] rounded-sm px-3.5 py-2.5 text-sm ${
          isAgent ? "bg-bg text-ink ring-1 ring-line" : "bg-navy text-white"
        }`}
      >
        <TekstMetOpmaak tekst={bericht.tekst} />
      </div>
    </div>
  );
}

function TekstMetOpmaak({ tekst }: { tekst: string }) {
  const regels = tekst.split("\n");
  return (
    <div className="space-y-1">
      {regels.map((regel, i) => {
        if (regel.trim() === "") return <div key={i} className="h-1" />;
        if (regel.trim().startsWith("- ")) {
          return (
            <div key={i} className="pl-1 leading-snug">
              • {renderInline(regel.trim().slice(2))}
            </div>
          );
        }
        return (
          <p key={i} className="leading-snug">
            {renderInline(regel)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(regel: string) {
  const delen = regel.split(/(\*\*[^*]+\*\*)/g).filter((d) => d !== "");
  return delen.map((deel, i) =>
    deel.startsWith("**") && deel.endsWith("**") ? (
      <strong key={i}>{deel.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{deel}</span>
    )
  );
}

function VoorstelKaart({
  resultaat,
  onAkkoord,
  onAfwijzen,
}: {
  resultaat: TaakVoorstelResultaat;
  onAkkoord: () => void;
  onAfwijzen: () => void;
}) {
  return (
    <div className="rounded-sm border border-gold/40 bg-gold-soft/70 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">
        Voorstel — nog niet uitgevoerd
      </p>
      <ol className="mb-3 space-y-1 pl-4 text-sm text-ink">
        {resultaat.stappen.map((stap, i) => (
          <li key={i} className="list-decimal">
            {stap}
          </li>
        ))}
      </ol>
      <p className="mb-3 text-sm text-ink-soft">
        Geschatte tijd: <strong>{resultaat.tijdsinschatting}</strong>. Voorgestelde inplanning:{" "}
        <strong>
          {formatDatumLabel(resultaat.voorgesteldeDatum)} om {resultaat.voorgesteldeTijd}
        </strong>
        .
      </p>
      <div className="flex gap-2">
        <button
          onClick={onAkkoord}
          className="rounded-sm bg-navy px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-navy-dark"
        >
          Akkoord, plan in
        </button>
        <button
          onClick={onAfwijzen}
          className="rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft hover:bg-bg"
        >
          Toch niet
        </button>
      </div>
    </div>
  );
}
