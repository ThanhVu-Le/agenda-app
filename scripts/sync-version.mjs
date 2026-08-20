import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const tauriConfPath = join(root, "src-tauri", "tauri.conf.json");
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf8"));
tauriConf.version = version;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");

const cargoTomlPath = join(root, "src-tauri", "Cargo.toml");
const cargoToml = readFileSync(cargoTomlPath, "utf8");
const updatedCargoToml = cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`);
writeFileSync(cargoTomlPath, updatedCargoToml);

console.log(`Versie gesynchroniseerd naar ${version} in tauri.conf.json en Cargo.toml`);
