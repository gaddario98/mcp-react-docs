# @gaddario98/mcp-react-docs

MCP (Model Context Protocol) server che fornisce ad AI coding assistants la documentazione e il codice sorgente dei package React `@gaddario98`.

## Packages serviti

| Package                     | Descrizione                                                  |
| --------------------------- | ------------------------------------------------------------ |
| `@gaddario98/react-core`    | Framework React modulare: state, forms, queries, pages, auth |
| `@gaddario98/react-form`    | Form builder dinamico su TanStack Form + Jotai               |
| `@gaddario98/react-queries` | Data fetching su TanStack Query + Jotai                      |
| `@gaddario98/react-pages`   | Page orchestrator: forms + queries + SEO + lazy loading      |

## Tools disponibili

| Tool                 | Descrizione                                       |
| -------------------- | ------------------------------------------------- |
| `list_packages`      | Elenca tutti i package con versione e descrizione |
| `get_package_docs`   | Ritorna il README.md completo di un package       |
| `get_package_types`  | Ritorna le definizioni TypeScript (`types.ts`)    |
| `get_package_source` | Legge qualsiasi file sorgente di un package       |
| `search_source`      | Cerca un pattern (regex) nei file sorgente        |

## Configurazione per AI Tools

### Gemini Code Assist

Aggiungi al file `.gemini/settings.json` del tuo workspace:

```json
{
  "mcpServers": {
    "react-docs": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/gaddario98/Documents/projects-workspace/packages/mcp-react-docs/src/index.ts"
      ]
    }
  }
}
```

### Claude Code / Claude Desktop

Aggiungi a `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "react-docs": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/gaddario98/Documents/projects-workspace/packages/mcp-react-docs/src/index.ts"
      ]
    }
  }
}
```

### Cursor

In Cursor Settings → MCP Servers → Add:

- **Name**: `react-docs`
- **Command**: `npx tsx /Users/gaddario98/Documents/projects-workspace/packages/mcp-react-docs/src/index.ts`

### VS Code + Copilot (settings.json)

```json
{
  "mcp": {
    "servers": {
      "react-docs": {
        "command": "npx",
        "args": [
          "tsx",
          "/Users/gaddario98/Documents/projects-workspace/packages/mcp-react-docs/src/index.ts"
        ]
      }
    }
  }
}
```

## Test con MCP Inspector

```bash
cd /Users/gaddario98/Documents/projects-workspace/packages/mcp-react-docs
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

## Sviluppo

```bash
# Avvia il server in modalità watch
yarn dev

# Avvia normalmente
yarn start
```
