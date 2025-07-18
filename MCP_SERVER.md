# Model Context Protocol (MCP) Server Configuration

This directory contains the MCP server implementation for the figurkoder.se project.

## What is MCP?

The Model Context Protocol (MCP) is an open standard that enables AI assistants to securely connect to external data sources and tools. It allows AI models to access live data, interact with external systems, and provide more accurate and up-to-date responses.

## Project Structure

```
mcp-server/
├── src/
│   ├── index.ts          # Main MCP server implementation
│   ├── data-loader.ts    # Game data loading and processing
│   ├── types.ts          # TypeScript type definitions
│   └── gameData.json     # Converted figurkod data
├── dist/                 # Compiled JavaScript output
├── package.json          # Node.js project configuration
├── tsconfig.json         # TypeScript configuration
├── test-tools.js         # Test script for validation
└── README.md             # Documentation
```

## Available Tools

The MCP server exposes the following tools to AI assistants:

### 1. `get_all_figurkoder`
- **Purpose**: Retrieve all available figurkoder
- **Parameters**: 
  - `category` (optional): Filter by specific category
- **Use case**: Browse all available mnemonics

### 2. `lookup_figurkod`
- **Purpose**: Find a specific figurkod by its key
- **Parameters**: 
  - `key` (required): The identifier to look up
- **Use case**: Get the mnemonic for a specific number or name

### 3. `search_figurkoder`
- **Purpose**: Search for figurkoder by mnemonic content
- **Parameters**: 
  - `query` (required): Search term
  - `category` (optional): Limit to specific category
- **Use case**: Find all mnemonics containing specific words

### 4. `get_categories`
- **Purpose**: List all available figurkod categories
- **Parameters**: None
- **Use case**: Discover what types of figurkoder are available

### 5. `get_random_figurkod`
- **Purpose**: Get a random figurkod for practice
- **Parameters**: 
  - `category` (optional): Get random from specific category
- **Use case**: Training and practice scenarios

### 6. `validate_figurkod`
- **Purpose**: Check if a given answer matches a figurkod
- **Parameters**: 
  - `key` (required): The figurkod identifier
  - `answer` (required): The answer to validate
- **Use case**: Educational testing and validation

## Data Categories

The server provides access to the following figurkod categories:

- **Tvåsiffriga tal**: Two-digit numbers (00-99) with mnemonics
- **Tresiffriga tal**: Three-digit numbers with mnemonics  
- **Bokstäver**: Letters with mnemonics
- **Veckodagar**: Weekdays with mnemonics
- **Månaderna**: Months with mnemonics
- **Namn**: General names with mnemonics
- **Kvinnonamn**: Female names with mnemonics
- **Mansnamn**: Male names with mnemonics

## Usage Examples

Here are some example interactions with the MCP server:

### Get a specific figurkod
```json
{
  "tool": "lookup_figurkod",
  "arguments": { "key": "42" }
}
```
Response: `{"key": "42", "value": "VaTtenmelon", "category": "Tvåsiffriga tal"}`

### Search for mnemonics
```json
{
  "tool": "search_figurkoder", 
  "arguments": { "query": "ring" }
}
```

### Get random practice item
```json
{
  "tool": "get_random_figurkod",
  "arguments": { "category": "Kvinnonamn" }
}
```

## Installation and Setup

1. Navigate to the mcp-server directory:
   ```bash
   cd mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Test the tools:
   ```bash
   node test-tools.js
   ```

## Running the MCP Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## Integration with MCP Clients

To use this server with an MCP client (like Claude Desktop or other AI assistants), add it to your MCP configuration:

```json
{
  "mcpServers": {
    "figurkoder": {
      "command": "node",
      "args": ["/path/to/figurkoder.se/mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

## Benefits for AI Assistants

With this MCP server, AI assistants can:

1. **Provide accurate figurkod information** - Look up any figurkod instantly
2. **Help with memory training** - Generate practice sessions and validate answers
3. **Explain the mnemonic system** - Browse categories and understand the structure
4. **Create custom exercises** - Use random selection and search capabilities
5. **Support learning** - Validate user answers and provide feedback

## Technical Details

- **Protocol**: Model Context Protocol (MCP) over stdio
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Data Format**: JSON (converted from original JavaScript)
- **Total Items**: 1,348 figurkoder across 8 categories

This MCP server bridges the gap between AI assistants and the rich figurkod training data, enabling more interactive and helpful memory training experiences.