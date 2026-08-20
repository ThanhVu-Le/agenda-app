// AGENT_SHARED_SECRET is geen echt geheim — het staat mee in de publieke app-build
// (web/desktop/mobiel) en is enkel een lichte drempel tegen willekeurig misbruik van
// de backend-proxy, niet een vervanging voor echte authenticatie. Zie RELEASE.md /
// het verdienmodel-gesprek voor wanneer dit naar echte per-gebruiker auth moet.
export const AGENT_ENDPOINT = "https://mijn-agenda-agent.vu-thanhle.workers.dev/chat";
export const AGENT_SHARED_SECRET = "Tmo0hLwCcrz5Awybp9gmBl9GJ9kRnsxhDFzpHRNjt4M";
