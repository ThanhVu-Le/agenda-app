export interface Env {
  AI: Ai;
  AGENT_SHARED_SECRET: string;
}

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const ALLOWED_ORIGINS = new Set([
  "tauri://localhost",
  "https://tauri.localhost",
  "capacitor://localhost",
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
  | { soort: "afronden"; itemId: string }
  | { soort: "verwijderen"; itemId: string }
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

interface ToolDef {
  name: string;
  description: string;
  parameters: {
    type: string;
    required?: string[];
    properties: Record<string, { type: string; description: string }>;
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
    description: "Markeer een bestaand agenda-item als afgerond.",
    parameters: {
      type: "object",
      required: ["itemId"],
      properties: {
        itemId: { type: "string", description: "Het id van het item dat afgevinkt moet worden." },
      },
    },
  },
  {
    name: "agenda_verwijderen",
    description: "Verwijder een bestaand agenda-item.",
    parameters: {
      type: "object",
      required: ["itemId"],
      properties: {
        itemId: { type: "string", description: "Het id van het item dat verwijderd moet worden." },
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
    case "agenda_afronden":
      if (typeof a.itemId !== "string") return null;
      return { soort: "afronden", itemId: a.itemId };
    case "agenda_verwijderen":
      if (typeof a.itemId !== "string") return null;
      return { soort: "verwijderen", itemId: a.itemId };
    default:
      return null;
  }
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

    let actie: AgendaActie = { soort: "geen" };
    let antwoord = eersteRespons.response ?? "";

    const toolCall = eersteRespons.tool_calls?.[0];
    if (toolCall) {
      const gevondenActie = actieVanToolCall(toolCall.name, toolCall.arguments);
      if (gevondenActie) actie = gevondenActie;

      const heeftRapport =
        actie.soort === "toevoegen" && !!actie.item.notitie && actie.item.notitie.length > 0;

      const vervolgInstructie = heeftRapport
        ? `[Systeem: de actie "${toolCall.name}" is uitgevoerd en het rapport is opgeslagen bij het item. Herhaal het volledige rapport (bevindingen + aanwijzingen waar/hoe verder te zoeken) nu ook in je antwoord aan de gebruiker, in het Nederlands — de gebruiker leest dit antwoord in de chat en moet het rapport daar meteen kunnen lezen.]`
        : `[Systeem: de actie "${toolCall.name}" is uitgevoerd. Geef nu een kort, natuurlijktalig bevestigend antwoord in het Nederlands aan de gebruiker.]`;

      const vervolgRespons = (await env.AI.run(MODEL, {
        messages: [
          ...messages,
          { role: "user", content: vervolgInstructie },
        ],
        max_tokens: 2048,
      })) as { response?: string };

      antwoord = vervolgRespons.response ?? antwoord;
    }

    if (!antwoord) antwoord = "Sorry, ik kon geen antwoord genereren.";

    return new Response(JSON.stringify({ antwoord, actie }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  },
};
