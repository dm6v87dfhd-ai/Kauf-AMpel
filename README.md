# Giropuffer-Ampel – iOS ruhige Version

Diese Version ist für GitHub Pages mit `/docs` vorbereitet.

## Struktur

```text
docs/
  index.html
  styles.css
  app.js
  manifest.webmanifest
  service-worker.js
  .nojekyll
  icons/
README.md
```

## Update auf GitHub

1. ZIP entpacken.
2. Im GitHub-Repository den Ordner `docs` öffnen.
3. Die Dateien aus diesem neuen `docs`-Ordner hochladen und die alten Dateien ersetzen.
4. Unten auf `Commit changes` klicken.
5. GitHub Pages bleibt auf `main` und `/docs` eingestellt.

## Falls das iPhone die alte Version zeigt

Der Service-Worker-Cache wurde auf `giropuffer-ampel-v4-ios-ruhig-1` geändert.
Falls trotzdem noch die alte Optik erscheint:

1. GitHub-Pages-Link in Safari öffnen.
2. Seite neu laden.
3. Falls die Home-Bildschirm-App noch alt ist: App vom Homescreen löschen und neu hinzufügen.

## Datenschutz

Keine JSON-Sicherungen mit echten Finanzdaten in GitHub hochladen. Die App speichert Eingaben lokal im Browser.
