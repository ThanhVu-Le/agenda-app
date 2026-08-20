export interface Env {
  AI: Ai;
  AGENT_SHARED_SECRET: string;
}

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const ALLOWED_ORIGINS = new Set([
  "tauri://localhost",
  "https://tauri.localhost",
  "http://tauri.localhost",
  "capacitor://localhost",
  "https://capacitor.localhost",
  "http://localhost:5173",
  "https://interactive-agenda.pages.dev",
]);

const ALLOWED_ORIGIN_SUFFIX = ".interactive-agenda.pages.dev";

function origineToegestaan(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    return new URL(origin).hostname.endsWith(ALLOWED_ORIGIN_SUFFIX);
  } catch {
    return false;
  }
}

interface ChatBerichtIn {
  afzender: "gebruiker" | "agent";
  tekst: string;
}

interface AgendaItemIn {
  id: string;
  titel: string;
  type: string;
  datum: string;
  tijd: string;
  urgentie: string;
  afgerond: boolean;
  notitie?: string;
}

type AgendaActie =
  | { soort: "geen" }
  | { soort: "verplaats"; itemId: string; nieuweTijd: string; nieuweDatum?: string }
  | { soort: "afronden"; itemIds: string[] }
  | { soort: "verwijderen"; itemIds: string[] }
  | {
      soort: "toevoegen";
      item: {
        titel: string;
        type: string;
        datum: string;
        tijd: string;
        urgentie: string;
        notitie?: string;
      };
    };

interface ToolParam {
  type: string;
  description: string;
  items?: { type: string };
}

interface ToolDef {
  name: string;
  description: string;
  parameters: {
    type: string;
    required?: string[];
    properties: Record<string, ToolParam>;
  };
}

const TOOLS: ToolDef[] = [
  {
    name: "agenda_toevoegen",
    description: "Voeg een nieuw item toe aan de agenda.",
    parameters: {
      type: "object",
      required: ["titel", "type", "datum", "tijd", "urgentie"],
      properties: {
        titel: { type: "string", description: "Titel van het item." },
        type: {
          type: "string",
          description: "Een van: afspraak, taak, uitzoek, analyse.",
        },
        datum: { type: "string", description: "Datum in YYYY-MM-DD formaat." },
        tijd: { type: "string", description: "Tijd in HH:MM formaat." },
        urgentie: { type: "string", description: "Een van: laag, midden, hoog." },
        notitie: {
          type: "string",
          description:
            "Bij een uitzoek-/analyseverzoek: het volledige rapport met bevindingen en concrete aanwijzingen waar/hoe de gebruiker het zelf verder kan uitzoeken.",
        },
      },
    },
  },
  {
    name: "agenda_verplaats",
    description: "Verplaats een bestaand agenda-item naar een andere tijd en/of datum.",
    parameters: {
      type: "object",
      required: ["itemId", "nieuweTijd"],
      properties: {
        itemId: { type: "string", description: "Het id van het bestaande agenda-item." },
        nieuweTijd: { type: "string", description: "Nieuwe tijd in HH:MM formaat." },
        nieuweDatum: {
          type: "string",
          description: "Nieuwe datum in YYYY-MM-DD formaat, alleen als die ook wijzigt.",
        },
      },
    },
  },
  {
    name: "agenda_afronden",
    description:
      "Markeer één of meerdere bestaande agenda-items als afgerond. Voor meerdere items tegelijk (bijv. 'rond alles af'): geef alle betrokken id's in één aanroep mee.",
    parameters: {
      type: "object",
      required: ["itemIds"],
      properties: {
        itemIds: {
          type: "array",
          description: "De id's van alle items die afgevinkt moeten worden (minstens 1).",
          items: { type: "string" },
        },
      },
    },
  },
  {
    name: "agenda_verwijderen",
    description:
      "Verwijder één of meerdere bestaande agenda-items. Voor meerdere items tegelijk (bijv. 'verwijder alles wat nog open staat'): geef alle betrokken id's in één aanroep mee — niet meerdere losse aanroepen.",
    parameters: {
      type: "object",
      required: ["itemIds"],
      properties: {
        itemIds: {
          type: "array",
          description: "De id's van alle items die verwijderd moeten worden (minstens 1).",
          items: { type: "string" },
        },
      },
    },
  },
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origineToegestaan(origin) ? (origin as string) : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function systeemPrompt(items: AgendaItemIn[]): string {
  const vandaag = new Date().toISOString().slice(0, 10);
  return [
    "Je bent 'Persoonlijke agent', de AI-assistent in een zakelijke Nederlandstalige agenda-app. Toon: zakelijk, kort, geen emoji.",
    `Vandaag is ${vandaag}.`,
    "Huidige agenda-items (JSON, id gebruik je om naar een item te verwijzen bij acties):",
    JSON.stringify(items),
    "",
    "Instructies:",
    "- Roep ALLEEN een tool aan als de gebruiker expliciet wil dat er iets in de agenda wijzigt (item toevoegen, verplaatsen, afronden of verwijderen). Gebruik agenda_toevoegen, agenda_verplaats, agenda_afronden of agenda_verwijderen, en zoek het juiste item op basis van titel/type/context uit de lijst hierboven.",
    "- Als de gebruiker afronden/verwijderen op MEERDERE items tegelijk vraagt (bijv. 'verwijder alles wat nog open staat', 'rond deze taken allemaal af'): bepaal ALLE betrokken item-id's uit de lijst hierboven en geef ze in ÉÉN aanroep van agenda_afronden of agenda_verwijderen mee via itemIds (een lijst met alle id's). Roep die tool niet meerdere keren apart aan — altijd één aanroep met alle betrokken id's samen. Vergeet nooit een item dat aan de voorwaarde voldoet.",
    "- Bij een vraag die alleen om informatie vraagt (bijv. 'wat staat er vandaag/morgen/deze week', 'wanneer is X') roep je GEEN tool aan — je beantwoordt de vraag direct in tekst op basis van de agenda-items hierboven, zonder iets te wijzigen of toe te voegen.",
    "- Je hebt GEEN live internettoegang en kunt niet actueel het web doorzoeken. Bij een uitzoek- of analyseverzoek (bijv. 'zoek uit welke X het beste is'): doe een inhoudelijke analyse vanuit je eigen kennis en schrijf een kort rapport met (1) je bevindingen/inschatting, en (2) concrete aanwijzingen waar en hoe de gebruiker dit zelf verder kan verifiëren of uitzoeken (bijv. welk type bronnen, welke websites, welke zoektermen). Doe NOOIT alsof je live hebt gezocht.",
    "- Overweeg na zo'n analyse het resultaat vast te leggen via agenda_toevoegen, met het rapport in het notitie-veld.",
    "- Geef altijd een natuurlijktalig antwoord in het Nederlands.",
    "- Wees direct: voer uit wat gevraagd wordt in plaats van alleen een plan te maken.",
  ].join("\n");
}

function actieVanToolCall(name: string | undefined, args: unknown): AgendaActie | null {
  const a = (args ?? {}) as Record<string, unknown>;
  switch (name) {
    case "agenda_toevoegen":
      if (typeof a.titel !== "string" || typeof a.type !== "string") return null;
      return {
        soort: "toevoegen",
        item: {
          titel: a.titel,
          type: a.type,
          datum: String(a.datum ?? ""),
          tijd: String(a.tijd ?? ""),
          urgentie: String(a.urgentie ?? "midden"),
          notitie: typeof a.notitie === "string" ? a.notitie : undefined,
        },
      };
    case "agenda_verplaats":
      if (typeof a.itemId !== "string" || typeof a.nieuweTijd !== "string") return null;
      return {
        soort: "verplaats",
        itemId: a.itemId,
        nieuweTijd: a.nieuweTijd,
        nieuweDatum: typeof a.nieuweDatum === "string" ? a.nieuweDatum : undefined,
      };
    case "agenda_afronden": {
      const itemIds = itemIdsUit(a);
      if (itemIds.length === 0) return null;
      return { soort: "afronden", itemIds };
    }
    case "agenda_verwijderen": {
      const itemIds = itemIdsUit(a);
      if (itemIds.length === 0) return null;
      return { soort: "verwijderen", itemIds };
    }
    default:
      return null;
  }
}

// Robuust: het model geeft meestal itemIds (array) mee zoals gevraagd, maar
// valt soms terug op een los itemId-veld of een enkele string — vang beide op.
function itemIdsUit(a: Record<string, unknown>): string[] {
  if (Array.isArray(a.itemIds)) {
    return a.itemIds.filter((v): v is string => typeof v === "string");
  }
  if (typeof a.itemIds === "string") return [a.itemIds];
  if (typeof a.itemId === "string") return [a.itemId];
  return [];
}

const BESTANDSNAMEN: Record<string, (versie: string) => string> = {
  windows: (versie) => `Mijn.Agenda_${versie}_x64-setup.exe`,
};

async function downloadRedirect(platform: string): Promise<Response> {
  const bestandsnaam = BESTANDSNAMEN[platform];
  if (!bestandsnaam) return new Response("Onbekend platform", { status: 404 });

  // Gebruikt de gewone (niet API-rate-limited) GitHub-releasepagina om de laatste
  // tag te achterhalen, i.p.v. de publieke REST API — die deelt een laag anoniem
  // quotum met alle Cloudflare-klanten wereldwijd en gaf daardoor intermitterend 403.
  let tag: string | undefined;
  for (let poging = 0; poging < 2 && !tag; poging++) {
    const paginaRespons = await fetch("https://github.com/ThanhVu-Le/agenda-app/releases/latest", {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": "mijn-agenda-agent-worker" },
    });
    tag = paginaRespons.headers.get("Location")?.split("/").pop();
  }
  if (!tag) return new Response("Kon laatste release niet bepalen", { status: 502 });

  const versie = tag.replace(/^v/, "");
  const url = `https://github.com/ThanhVu-Le/agenda-app/releases/download/${tag}/${bestandsnaam(versie)}`;
  return Response.redirect(url, 302);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const headers = corsHeaders(origin);
    const pathname = new URL(request.url).pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method === "GET" && pathname === "/download/windows") {
      return downloadRedirect("windows");
    }

    if (request.method !== "POST" || pathname !== "/chat") {
      return new Response("Not found", { status: 404, headers });
    }

    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${env.AGENT_SHARED_SECRET}`) {
      return new Response("Unauthorized", { status: 401, headers });
    }

    let body: { berichten: ChatBerichtIn[]; items: AgendaItemIn[] };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400, headers });
    }

    const messages = [
      { role: "system", content: systeemPrompt(body.items) },
      ...body.berichten
        .slice(-10)
        .map((b) => ({ role: b.afzender === "gebruiker" ? "user" : "assistant", content: b.tekst })),
    ];

    const eersteRespons = (await env.AI.run(MODEL, {
      messages,
      tools: TOOLS,
      max_tokens: 2048,
    })) as { response?: string; tool_calls?: { name?: string; arguments?: object }[] };

    const acties: AgendaActie[] = [];
    for (const toolCall of eersteRespons.tool_calls ?? []) {
      const gevondenActie = actieVanToolCall(toolCall.name, toolCall.arguments);
      if (gevondenActie) acties.push(gevondenActie);
    }

    let antwoord = eersteRespons.response ?? "";

    if (acties.length > 0) {
      const rapporten = acties
        .filter((a): a is Extract<AgendaActie, { soort: "toevoegen" }> => a.soort === "toevoegen")
        .map((a) => a.item.notitie)
        .filter((n): n is string => !!n && n.length > 0);

      const samenvatting = acties
        .map((a) => ("itemIds" in a ? `${a.soort} (${a.itemIds.join(", ")})` : a.soort))
        .join(", ");

      const vervolgInstructie =
        rapporten.length > 0
          ? `[Systeem: uitgevoerd: ${samenvatting}. Rapport(en) opgeslagen bij de betreffende item(en). Herhaal het volledige rapport (bevindingen + aanwijzingen waar/hoe verder te zoeken) nu ook in je antwoord aan de gebruiker, in het Nederlands — de gebruiker leest dit antwoord in de chat en moet het rapport daar meteen kunnen lezen. Roep geen tool meer aan.]`
          : `[Systeem: uitgevoerd: ${samenvatting}. Geef nu een kort, natuurlijktalig bevestigend antwoord in het Nederlands aan de gebruiker dat dit gebeurd is. Roep geen tool meer aan.]`;

      const vervolgRespons = (await env.AI.run(MODEL, {
        messages: [...messages, { role: "user", content: vervolgInstructie }],
        max_tokens: 2048,
      })) as { response?: string };

      antwoord = vervolgRespons.response ?? antwoord;
    }

    if (!antwoord) antwoord = "Sorry, ik kon geen antwoord genereren.";

    return new Response(JSON.stringify({ antwoord, acties }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  },
};
