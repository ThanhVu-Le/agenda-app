import { useEffect, useRef, useState } from "react";
import type { AgendaItem, ChatBericht } from "../types";
import { genereerBriefing } from "../agent/agentEngine";
import { vraagAgent } from "../agent/agentClient";

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

export function AgentPanel({ items, onVoegToe, onWerkBij, onVerwijder, onToggleAfgerond }: Props) {
  const [berichten, setBerichten] = useState<ChatBericht[]>(() => [
    nieuwBericht("agent", genereerBriefing(items)),
  ]);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const eindeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    eindeRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [berichten, bezig]);

  function voegAgentBericht(tekst: string) {
    setBerichten((prev) => [...prev, nieuwBericht("agent", tekst)]);
  }

  async function verstuur() {
    const tekst = invoer.trim();
    if (!tekst || bezig) return;
    const nieuweBerichten = [...berichten, nieuwBericht("gebruiker", tekst)];
    setBerichten(nieuweBerichten);
    setInvoer("");
    setBezig(true);

    try {
      const { antwoord, actie } = await vraagAgent(nieuweBerichten, items);

      switch (actie.soort) {
        case "verplaats": {
          const wijzigingen: Partial<AgendaItem> = { tijd: actie.nieuweTijd };
          if (actie.nieuweDatum) wijzigingen.datum = actie.nieuweDatum;
          onWerkBij(actie.itemId, wijzigingen);
          break;
        }
        case "afronden":
          onToggleAfgerond(actie.itemId);
          break;
        case "verwijderen":
          onVerwijder(actie.itemId);
          break;
        case "toevoegen":
          onVoegToe({ ...actie.item });
          break;
      }

      voegAgentBericht(antwoord);
    } catch {
      voegAgentBericht(
        "Er ging iets mis bij het bereiken van de agent-server. Probeer het straks nog eens."
      );
    } finally {
      setBezig(false);
    }
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

        {bezig && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-sm bg-bg px-3.5 py-2.5 text-sm text-ink-soft ring-1 ring-line">
              Denkt na / zoekt uit...
            </div>
          </div>
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
            disabled={bezig}
            placeholder="Vraag of geef een taak, bijv. 'wat staat er morgen?'"
            className="flex-1 rounded-sm border border-line bg-paper px-4 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy-soft disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={bezig}
            className="shrink-0 rounded-sm bg-navy px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-navy-dark disabled:opacity-60"
          >
            Stuur
          </button>
        </form>
      </div>
    </div>
  );
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
