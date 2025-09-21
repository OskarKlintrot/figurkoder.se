# Figurkoder.se

En webbaserad träningsapp för figurkoder.

## Funktioner

- **Progressiv webbapp (PWA)** - Fungerar offline och kan installeras på hemskärmen
- **Två träningslägen:**
  - **Lära:** Memorera figurkoderna
  - **Träna:** Träning för att testa hur väl de har memorerats
- **Responsiv design** - Fungerar på alla enheter

## För utvecklare

### Teknisk översikt

Appen är byggd som en modern single-page application med:
- **Vanilla JavaScript** - Inga externa ramverk eller bibliotek
- **Service Worker** - För PWA-funktionalitet och offline-caching
- **Azure Static Web Apps** - Hosting och konfiguration

### Projektstruktur
```
src/
├── index.html           # Huvudfil med all HTML, CSS och JavaScript
├── gameData.js          # Data för figurkoder och träningsfrågor
├── sw.js                # Service Worker för PWA-funktionalitet
├── site.webmanifest     # Web App Manifest
├── staticwebapp.config.json # Azure SWA-konfiguration
└── *.png/ico            # Ikoner och favicons
```

### Lokal utveckling

För att köra appen lokalt kan du använda en enkel HTTP-server:

```powershell
# Med Python
python -m http.server 3000

# Med Node.js (http-server)
npx http-server src -p 3000

# Med VS Code Live Server extension
# Högerklicka på src/index.html och välj "Open with Live Server"
```

Appen kommer sedan att vara tillgänglig på http://localhost:3000

### Tester

Projektet använder Playwright för end-to-end-tester:

```powershell
# Installera beroenden
npm install

# Köra alla tester
npm test

# Köra tester med visuellt gränssnitt
npm run test:ui

# Köra tester med synlig webbläsare
npm run test:headed

# Starta testserver (för manuell testning)
npm run serve:test
```

**Notera**: Detta projekt använder PowerShell för alla terminal-kommandon enligt projektstandard.

#### Testmiljö och begränsningar

**Testning av PWA-funktionalitet:**
Testerna validerar offline-funktionalitet, service worker-registrering och PWA-installation, men vissa begränsningar kan uppstå i CI-miljöer.

Testerna körs automatiskt i GitHub Actions innan deployment.

### Deployment

Appen är konfigurerad för Azure Static Web Apps och använder GitHub Actions för automatisk deployment. Källkoden ligger i `src/` mappen och Azure SWA är konfigurerad att servera innehållet därifrån.

## PWA-installation

Appen fungerar som en Progressive Web App:
1. Besök https://figurkoder.se
2. I webbläsaren, välj "Lägg till på startskärmen" eller liknande alternativ
3. Appen kan nu användas offline och startas från hemskärmen

## Offline-funktionalitet

Appen använder en Service Worker för att cacha resurser och fungera offline.

## Licens

Detta projekt är licensierat under MIT License - se [LICENSE](LICENSE) filen för detaljer.

## Historik

Detta projekt startade som en uppgift i kursen [2dv607 - RIA-development with JavaScript](https://coursepress.lnu.se/kurs/ria-utveckling-med-javascript/) på [Linnéuniversitetet](https://coursepress.lnu.se/program/webbprogrammerare/) men har sedan utvecklats till en fullfunktionell PWA för träning av figurkoder.
