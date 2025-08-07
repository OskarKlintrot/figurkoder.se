# Figurkoder.se AI Agent Instructions

## Project Overview
This is a Swedish **figurkod** (mnemonic image) training Progressive Web App (PWA) built with vanilla JavaScript. Users memorize alphanumeric codes for names using visual mnemonics, then practice recall through timed exercises.

## Architecture
- **Modular JavaScript**: HTML in `index.html`, modular CSS in `css/` directory, and JavaScript split into ES6 modules in the `js/` directory
- **Modular CSS**: Split into focused files - variables, base styles, components, forms, game UI, navigation, responsive design, and utilities
- **Vanilla JavaScript**: No frameworks - uses DOM manipulation, ES6 modules, and Web APIs
- **PWA**: Service worker (`sw.js`) enables offline functionality and app installation
- **Static hosting**: Azure Static Web Apps with automatic deployment via GitHub Actions

## Key Files & Structure
```
src/
├── index.html           # Main SPA with all pages as hidden divs
├── sw.js                # Service worker for caching and offline support
├── css/                 # Modular CSS architecture (loaded directly in index.html)
│   ├── variables.css    # CSS custom properties and design tokens
│   ├── base.css         # Reset, typography, and base element styles
│   ├── components.css   # Reusable UI components and page layouts
│   ├── forms.css        # Form controls and input styling
│   ├── game.css         # Game-specific UI components and layouts
│   ├── navigation.css   # Header, navigation, and menu styling
│   ├── responsive.css   # Media queries and responsive breakpoints
│   └── utilities.css    # Utility classes and helper styles
├── js/                  # JavaScript modules (ES6)
│   ├── main.js          # Entry point and event listeners (~130 lines)
│   ├── navigation.js    # Page routing and navigation (~230 lines)
│   ├── debug.js         # Debug console and development tools (~140 lines)
│   ├── keep-screen-on.js # Screen wake lock functionality (~60 lines)
│   └── game/            # Game-specific modules (~2400 lines total)
│       ├── data.js      # Training data arrays (names + mnemonics) (~1300 lines)
│       ├── navigation.js # Game-specific navigation callbacks (~80 lines)
│       ├── menu.js      # Game selection and tile generation (~60 lines)
│       ├── play.js      # Core game logic and controls (~980 lines)
│       ├── result.js    # Results display and replay functionality (~180 lines)
│       └── utils.js     # Game state and utility functions (~150 lines)
└── staticwebapp.config.json # Azure SWA routing config
```

## Core Patterns

### Game State Management
All game state lives in the global `gameState` object exported from `game/utils.js`:
```javascript
// In js/game/utils.js
export const gameState = {
  currentGameData: [],      // Active filtered dataset
  originalGameData: [],     // Backup of original data
  isGameRunning: false,     // Game session state
  gameResults: [],          // Performance tracking
  // ... other state properties
}
```

### Modular Game Architecture
Game functionality is split into focused modules in the `js/game/` directory:
- **`data.js`**: Training data arrays (`femaleNames`, `maleNames`) with `[name, mnemonic]` pairs
- **`menu.js`**: Game selection interface and tile generation for the main menu
- **`play.js`**: Core game logic including timers, controls, and item progression
- **`result.js`**: Results display, statistics, and replay functionality
- **`navigation.js`**: Game-specific navigation callbacks and context management  
- **`utils.js`**: Shared game state, DOM caching, and utility functions

### Page Navigation
Single-page app using CSS classes to show/hide page divs:
- Use `navigateToPage(pageId)` from `navigation.js` to switch pages
- Each page is a `<div class="page">` with unique ID
- Navigation updates URL history and header state
- Context-aware navigation with callback system for page enter/leave events

### Game Types & Data Structure
Games are defined in `game/data.js` as arrays of `[name, mnemonic]` pairs:
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
The development site is always running at `http://localhost:61949`. Use **PowerShell** for all terminal commands.

```powershell
# Simple HTTP server (required for ES6 modules)
dotnet serve -d src -p 61949
# Or use VS Code Live Server extension
```

**Note**: Always use PowerShell when running terminal commands in this project.

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

**Modular CSS Structure:**
- `variables.css`: Design tokens (colors, spacing, shadows, borders, typography)
- `base.css`: CSS reset, body styles, and base element styling
- `components.css`: Page layouts and reusable UI components
- `forms.css`: Form controls, inputs, buttons, and form-specific styling
- `game.css`: Game interface components (timers, counters, overlays)
- `navigation.css`: Header, navigation menus, and page transitions
- `responsive.css`: Media queries and breakpoint-specific styles
- `utilities.css`: Helper classes and utility styles

All CSS files are loaded directly in `index.html` for parallel loading performance.

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
- **Add new game type**: Extend `game/data.js` arrays and update game selection logic
- **Modify game mechanics**: Focus on timer functions in `game/play.js` (~lines 800-1000)
- **Update PWA**: Modify `sw.js` cache strategy or `site.webmanifest`
- **Style changes**: Use existing CSS custom properties when possible; edit specific CSS modules directly (all loaded in `index.html`)
