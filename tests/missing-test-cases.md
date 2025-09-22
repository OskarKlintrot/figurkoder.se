# Missing Test Cases

This document contains comprehensive test cases for the Figurkoder.se PWA, organized by priority and functionality area. These test cases are based on analysis of the codebase, git history, and existing bugs that could have been caught by automated testing.

## Overview

- **Total Categories**: 11 (Timer tests completed ✅)
- **High Priority**: 3 categories (Game State, Show Answer, Navigation)
- **Medium Priority**: 6 categories (Progress Bar, Vibration, Data Range, Results, PWA, Accessibility)
- **Low Priority**: 2 categories (Performance, Cross-browser)

---

## 1. Game State Management Tests 🎮

**Priority**: HIGH  
**Risk Level**: Critical  
**Complexity**: Very High

### Description

Complex state transitions between learning/training modes, running/paused/stopped states, and various game configurations. State inconsistencies lead to unpredictable behavior.

### Related Files

- `src/js/game/play.js` (lines 45-71: `gameState` object)
- `src/js/game/play.js` (lines 340-426: `updateButtonStates()`)
- `src/js/game/play.js` (lines 219-248: `updateLearningMode()`)

### Historical Bugs Prevented

- `e3c5613`: "fix: Couldn't switch range in learning mode after stopping a session"
- `60cd7d3`: "fix: Error with result if stopping from paused session"
- `c742759`: "fix: Don't toggle mid-play"
- `39b3882`: "fix: Stop-and-start now works in learning mode"

### Test Cases

#### TC-2.1: Learning vs Training Mode Switching

**Objective**: Test mode changes during different game states  
**Steps**:

1. Start training mode game
2. Pause game
3. Switch to learning mode
4. Resume game
5. Verify correct behavior (answer shown, auto-advance enabled)

**Expected Result**: Mode switch works correctly in all game states

#### TC-2.2: Button State Consistency

**Objective**: Verify correct button enable/disable states for all game phases  
**Steps**:

1. Test button states in: stopped, running, paused states
2. For each state, verify: play, pause, stop, show, next buttons
3. Test both learning and training modes
4. Verify input field states (enabled/disabled)

**Expected Result**: Buttons always in correct state for current game phase

#### TC-2.3: Pause State Preservation

**Objective**: Test that game state is correctly maintained during pause/resume  
**Steps**:

1. Start game, advance through several items
2. Pause at item #5
3. Verify all state: current item, results, timing
4. Resume and continue
5. Verify state continuity

**Expected Result**: Perfect state preservation across pause/resume cycles

#### TC-2.4: Range Switching After Stop

**Objective**: Verify range inputs work correctly after stopping a session  
**Steps**:

1. Start game with range 0-20
2. Stop game
3. Change range to 50-60
4. Start new game
5. Verify correct items are loaded

**Expected Result**: Range changes work correctly after stopping

#### TC-2.5: Game Reset on Stop

**Objective**: Ensure all state variables are properly reset when stopping  
**Steps**:

1. Start game, advance through items
2. Show some answers, accumulate timing data
3. Stop game
4. Verify all game state variables reset to defaults
5. Start new game and verify clean state

**Expected Result**: Complete state reset, no data pollution between games

#### TC-2.6: Multi-round Game Progression

**Objective**: Test games with multiple rounds and proper round tracking  
**Steps**:

1. Start training mode with 2 rounds, small range
2. Complete first round
3. Verify round counter updates
4. Complete second round
5. Verify results include both rounds

**Expected Result**: Round progression works correctly, all data tracked

---

## 2. Show Answer ("VISA") Functionality Tests 👁️

**Priority**: HIGH  
**Risk Level**: High  
**Complexity**: Medium

### Description

The "VISA" (show answer) functionality is a critical user interaction with complex state management around when answers are visible, button states, and interaction with timers.

### Related Files

- `src/js/game/play.js` (lines 1176-1224: `showAnswer()`)
- `src/js/game/play.js` (lines 1043-1086: answer visibility in `showCurrentItem()`)

### Historical Bugs Prevented

- `9938784`: "Fix VISA button revealing next image after pressing NÄSTA"
- `8d44284`: Button state issues when VISA is pressed in training mode

### Test Cases

#### TC-3.1: Answer Reveal in Training Mode

**Objective**: Test "VISA" button shows correct answer  
**Steps**:

1. Start training mode game
2. Verify answer is hidden (shows "•••")
3. Click "VISA" button
4. Verify correct answer is displayed
5. Verify button becomes disabled

**Expected Result**: Answer reveals correctly, button state updates

#### TC-3.2: Answer Visibility State Tracking

**Objective**: Verify `showingSolution` state is correctly maintained  
**Steps**:

1. Start training mode
2. Click "VISA" on first item
3. Advance to next item
4. Verify answer is hidden again on new item
5. Check internal `showingSolution` state

**Expected Result**: State correctly tracks answer visibility per item

#### TC-3.3: VISA Button State Management

**Objective**: Test button state changes after revealing answer  
**Steps**:

1. Start training mode
2. Verify "VISA" button is enabled
3. Click "VISA" button
4. Verify "VISA" button becomes disabled
5. Advance to next item
6. Verify "VISA" button is re-enabled

**Expected Result**: Button state correctly reflects answer visibility

#### TC-3.4: Answer Persistence on Mode Change

**Objective**: Test answer visibility when switching learning/training modes  
**Steps**:

1. Start training mode
2. Click "VISA" to show answer
3. Switch to learning mode
4. Verify answer remains visible
5. Switch back to training mode
6. Verify answer visibility state

**Expected Result**: Answer visibility preserved across mode changes

#### TC-3.5: VISA During Timer Countdown

**Objective**: Test interaction between manual VISA and automatic timer  
**Steps**:

1. Start training mode with 10-second timer
2. Wait 3 seconds
3. Click "VISA" button
4. Verify timer stops
5. Verify game enters paused state

**Expected Result**: Timer cancelled, game paused when answer manually shown

#### TC-3.6: Next Item After VISA

**Objective**: Verify next item correctly resets answer visibility  
**Steps**:

1. Start training mode
2. Click "VISA" on item 1
3. Click "NÄSTA" to advance
4. Verify item 2 answer is hidden
5. Verify "VISA" button is re-enabled

**Expected Result**: Clean state reset for each new item

---

## 3. Navigation and Back Button Tests 🔙

**Priority**: HIGH  
**Risk Level**: High  
**Complexity**: High

### Description

Complex navigation context switching between main menu, game page, and results page. The back button behavior needs to be context-aware, especially from the results page.

### Related Files

- `src/js/navigation.js` (entire file: navigation state management)
- `src/js/game/play.js` (lines 1298-1335: results page navigation)

### Historical Bugs Prevented

- `843c6ac`: "Fix back button navigation from results page to return to game session"
- `bd7cc4e`: "fix: Hide back button on main menu"

### Test Cases

#### TC-4.1: Results Page Back Button

**Objective**: Test back button returns to game session (not main menu)  
**Steps**:

1. Start and complete a training game
2. Navigate to results page
3. Click back button
4. Verify returns to game page with same configuration
5. Verify game can be restarted with same settings

**Expected Result**: Back button context-aware, returns to game session

#### TC-4.2: Game Page Navigation Context

**Objective**: Verify proper context is maintained when navigating to/from game  
**Steps**:

1. Navigate to game page from specific tile
2. Check that correct game type is selected
3. Navigate away and back
4. Verify context preservation

**Expected Result**: Game context preserved across navigation

#### TC-4.3: Header Back Button Reset

**Objective**: Test header back button behavior across different page transitions  
**Steps**:

1. Navigate through: main → game → results
2. Use back button from results (should go to game)
3. Use back button from game (should go to main)
4. Verify header back button resets correctly

**Expected Result**: Header back button always has correct behavior

#### TC-4.4: URL State Management

**Objective**: Verify URLs update correctly for all navigation scenarios  
**Steps**:

1. Navigate through all pages
2. Check URL updates for each navigation
3. Test browser back/forward buttons
4. Test direct URL access
5. Verify deep linking works

**Expected Result**: URL state consistently reflects current page

#### TC-4.5: Context Data Preservation

**Objective**: Test that game context data survives navigation  
**Steps**:

1. Configure game settings
2. Start game, accumulate some results
3. Navigate away and back
4. Verify all context data preserved

**Expected Result**: No data loss during navigation transitions

---

## 4. Progress Bar and UI State Tests 📊

**Priority**: MEDIUM  
**Risk Level**: Medium  
**Complexity**: Medium

### Description

Visual consistency of progress bars and UI layout stability. Progress bars can interfere with layout and button functionality.

### Related Files

- `src/js/game/play.js` (lines 82-95: `resetProgressBar()`)
- `src/css/game.css` (progress bar styling)

### Historical Bugs Prevented

- `42e0302`: "fix: Reset progress bar on replay"
- `0c1d7b6`: "fix: Progress bar broke layout on stop in learning mode"
- `e706eeb`: "fix: Progress bar hides button content"
- `cf78715`: "fix: Button content misaligned"

### Test Cases

#### TC-5.1: Progress Bar Reset on Replay

**Objective**: Verify progress bar resets correctly when replaying  
**Steps**:

1. Complete a game session
2. Go to results page
3. Click replay
4. Verify progress bar starts at 0%
5. Verify visual appearance is correct

**Expected Result**: Clean progress bar reset on replay

#### TC-5.2: Progress Bar Layout Stability

**Objective**: Test that progress bar doesn't break page layout  
**Steps**:

1. Start game and let progress bar fill
2. Pause game
3. Stop game
4. Check layout integrity at each step
5. Test on different screen sizes

**Expected Result**: Layout remains stable throughout progress bar lifecycle

#### TC-5.3: Button Content Alignment

**Objective**: Verify button text/icons remain properly aligned with progress bar  
**Steps**:

1. Start game with progress bar
2. Check button text visibility and alignment
3. Test with different progress percentages
4. Verify icon and text positioning

**Expected Result**: Button content always visible and properly aligned

---

## 5. Vibration and Device Integration Tests 📱

**Priority**: MEDIUM  
**Risk Level**: Low  
**Complexity**: Low

### Description

Device-specific functionality including vibration and screen wake lock features.

### Related Files

- `src/js/game/play.js` (vibration logic in `nextItem()`)
- `src/js/keep-screen-on.js` (wake lock functionality)

### Historical Bugs Prevented

- `e0316dd`/`5936eaf`: Vibration behavior fixes and reverts

### Test Cases

#### TC-6.1: Vibration in Learning Mode Only

**Objective**: Test vibration occurs only during auto-advance in learning mode  
**Steps**:

1. Enable vibration setting
2. Test learning mode auto-advance
3. Test training mode (should not vibrate)
4. Test manual "NÄSTA" clicks (should not vibrate)

**Expected Result**: Vibration only on learning mode auto-advance

#### TC-6.2: Screen Wake Lock Management

**Objective**: Test wake lock during games and release on pause/stop  
**Steps**:

1. Start game and verify wake lock activates
2. Pause game and verify wake lock releases
3. Resume and verify wake lock re-activates
4. Stop game and verify wake lock releases

**Expected Result**: Wake lock properly managed throughout game lifecycle

---

## 6. Data Range and Input Validation Tests 📝

**Priority**: MEDIUM  
**Risk Level**: Medium  
**Complexity**: Low

### Description

Form validation and data filtering for game range selection.

### Related Files

- `src/js/game/play.js` (range validation and data filtering)
- `src/js/game/data.js` (data arrays)

### Test Cases

#### TC-7.1: Range Validation (0-99)

**Objective**: Test valid and invalid range inputs  
**Steps**:

1. Test valid ranges: 0-10, 50-60, 90-99
2. Test invalid ranges: -5-10, 50-150, 60-40
3. Verify appropriate error handling
4. Test boundary values: 0-0, 99-99

**Expected Result**: Only valid ranges accepted, appropriate error messages

#### TC-7.2: Data Filtering Accuracy

**Objective**: Verify correct items are loaded for specified ranges  
**Steps**:

1. Select range 10-15
2. Start game and verify only items 10-15 appear
3. Test with different ranges
4. Verify data filtering logic

**Expected Result**: Exact range filtering, no items outside specified range

---

## 7. Results and Performance Tracking Tests 📈

**Priority**: MEDIUM  
**Risk Level**: Medium  
**Complexity**: Medium

### Description

Game completion statistics and performance tracking accuracy.

### Related Files

- `src/js/game/play.js` (result recording logic)
- `src/js/game/result.js` (results display)

### Test Cases

#### TC-8.1: Result Recording Accuracy

**Objective**: Verify timing and answer-shown status are correctly recorded  
**Steps**:

1. Start training game
2. Complete items with various patterns:
   - Answer immediately with VISA
   - Wait for auto-reveal
   - Answer quickly without VISA
3. Verify all timing data is accurate
4. Verify answer-shown flags are correct

**Expected Result**: Perfect accuracy in result recording

#### TC-8.2: Results Page Display

**Objective**: Test that statistics and individual results are properly shown  
**Steps**:

1. Complete game with mixed performance
2. Navigate to results page
3. Verify summary statistics
4. Verify individual item results
5. Test results sorting and display

**Expected Result**: All results accurately displayed with correct statistics

---

## 8. PWA and Offline Functionality Tests 📱

**Priority**: MEDIUM  
**Risk Level**: Medium  
**Complexity**: Medium

### Description

Progressive Web App features including service worker, caching, and offline functionality.

### Related Files

- `src/sw.js` (service worker)
- `src/site.webmanifest` (PWA manifest)

### Test Cases

#### TC-9.1: Service Worker Version Updates

**Objective**: Test that new versions trigger cache invalidation  
**Steps**:

1. Load app with current service worker
2. Deploy new version with updated service worker
3. Reload page
4. Verify new version loads correctly

**Expected Result**: Seamless updates with proper cache invalidation

#### TC-9.2: Offline Game Functionality

**Objective**: Test core game features work without network  
**Steps**:

1. Load app while online
2. Disconnect from network
3. Test core game functionality
4. Verify no network errors

**Expected Result**: Full game functionality available offline

---

## 9. Accessibility and Keyboard Navigation Tests ♿

**Priority**: MEDIUM  
**Risk Level**: Low  
**Complexity**: Medium

### Description

Inclusive design and keyboard navigation functionality.

### Related Files

- `src/js/game/play.js` (keyboard event handlers)

### Test Cases

#### TC-10.1: Keyboard Shortcuts

**Objective**: Test Space/Enter for show answer, Arrow keys/N for next  
**Steps**:

1. Start training game
2. Test Space bar to show answer
3. Test Enter key to show answer
4. Test Arrow keys to advance
5. Test 'N' key to advance

**Expected Result**: All keyboard shortcuts work as expected

#### TC-10.2: Focus Management

**Objective**: Test keyboard navigation through game controls  
**Steps**:

1. Navigate using Tab key through all controls
2. Test focus indicators are visible
3. Test Enter/Space activate focused elements
4. Verify focus management during state changes

**Expected Result**: Complete keyboard accessibility

---

## 10. Performance and Memory Tests ⚡

**Priority**: LOW  
**Risk Level**: Low  
**Complexity**: High

### Description

Long-term stability and performance under extended usage.

### Test Cases

#### TC-11.1: Long Gaming Sessions

**Objective**: Test extended play sessions for memory leaks  
**Steps**:

1. Run continuous game sessions for 30+ minutes
2. Monitor memory usage
3. Test with large datasets
4. Check for performance degradation

**Expected Result**: Stable performance, no memory leaks

#### TC-11.2: Timer Cleanup Verification

**Objective**: Verify all timers are properly cancelled when leaving pages  
**Steps**:

1. Start multiple game sessions
2. Navigate away during active timers
3. Monitor for orphaned timers
4. Check browser performance

**Expected Result**: Complete timer cleanup, no resource leaks

---

## 11. Cross-Browser and Responsive Tests 🌐

**Priority**: MEDIUM  
**Risk Level**: Medium  
**Complexity**: Medium

### Description

Compatibility across different browsers and device sizes.

### Test Cases

#### TC-12.1: Mobile Viewport Testing

**Objective**: Test game functionality on mobile screen sizes  
**Steps**:

1. Test on various mobile screen sizes
2. Verify touch interactions work
3. Test landscape/portrait orientations
4. Verify UI elements are accessible

**Expected Result**: Full functionality on all mobile devices

#### TC-12.2: Browser API Compatibility

**Objective**: Test Web APIs graceful degradation  
**Steps**:

1. Test on browsers without vibration API
2. Test on browsers without wake lock API
3. Verify graceful fallbacks
4. Test core functionality remains intact

**Expected Result**: Graceful degradation, core functionality preserved

---

## Implementation Priority

### Phase 1 (Immediate - High Priority)

1. Timer and Countdown System Tests
2. Game State Management Tests
3. Show Answer Functionality Tests
4. Navigation and Back Button Tests

### Phase 2 (Next - Medium Priority)

1. Progress Bar and UI State Tests
2. Data Range and Input Validation Tests
3. Results and Performance Tracking Tests
4. PWA and Offline Functionality Tests

### Phase 3 (Future - Lower Priority)

1. Vibration and Device Integration Tests
2. Accessibility and Keyboard Navigation Tests
3. Performance and Memory Tests
4. Cross-Browser and Responsive Tests

---

## Test Utilities Needed

### Common Operations

- `startGame(mode, range, timeLimit)` - Helper to start games with specific settings
- `waitForCountdown(seconds)` - Wait for specific countdown time
- `assertButtonStates(expectedStates)` - Verify button enable/disable states
- `navigateToResults()` - Complete game and go to results
- `mockTimer()` - Mock timer functionality for reliable testing

### Test Data Fixtures

- Small test datasets (5-10 items) for faster test execution
- Known game scenarios with predictable outcomes
- Edge case data (empty ranges, single items, etc.)

### Performance Monitoring

- Memory usage tracking utilities
- Timer leak detection
- Network request monitoring
- Cache verification helpers

---

_Last Updated: September 22, 2025_  
_Total Test Cases: 45+ individual test cases across 12 categories_
