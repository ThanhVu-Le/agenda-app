import { useCallback, useEffect, useState } from "react";
import { mockItems } from "../data/mockData";
import type { AgendaItem, TaakVoorstel } from "../types";

const STORAGE_KEY = "agenda-app:items";

function laadItems(): AgendaItem[] {
  try {
    const opgeslagen = localStorage.getItem(STORAGE_KEY);
    if (opgeslagen) return JSON.parse(opgeslagen) as AgendaItem[];
  } catch {
    // negeer corrupte opslag, val terug op mock-data
  }
  return mockItems;
}

function nieuwId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAgenda() {
  const [items, setItems] = useState<AgendaItem[]>(laadItems);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const voegToe = useCallback((item: Omit<AgendaItem, "id" | "afgerond">) => {
    const nieuw: AgendaItem = { ...item, id: nieuwId(), afgerond: false };
    setItems((prev) => [...prev, nieuw]);
    return nieuw;
  }, []);

  const werkBij = useCallback((id: string, wijzigingen: Partial<AgendaItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...wijzigingen } : item))
    );
  }, []);

  const verwijder = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleAfgerond = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, afgerond: !item.afgerond } : item
      )
    );
  }, []);

  const zetVoorstel = useCallback((id: string, voorstel: TaakVoorstel) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, voorstel } : item))
    );
  }, []);

  const resetNaarMock = useCallback(() => {
    setItems(mockItems);
  }, []);

  return { items, voegToe, werkBij, verwijder, toggleAfgerond, zetVoorstel, resetNaarMock };
}
