#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
  loadGameData,
  flattenGameData,
  getGameCategories,
  getItemsByCategory,
  findByKey,
  findByValue,
} from './data-loader.js';
import type { GameData, FigurkodItem, SearchResult } from './types.js';

class FigurkodMCPServer {
  private server: Server;
  private gameData: Record<string, GameData> | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'figurkoder-mcp-server',
        version: '1.0.0',
        description: 'Swedish mnemonic (figurkod) training data access and tools',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandlers();
  }

  private async initializeData(): Promise<void> {
    if (!this.gameData) {
      this.gameData = await loadGameData();
    }
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_all_figurkoder',
            description: 'Get all available figurkoder (Swedish mnemonics) with their keys and values',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Optional: Filter by category (e.g., "Siffror 0-99", "Kvinnonamn")',
                },
              },
            },
          },
          {
            name: 'lookup_figurkod',
            description: 'Look up a specific figurkod by its key (number, name, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'The key to look up (e.g., "42", "Anna", "Maria")',
                },
              },
              required: ['key'],
            },
          },
          {
            name: 'search_figurkoder',
            description: 'Search figurkoder by mnemonic value or partial matches',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search term to find in mnemonic values',
                },
                category: {
                  type: 'string',
                  description: 'Optional: Limit search to specific category',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_categories',
            description: 'Get all available figurkod categories',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_random_figurkod',
            description: 'Get a random figurkod for practice',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Optional: Get random figurkod from specific category',
                },
              },
            },
          },
          {
            name: 'validate_figurkod',
            description: 'Check if a given answer matches the correct figurkod',
            inputSchema: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'The figurkod key',
                },
                answer: {
                  type: 'string',
                  description: 'The answer to validate',
                },
              },
              required: ['key', 'answer'],
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        await this.initializeData();

        switch (name) {
          case 'get_all_figurkoder':
            return await this.handleGetAllFigurkoder(args);
          case 'lookup_figurkod':
            return await this.handleLookupFigurkod(args);
          case 'search_figurkoder':
            return await this.handleSearchFigurkoder(args);
          case 'get_categories':
            return await this.handleGetCategories(args);
          case 'get_random_figurkod':
            return await this.handleGetRandomFigurkod(args);
          case 'validate_figurkod':
            return await this.handleValidateFigurkod(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error}`
        );
      }
    });
  }

  private async handleGetAllFigurkoder(args: any) {
    if (!this.gameData) throw new Error('Game data not loaded');

    const category = args?.category;
    let items: FigurkodItem[];

    if (category) {
      items = getItemsByCategory(this.gameData, category);
      if (items.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No figurkoder found for category: ${category}. Available categories: ${getGameCategories(this.gameData).join(', ')}`,
            },
          ],
        };
      }
    } else {
      items = flattenGameData(this.gameData);
    }

    const result = {
      total: items.length,
      category: category || 'All categories',
      figurkoder: items,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleLookupFigurkod(args: any) {
    if (!this.gameData) throw new Error('Game data not loaded');

    const key = args?.key;
    if (!key) {
      throw new McpError(ErrorCode.InvalidParams, 'Key parameter is required');
    }

    const item = findByKey(this.gameData, key);
    if (!item) {
      return {
        content: [
          {
            type: 'text',
            text: `No figurkod found for key: ${key}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(item, null, 2),
        },
      ],
    };
  }

  private async handleSearchFigurkoder(args: any) {
    if (!this.gameData) throw new Error('Game data not loaded');

    const query = args?.query;
    if (!query) {
      throw new McpError(ErrorCode.InvalidParams, 'Query parameter is required');
    }

    const items = findByValue(this.gameData, query);
    const category = args?.category;

    let filteredItems = items;
    if (category) {
      filteredItems = items.filter(item => item.category === category);
    }

    const result = {
      query,
      category: category || 'All categories',
      matches: filteredItems.length,
      results: filteredItems,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetCategories(args: any) {
    if (!this.gameData) throw new Error('Game data not loaded');

    const categories = getGameCategories(this.gameData);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ categories }, null, 2),
        },
      ],
    };
  }

  private async handleGetRandomFigurkod(args: any) {
    if (!this.gameData) throw new Error('Game data not loaded');

    const category = args?.category;
    let items: FigurkodItem[];

    if (category) {
      items = getItemsByCategory(this.gameData, category);
      if (items.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No figurkoder found for category: ${category}`,
            },
          ],
        };
      }
    } else {
      items = flattenGameData(this.gameData);
    }

    const randomIndex = Math.floor(Math.random() * items.length);
    const randomItem = items[randomIndex];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(randomItem, null, 2),
        },
      ],
    };
  }

  private async handleValidateFigurkod(args: any) {
    if (!this.gameData) throw new Error('Game data not loaded');

    const key = args?.key;
    const answer = args?.answer;

    if (!key || !answer) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Both key and answer parameters are required'
      );
    }

    const item = findByKey(this.gameData, key);
    if (!item) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              valid: false,
              error: `No figurkod found for key: ${key}`,
            }, null, 2),
          },
        ],
      };
    }

    const isValid = item.value.toLowerCase().includes(answer.toLowerCase()) ||
                   answer.toLowerCase().includes(item.value.toLowerCase());

    const result = {
      key: item.key,
      correct_answer: item.value,
      user_answer: answer,
      valid: isValid,
      category: item.category,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private setupErrorHandlers(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Figurkoder MCP server running on stdio');
  }
}

const server = new FigurkodMCPServer();
server.run().catch(console.error);