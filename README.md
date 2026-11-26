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

## Geplant

- automatischer stündlicher Abruf der NIDO-Daten (GitHub Actions, API-Schlüssel als Secret `NIDO_API_KEY`)
- Webcam-Standbild (`assets/cam.jpg`)
- Überarbeitung von Design und Animationen

Datenstand der ersten Version: 19.10.–24.11.2026, letzter Stundenwert 24.11.2026 18:00.
