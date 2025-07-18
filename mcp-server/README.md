# Figurkoder MCP Server

A Model Context Protocol (MCP) server for accessing Swedish figurkod (mnemonic) training data from figurkoder.se.

## Overview

This MCP server provides AI assistants with tools to interact with Swedish figurkoder - a mnemonic system that maps numbers and names to memorable images or phrases to aid memory training.

## Features

The server exposes the following tools:

### `get_all_figurkoder`
Get all available figurkoder with their keys and values.
- **Optional parameter**: `category` - Filter by specific category

### `lookup_figurkod`
Look up a specific figurkod by its key.
- **Required parameter**: `key` - The key to look up (e.g., "42", "Anna")

### `search_figurkoder`
Search figurkoder by mnemonic value or partial matches.
- **Required parameter**: `query` - Search term
- **Optional parameter**: `category` - Limit search to specific category

### `get_categories`
Get all available figurkod categories.

### `get_random_figurkod`
Get a random figurkod for practice.
- **Optional parameter**: `category` - Get from specific category

### `validate_figurkod`
Check if a given answer matches the correct figurkod.
- **Required parameters**: `key`, `answer`

## Installation

```bash
npm install
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run built version
npm start

# Type checking
npm run type-check

# Run linter
npm run lint
```

## Usage

### As an MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "figurkoder": {
      "command": "node",
      "args": ["/path/to/figurkoder-mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### Example Tool Calls

```javascript
// Get all figurkoder
await callTool('get_all_figurkoder', {});

// Look up a specific number
await callTool('lookup_figurkod', { key: '42' });

// Search for figurkoder containing "ring"
await callTool('search_figurkoder', { query: 'ring' });

// Get random figurkod from numbers category
await callTool('get_random_figurkod', { category: 'Siffror 0-99' });

// Validate an answer
await callTool('validate_figurkod', { 
  key: '42', 
  answer: 'Prilla'
});
```

## Data Source

The server reads figurkod data from the main application's `src/gameData.js` file, which contains various categories:

- **Siffror 0-99**: Numbers 0-99 with mnemonic images
- **Kvinnonamn**: Female names with mnemonics  
- **Mansnamn**: Male names with mnemonics
- **Månader**: Months with mnemonics
- **Veckodagar**: Weekdays with mnemonics

## API Response Format

All tools return JSON-formatted responses with relevant data. For example:

```json
{
  "key": "42",
  "value": "Prilla",
  "category": "Siffror 0-99"
}
```

## Contributing

This MCP server is part of the figurkoder.se project. Contributions are welcome!

## License

MIT - See the main project's license file.