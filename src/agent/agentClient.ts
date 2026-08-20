import type { AgendaItem, ChatBericht } from "../types";
import type { CommandoActie } from "./agentEngine";
import { AGENT_ENDPOINT, AGENT_SHARED_SECRET } from "./config";

export interface AgentAntwoord {
  antwoord: string;
  acties: CommandoActie[];
}

export async function vraagAgent(
  berichten: ChatBericht[],
  items: AgendaItem[]
): Promise<AgentAntwoord> {
  const response = await fetch(AGENT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AGENT_SHARED_SECRET}`,
    },
    body: JSON.stringify({
      berichten: berichten.map((b) => ({ afzender: b.afzender, tekst: b.tekst })),
      items,
    }),
  });

  if (!response.ok) {
    throw new Error(`Agent-server gaf status ${response.status}`);
  }

  return (await response.json()) as AgentAntwoord;
}
