# ALINA ALMA – Monitoring Bürgeralm

Öffentliche Monitoring-Seite des vertical farm institute (vfi) für die ALINA auf der Bürgeralm (1.500 m).
Auf der vfi-Website wird diese Seite unter `verticalfarminstitute.com/alinaalma/` per iframe eingebunden.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html` | die Seite (Layout, Diagramme, Texte) |
| `data/data.json` | Messdaten (Stundenwerte, Ereignisse, Datenlücken, Tagesprofil) |
| `assets/` | Logos und Rendering des ALINA-Regals |
| `fonts/` | Source Sans 3, lokal eingebunden (keine Verbindung zu Google Fonts) |

Die Seite lädt `data/data.json` beim Öffnen. Neue Messdaten bedeuten also: nur diese Datei ersetzen.
Layout und Daten sind getrennt und lassen sich unabhängig voneinander ändern.

## Automatischer Datenabruf

`.github/workflows/nido.yml` startet jede Stunde (Minute 17, UTC) `scripts/update_data.py`.
Das Skript holt die neuen Messpunkte aus der NIDO REST API
(`GET https://api.nidopro.com/rest/v1/devices/<Geräte-ID>/data`, Header `x-api-key`),
mittelt sie zu Stundenwerten und berechnet EC-Sprünge, Datenlücken, Tagesprofil und Kälteeinbrüche neu.
Ändert sich etwas, speichert der Workflow `data/data.json` im Repository.

Voraussetzung: Secret `NIDO_API_KEY` unter *Settings → Secrets and variables → Actions*.
Von Hand starten: *Actions → NIDO-Daten aktualisieren → Run workflow*.

## Geplant

- Webcam-Standbild (`assets/cam.jpg`)
- Überarbeitung von Design und Animationen

Datenstand der ersten Version: 19.10.–24.11.2026, letzter Stundenwert 24.11.2026 18:00.
