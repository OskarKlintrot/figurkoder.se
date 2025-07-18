#!/usr/bin/env node

/**
 * Simple test script to validate MCP server tools without running the full MCP protocol
 */

import { 
  loadGameData, 
  flattenGameData, 
  getGameCategories, 
  findByKey, 
  findByValue 
} from './dist/data-loader.js';

async function runTests() {
  console.log('🧪 Testing Figurkoder MCP Server Tools...\n');
  
  try {
    // Test 1: Load game data
    console.log('Test 1: Loading game data...');
    const gameData = await loadGameData();
    console.log(`✅ Loaded ${Object.keys(gameData).length} categories`);
    
    // Test 2: Flatten data
    console.log('\nTest 2: Flattening data...');
    const allItems = flattenGameData(gameData);
    console.log(`✅ Found ${allItems.length} total figurkoder items`);
    
    // Test 3: Get categories
    console.log('\nTest 3: Getting categories...');
    const categories = getGameCategories(gameData);
    console.log(`✅ Categories: ${categories.join(', ')}`);
    
    // Test 4: Lookup specific items
    console.log('\nTest 4: Looking up specific figurkoder...');
    const lookupTests = ['00', '42', '99', 'Anna', 'Lars', 'Januari'];
    for (const key of lookupTests) {
      const item = findByKey(gameData, key);
      if (item) {
        console.log(`✅ ${key} -> ${item.value} (${item.category})`);
      } else {
        console.log(`❌ ${key} -> Not found`);
      }
    }
    
    // Test 5: Search by value
    console.log('\nTest 5: Searching by mnemonic value...');
    const searchTests = ['ring', 'bil', 'sol'];
    for (const query of searchTests) {
      const items = findByValue(gameData, query);
      console.log(`✅ "${query}" -> ${items.length} matches:`);
      items.slice(0, 3).forEach(item => {
        console.log(`   ${item.key}: ${item.value} (${item.category})`);
      });
    }
    
    // Test 6: Random selection
    console.log('\nTest 6: Random figurkod selection...');
    const randomIndex = Math.floor(Math.random() * allItems.length);
    const randomItem = allItems[randomIndex];
    console.log(`✅ Random: ${randomItem.key} -> ${randomItem.value} (${randomItem.category})`);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();