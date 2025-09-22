# Playwright Test Instructions for Copilot Sessions

## Quick Start (TL;DR)
```bash
cd /home/runner/work/figurkoder.se/figurkoder.se
npm install
# For Copilot sessions (use system Chrome):
export COPILOT_SESSION=true
npm test  # Should work immediately
```

## Why These Instructions Are Needed

Copilot has encountered issues running Playwright tests in this repository due to browser installation challenges. These instructions provide a reliable workflow for running tests in Copilot sessions.

## Complete Setup & Testing Workflow

### 1. Initial Setup
```bash
# Navigate to project directory
cd /home/runner/work/figurkoder.se/figurkoder.se

# Install npm dependencies
npm install
```

### 2. Browser Configuration
The project is configured to automatically select the appropriate browser:
- **Local development**: Uses downloaded Chromium for consistency
- **Copilot sessions**: Uses system Chrome to avoid download failures
- **CI environments**: Uses system Chrome for better performance

**Key configuration in `playwright.config.js`:**
```javascript
projects: [
  {
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      // Use system Chrome in Copilot sessions (where Chromium download fails)
      // Use Chromium locally for better consistency with CI/production
      ...(process.env.COPILOT_SESSION === "true" || process.env.GITHUB_ACTIONS
        ? { channel: "chrome" }
        : {}),
    },
  },
],
```

**For Copilot Sessions Only:**
```bash
# Set environment variable to use system Chrome
export COPILOT_SESSION=true
npm test
```

### 3. Running Tests

#### Run All Tests
```bash
npm test
```

#### Run Specific Test Categories
```bash
# Smoke tests (basic functionality)
npx playwright test tests/smoke.spec.js

# App initialization tests
npx playwright test tests/app-initialization.spec.js

# Navigation tests
npx playwright test tests/navigation.spec.js

# Game functionality tests
npx playwright test tests/game/

# PWA feature tests
npx playwright test tests/pwa-features.spec.js
```

#### Interactive Testing
```bash
# Run tests with visual UI (helpful for debugging)
npm run test:ui

# Run tests with visible browser (headed mode)
npm run test:headed
```

#### Manual Test Server
```bash
# Start test server manually (runs on localhost:3001)
npm run serve:test
```

### 4. Troubleshooting

#### If Browser Download Fails
In Copilot sessions, browser downloads often fail. The configuration automatically uses system Chrome when the `COPILOT_SESSION` environment variable is set.

**Symptoms:**
```
Error: Failed to download Chromium 140.0.7339.16
```

**Solution:**
```bash
# Set environment variable to use system Chrome instead
export COPILOT_SESSION=true
npm test
```

#### If Tests Fail to Start
```bash
# Verify system Chrome is available
google-chrome --version
chromium --version

# Check if npm dependencies are installed
ls node_modules/@playwright

# Reinstall if needed
npm install
```

#### If Test Server Won't Start
```bash
# Check if port 3001 is available
lsof -i :3001

# Kill any existing servers
pkill -f "http-server.*3001"

# Restart test server manually
npm run serve:test
```

### 5. Debugging Individual Tests

#### Run Single Test File
```bash
npx playwright test tests/smoke.spec.js --headed
```

#### Run Single Test
```bash
npx playwright test -g "should load the main page successfully"
```

#### Generate Test Report
```bash
npx playwright test --reporter=html
npx playwright show-report
```

## Test Commands Quick Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests |
| `npm run test:ui` | Interactive test runner |
| `npm run test:headed` | Tests with visible browser |
| `npm run serve:test` | Manual test server |
| `npx playwright test --help` | Full command options |

## Project-Specific Test Notes

- **Adaptive browser selection**: Uses Chromium locally, Chrome in Copilot/CI environments
- **Test server runs on port 3001** (automatically started)
- **Swedish language content** in tests and assertions
- **PWA functionality** includes offline testing
- **Game timer tests** are timing-sensitive and may be flaky
- **Modular architecture** with game-specific test utilities

## Success Indicators

✅ **Setup Working Correctly:**
- Browser automatically selected (Chromium locally, Chrome in Copilot)
- Test server starts on port 3001
- Tests pass consistently
- Smoke tests pass 100%

✅ **Ready for Development:**
- Individual test files can be run
- Test UI mode works
- Manual test server can be started
- Test reports generate properly

This configuration has been tested and verified to work in Copilot environments as of the last update.