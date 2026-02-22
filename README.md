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
      "args": ["-y", "github:gaddario98/mcp-react-docs"],
      "env": {
        "GITHUB_TOKEN": "ghp_il_tuo_token_qui"
      }
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
      "args": ["-y", "github:gaddario98/mcp-react-docs"],
      "env": {
        "GITHUB_TOKEN": "ghp_il_tuo_token_qui"
      }
    }
  }
}
```

### Cursor

In Cursor Settings → MCP Servers → Add:

- **Name**: `react-docs`
- **Command**: `npx -y github:gaddario98/mcp-react-docs`

### VS Code + Copilot (settings.json)

```json
{
  "mcp": {
    "servers": {
      "react-docs": {
        "command": "npx",
        "args": ["-y", "github:gaddario98/mcp-react-docs"],
        "env": {
          "GITHUB_TOKEN": "ghp_il_tuo_token_qui"
        }
      }
    }
  }
}
```

## 🔑 Come ottenere il GITHUB_TOKEN

Dato che l'MCP invia richieste direttamente a GitHub, senza un token incapperai nel limite di **60 richieste all'ora**, limitando pesantemente o bloccando strumenti come `search_source`.

Per generare un Token:

1. Accedi a GitHub e vai in **Settings** > **Developer Settings** > **Personal access tokens** > **Tokens (classic)** (o usa i _Fine-grained tokens_ se preferisci).
2. Clicca su **Generate new token (classic)**.
3. Assegna un nome (es. `local_mcp_server`).
4. Nessuno scope particolare è obbligatorio se i repo (`gaddario98/react-core`, ecc.) sono pubblici. Se in futuro i repo diverranno privati, spunta l'accesso `repo`.
5. Clicca generate e copia il token (inizierà con `ghp_...`).
6. Aggiungilo all'interno dell'oggetto `"env"` in tutte le configurazioni del tuo Editor come mostrato negli esempi sopra. In Cursor puoi configurarlo dal setup dell'MCP Server nelle Settings UI.

## Test con MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx -y github:gaddario98/mcp-react-docs
```

## Sviluppo

```bash
# Avvia il server in modalità watch
yarn dev

# Avvia normalmente
yarn start
```
