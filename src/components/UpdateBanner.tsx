import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";

type Status = "idle" | "beschikbaar" | "bezig" | "fout";

export function UpdateBanner() {
  const [status, setStatus] = useState<Status>("idle");
  const [versie, setVersie] = useState<string | null>(null);
  const [update, setUpdate] = useState<Awaited<
    ReturnType<typeof import("@tauri-apps/plugin-updater").check>
  > | null>(null);

  useEffect(() => {
    if (!isTauri()) return;

    import("@tauri-apps/plugin-updater").then(async ({ check }) => {
      try {
        const gevonden = await check();
        if (gevonden) {
          setUpdate(gevonden);
          setVersie(gevonden.version);
          setStatus("beschikbaar");
        }
      } catch {
        // Geen verbinding of geen releases: stil negeren, geen storende foutmelding.
      }
    });
  }, []);

  if (status === "idle") return null;

  async function bijwerken() {
    if (!update) return;
    setStatus("bezig");
    try {
      await update.downloadAndInstall();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      setStatus("fout");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-gold/30 bg-navy-dark px-4 py-2 sm:px-6">
      <p className="text-xs uppercase tracking-wide text-white/80">
        {status === "fout"
          ? "Bijwerken mislukt — probeer het later opnieuw"
          : `Nieuwe versie beschikbaar${versie ? ` (${versie})` : ""}`}
      </p>
      {status !== "fout" && (
        <button
          onClick={bijwerken}
          disabled={status === "bezig"}
          className="shrink-0 rounded-sm bg-gold px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy-dark hover:bg-gold/90 disabled:opacity-60"
        >
          {status === "bezig" ? "Bezig..." : "Bijwerken"}
        </button>
      )}
    </div>
  );
}
