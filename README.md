# Giropuffer-Ampel iPhone Web-App

Diese Web-App ist für GitHub Pages vorbereitet. Sie basiert auf der Logik der Excel-Datei `Giropuffer_Ampel_repariert_v3.xlsx`, enthält aber keine persönlichen Kontobewegungen aus der Excel, damit du sie sicher in ein öffentliches GitHub-Repository hochladen kannst.

## Enthaltene Excel-Logik

- Stichtag / Kontostand-Datum
- aktueller Giro-Kontostand
- nächster Gehaltseingang
- Kaufbetrag prüfen
- Soll-Giropuffer / Warnschwelle / kritische Schwelle
- offene Bewegungen bis Gehalt
- nur sichere und offene Bewegungen zählen
- Tagesprognose bis zum Gehalt
- niedrigster Prognose-Kontostand
- niedrigster Prognose-Kontostand nach Kauf
- Ampel: GRÜN / GELB / DUNKELGELB / ROT
- Datenalter und Aussagequalität

## Dateien

- `index.html` – Startdatei der App
- `styles.css` – Gestaltung und Farben
- `app.js` – Berechnung, lokale Speicherung, Import/Export
- `manifest.webmanifest` – iPhone-/PWA-Informationen
- `service-worker.js` – Offline-Cache
- `.nojekyll` – GitHub Pages soll die Dateien unverändert ausliefern
- `icons/` – App-Icons

## GitHub Pages

1. Neues Repository erstellen, z. B. `giropuffer-app`.
2. Den Inhalt dieses Ordners hochladen. Wichtig: `index.html` muss direkt im Hauptverzeichnis liegen.
3. In GitHub: `Settings` → `Pages`.
4. `Source`: `Deploy from a branch`.
5. Branch: `main`, Ordner: `/ root`.
6. Speichern.
7. GitHub zeigt danach den Link zur Website an.

## iPhone

1. GitHub-Pages-Link in Safari öffnen.
2. Teilen-Symbol antippen.
3. `Zum Home-Bildschirm` wählen.
4. Namen prüfen und hinzufügen.

## Sicherheit

Die App-Dateien enthalten keine persönlichen Kontodaten. Deine Eingaben werden lokal im Browser gespeichert. Für Sicherungen nutze den JSON-Export in der App. Lade JSON-Sicherungen nicht in ein öffentliches GitHub-Repository hoch.

## Anpassungen

- Schwellenwerte: direkt in der App ändern oder in `app.js` unter `DEFAULT_STATE.inputs` anpassen.
- Farben: in `styles.css` im Block `:root` ändern.
- App-Name: in `index.html` und `manifest.webmanifest` ändern.
- Offline-Cache nach Änderungen: in `service-worker.js` den Wert `CACHE_NAME` erhöhen, z. B. `...-2`.
