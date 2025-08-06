# Figurkoder.se AI Agent Instructions

## Project Overview
This is a Swedish **figurkod** (mnemonic image) training Progressive Web App (PWA) built with vanilla JavaScript. Users memorize alphanumeric codes for names using visual mnemonics, then practice recall through timed exercises.

## Architecture
- **Single-file monolith**: All HTML, inline CSS via `styles.css`, and JavaScript in `index.html` and `script.js`
- **Vanilla JavaScript**: No frameworks - uses DOM manipulation, ES6 modules, and Web APIs
- **PWA**: Service worker (`sw.js`) enables offline functionality and app installation
- **Static hosting**: Azure Static Web Apps with automatic deployment via GitHub Actions

## Key Files & Structure
```
src/
├── index.html           # Main SPA with all pages as hidden divs
├── script.js            # Game logic, navigation, PWA features (~1600 lines)
├── gameData.js          # Training data arrays (names + mnemonics)
├── sw.js                # Service worker for caching and offline support
├── styles.css           # CSS variables + responsive design
└── staticwebapp.config.json # Azure SWA routing config
```

## Core Patterns

### Game State Management
All game state lives in the global `gameState` object:
```javascript
const gameState = {
  currentGameData: [],      // Active filtered dataset
  originalGameData: [],     // Backup of original data
  isGameRunning: false,     // Game session state
  gameResults: [],          // Performance tracking
  // ... other state properties
}
```

### Page Navigation
Single-page app using CSS classes to show/hide page divs:
- Use `navigateToPage(pageId)` to switch pages
- Each page is a `<div class="page">` with unique ID
- Navigation updates URL history and header state

### Game Types & Data Structure
Games are defined in `gameData.js` as arrays of `[name, mnemonic]` pairs:
- `femaleNames`, `maleNames`: Person name training data
- Range-based training: Users select numeric ranges (0-99) to filter data
- Two modes: Learning (show answers) vs Training (timed recall)

### Timer System
Uses dual timing approach:
- **Game timer**: `setTimeout` for auto-advancing items
- **Countdown timer**: `requestAnimationFrame` for smooth UI updates
- Pause/resume functionality with state preservation

## Development Workflow

### Local Development
```powershell
# Simple HTTP server (required for ES6 modules)
dotnet serve -d src -p 61949
# Or use VS Code Live Server extension
```

### Version Management
Service worker version auto-updates on deployment:
- GitHub Action replaces `let version = "x.y.z"` in `sw.js`
- Format: `YYMMDD.HHMM` (e.g., "241215.1430")
- Triggers cache invalidation for PWA updates

### CSS Architecture
Uses CSS custom properties extensively:
- Color scheme: `--color-primary`, `--color-secondary`, etc.
- Spacing scale: `--spacing-xs` through `--spacing-5xl`
- Dark mode support via `@media (prefers-color-scheme: dark)`

## Key Integrations
- **Screen Wake Lock API**: Prevents screen timeout during games
- **Vibration API**: Haptic feedback for mobile users
- **Material Icons**: Google Fonts for UI icons
- **Azure Static Web Apps**: Hosting with SPA routing fallback

## Testing Considerations
- Test PWA functionality: offline mode, installation prompt
- Test game state persistence across page navigation
- Verify timer accuracy and pause/resume behavior
- Check responsive design across mobile/desktop viewports
- Validate Swedish language content rendering

## Common Tasks
- **Add new game type**: Extend `gameData.js` arrays and update game selection logic
- **Modify game mechanics**: Focus on timer functions in `script.js` (~lines 1000-1200)
- **Update PWA**: Modify `sw.js` cache strategy or `site.webmanifest`
- **Style changes**: Use existing CSS custom properties when possible
