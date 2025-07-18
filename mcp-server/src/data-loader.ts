import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { GameData, FigurkodItem } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load and parse the game data from the JSON file
 */
export async function loadGameData(): Promise<Record<string, GameData>> {
  try {
    // Read the gameData.json file 
    const gameDataPath = join(__dirname, 'gameData.json');
    const gameDataContent = await readFile(gameDataPath, 'utf-8');
    const gameData = JSON.parse(gameDataContent);
    
    if (!gameData || typeof gameData !== 'object') {
      throw new Error('Invalid game data structure - expected object');
    }
    
    return gameData as Record<string, GameData>;
  } catch (error) {
    console.error('Failed to load game data:', error);
    throw new Error(`Failed to load figurkod data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert game data to a flat list of figurkod items
 */
export function flattenGameData(gameData: Record<string, GameData>): FigurkodItem[] {
  const items: FigurkodItem[] = [];
  
  for (const [gameKey, game] of Object.entries(gameData)) {
    for (const [key, value] of game.data) {
      items.push({
        key,
        value,
        category: game.title
      });
    }
  }
  
  return items;
}

/**
 * Get all available game categories
 */
export function getGameCategories(gameData: Record<string, GameData>): string[] {
  return Object.values(gameData).map(game => game.title);
}

/**
 * Get items for a specific category
 */
export function getItemsByCategory(gameData: Record<string, GameData>, category: string): FigurkodItem[] {
  for (const [gameKey, game] of Object.entries(gameData)) {
    if (game.title === category) {
      return game.data.map(([key, value]) => ({
        key,
        value,
        category: game.title
      }));
    }
  }
  return [];
}

/**
 * Find figurkod by key
 */
export function findByKey(gameData: Record<string, GameData>, searchKey: string): FigurkodItem | null {
  const allItems = flattenGameData(gameData);
  return allItems.find(item => item.key.toLowerCase() === searchKey.toLowerCase()) || null;
}

/**
 * Find figurkod by value (mnemonic)
 */
export function findByValue(gameData: Record<string, GameData>, searchValue: string): FigurkodItem[] {
  const allItems = flattenGameData(gameData);
  return allItems.filter(item => 
    item.value.toLowerCase().includes(searchValue.toLowerCase())
  );
}