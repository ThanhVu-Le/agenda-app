import { isTauri } from "@tauri-apps/api/core";
import { Capacitor } from "@capacitor/core";
import { IconDownload } from "./icons";

const DOWNLOAD_ENDPOINT = "https://mijn-agenda-agent.vu-thanhle.workers.dev/download/windows";

export function DownloadButton() {
  if (isTauri() || Capacitor.isNativePlatform()) return null;

  return (
    <a
      href={DOWNLOAD_ENDPOINT}
      className="flex shrink-0 items-center gap-1.5 rounded-sm border border-gold/40 bg-navy-dark px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold hover:bg-navy-dark/70"
      title="Download de desktop-app voor Windows"
    >
      <IconDownload className="h-4 w-4" />
      Download voor Windows
    </a>
  );
}
