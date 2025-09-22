# Playwright Test Instructions for Copilot Sessions

## Quick Start (TL;DR)
```bash
cd /home/runner/work/figurkoder.se/figurkoder.se
npm install
npm test  # Should work immediately with system Chrome
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
The project is configured to use **system Chrome** instead of downloading Playwright browsers. This avoids download failures that commonly occur in Copilot environments.

**Key configuration in `playwright.config.js`:**
```javascript
projects: [
  {
    name: "chromium",
    use: { 
      ...devices["Desktop Chrome"],
      channel: "chrome", // Uses system Google Chrome
    },
  },
],
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

### 4. Test Structure Overview

The project has **35 tests** across **6 test files**:

- `tests/smoke.spec.js` - Basic smoke tests (3 tests)
- `tests/app-initialization.spec.js` - App startup tests (3 tests) 
- `tests/navigation.spec.js` - Page navigation tests (5 tests)
- `tests/game/game-functionality.spec.js` - Core game logic tests (11 tests)
- `tests/game/timer-countdown-system.spec.js` - Timer system tests (8 tests)
- `tests/pwa-features.spec.js` - PWA functionality tests (5 tests)

### 5. Understanding Test Results

#### Expected Success Rate
- **28-34 tests should pass** consistently
- **1-7 tests may be flaky** due to timing or UI interaction issues
- **0 critical failures** should occur if setup is correct

#### Common Test Issues
1. **Timer-related tests** may occasionally fail due to timing sensitivity
2. **PWA tests** may be flaky in CI environments
3. **UI interaction tests** may timeout if elements are overlapped

#### Sample Successful Output
```
Running 35 tests using 4 workers
···························××··········
  2 failed
  33 passed (45.2s)
```

### 6. Troubleshooting

#### If Browser Download Fails
The most common issue is Playwright trying to download browsers. Our configuration avoids this by using system Chrome.

**Symptoms:**
```
Error: Failed to download Chromium 140.0.7339.16
```

**Solution:**
Ensure `playwright.config.js` has the `channel: "chrome"` configuration (should already be set).

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

### 7. Debugging Individual Tests

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

- **Uses system Chrome** instead of downloaded browsers
- **Test server runs on port 3001** (automatically started)
- **Swedish language content** in tests and assertions
- **PWA functionality** includes offline testing
- **Game timer tests** are timing-sensitive and may be flaky
- **Modular architecture** with game-specific test utilities

## Success Indicators

✅ **Setup Working Correctly:**
- No browser download attempts
- Test server starts on port 3001
- 28+ tests pass consistently
- Smoke tests pass 100%

✅ **Ready for Development:**
- Individual test files can be run
- Test UI mode works
- Manual test server can be started
- Test reports generate properly

This configuration has been tested and verified to work in Copilot environments as of the last update.