# Releaseproces

Checklist voor de beheerder om een nieuwe versie van Mijn Agenda uit te brengen.

## Desktop (Windows, via Tauri)

Volledig geautomatiseerd zodra er getagd wordt:

1. `npm version patch` (of `minor`/`major`) — dit zet de nieuwe versie in `package.json`, `src-tauri/tauri.conf.json` en `src-tauri/Cargo.toml` (via `scripts/sync-version.mjs`), en maakt een git-tag aan.
2. `git push --follow-tags`
3. GitHub Actions (`.github/workflows/release.yml`) bouwt, ondertekent en publiceert automatisch een nieuwe GitHub Release met de installer(s) en `latest.json`.
4. Bestaande installaties zien de update automatisch bij de eerstvolgende opstart (de `UpdateBanner` in de app) — geen verdere actie nodig.

**Eenmalige set-up (al gedaan):**
- Signing keypair staat lokaal in `%USERPROFILE%\.tauri\mijn-agenda-updater.key` — **nooit verwijderen of delen**, zonder deze sleutel kunnen geen nieuwe updates meer ondertekend worden.
- De GitHub-repo secrets `TAURI_SIGNING_PRIVATE_KEY` en (optioneel) `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` moeten in **GitHub → Settings → Secrets and variables → Actions** staan, met de inhoud van bovenstaand keybestand.

## Android (via Capacitor)

Nog geen store-publicatie ingericht (geen Play Console-account). Zodra dat er is:

1. Versie bumpen in `android/app/src/main/AndroidManifest.xml` of `android/app/build.gradle` (`versionCode` +1, `versionName` bijwerken — volgt niet automatisch `package.json`).
2. `npm run cap:android`
3. In Android Studio: signed App Bundle (AAB) bouwen met de release-keystore (nog aan te maken zodra publicatie aan de orde is).
4. Uploaden naar Play Console. Gebruikers krijgen de update automatisch via de Play Store-instellingen van hun toestel.

## iOS (via Capacitor)

Vereist een Mac met Xcode — nog niet beschikbaar, dus nog niet ingericht. Zodra die er is:

1. Versie bumpen in het Xcode-project (`CFBundleShortVersionString` / `CFBundleVersion`).
2. Archiveren en uploaden via Xcode of Transporter.
3. Beoordeling door Apple afwachten, dan publiceren. Gebruikers krijgen de update automatisch via de App Store-instellingen van hun toestel.
