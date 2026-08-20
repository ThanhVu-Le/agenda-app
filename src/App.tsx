import { useAgenda } from "./state/useAgenda";
import { AgendaView } from "./components/AgendaView";
import { AgentPanel } from "./components/AgentPanel";
import { UrgencyOverview } from "./components/UrgencyOverview";
import { UpdateBanner } from "./components/UpdateBanner";
import { DownloadButton } from "./components/DownloadButton";

function App() {
  const { items, voegToe, werkBij, verwijder, toggleAfgerond } = useAgenda();

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-gold/30 bg-navy px-4 py-3 sm:px-6">
        <div>
          <h1 className="font-serif text-lg font-semibold tracking-tight text-white">Mijn agenda</h1>
          <p className="text-xs uppercase tracking-wide text-white/50">Persoonlijke agent</p>
        </div>
        <DownloadButton />
      </header>
      <UpdateBanner />

      <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-4 lg:order-1">
          <UrgencyOverview items={items} />
          <AgendaView
            items={items}
            onToggle={toggleAfgerond}
            onVerwijder={verwijder}
            onBewerk={(id, waarden) => werkBij(id, waarden)}
            onToevoegen={(waarden) => voegToe(waarden)}
          />
        </div>

        <div className="h-[70vh] w-full shrink-0 lg:order-2 lg:h-[80vh] lg:w-96">
          <AgentPanel
            items={items}
            onVoegToe={voegToe}
            onWerkBij={werkBij}
            onVerwijder={verwijder}
            onToggleAfgerond={toggleAfgerond}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
