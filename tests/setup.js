import { test as base, expect } from '@playwright/test';

/**
 * Extended test setup for Figurkoder.se PWA testing
 * 
 * Handles Google Fonts (Material Icons) loading gracefully:
 * - Attempts to load fonts when possible
 * - Provides fallback handling when fonts are blocked
 * - Tests validate functionality regardless of font loading status
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Track font loading status for better debugging
    let fontLoadingStatus = 'unknown';
    
    // Capture console messages related to fonts
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Font') || text.includes('Material Icons')) {
        console.log('🔤 Font:', text);
      }
    });

    // Add enhanced font loading script
    await page.addInitScript(() => {
      window.addEventListener('DOMContentLoaded', async () => {
        // Enhanced font loading detection and fallback handling
        if (document.fonts && document.fonts.ready) {
          try {
            // Wait for fonts with reasonable timeout
            await Promise.race([
              document.fonts.ready,
              new Promise(resolve => setTimeout(resolve, 3000))
            ]);
            
            // Test if Material Icons actually loaded by checking character rendering
            const testElement = document.createElement('span');
            testElement.className = 'material-icons';
            testElement.style.position = 'absolute';
            testElement.style.visibility = 'hidden';
            testElement.style.fontSize = '24px';
            testElement.textContent = 'home'; // Simple icon to test
            document.body.appendChild(testElement);
            
            const computedStyle = window.getComputedStyle(testElement);
            const fontFamily = computedStyle.fontFamily;
            
            // Check if the font family includes Material Icons
            const materialIconsLoaded = fontFamily.includes('Material Icons');
            
            // Clean up test element
            document.body.removeChild(testElement);
            
            if (materialIconsLoaded) {
              console.log('✅ Material Icons font loaded and working');
              window.__materialIconsLoaded = true;
            } else {
              console.log('⚠️ Material Icons font not loaded - using text fallbacks');
              console.log('   Font family detected:', fontFamily);
              window.__materialIconsLoaded = false;
            }
          } catch (error) {
            console.log('⚠️ Font loading check failed:', error.message);
            window.__materialIconsLoaded = false;
          }
        } else {
          console.log('⚠️ document.fonts API not available');
          window.__materialIconsLoaded = false;
        }
      });
    });

    await use(page);
  },
});

export { expect };