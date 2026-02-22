#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, relative, extname, resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Package Registry ──────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGES_ROOT = resolve(__dirname, "../../react-base-core");

interface PackageInfo {
  id: string;
  name: string;
  description: string;
  dir: string;
  readmePath: string;
  typesPath: string | null;
  github: string;
}

const PACKAGES: PackageInfo[] = [
  {
    id: "react-core",
    name: "@gaddario98/react-core",
    description:
      "Modular, type-safe React framework: state, forms, queries, pages, localization, auth, notifications",
    dir: PACKAGES_ROOT,
    readmePath: join(PACKAGES_ROOT, "README.md"),
    typesPath: null, // core re-exports from sub-modules
    github: "https://github.com/gaddario98/react-core",
  },
  {
    id: "react-form",
    name: "@gaddario98/react-form",
    description:
      "Dynamic, type-safe form builder on TanStack React Form with Jotai state",
    dir: join(PACKAGES_ROOT, "form"),
    readmePath: join(PACKAGES_ROOT, "form", "README.md"),
    typesPath: join(PACKAGES_ROOT, "form", "types.ts"),
    github: "https://github.com/gaddario98/react-form",
  },
  {
    id: "react-queries",
    name: "@gaddario98/react-queries",
    description:
      "Unified data fetching layer on TanStack Query + Jotai: queries, mutations, WebSockets",
    dir: join(PACKAGES_ROOT, "queries"),
    readmePath: join(PACKAGES_ROOT, "queries", "README.md"),
    typesPath: join(PACKAGES_ROOT, "queries", "types.ts"),
    github: "https://github.com/gaddario98/react-queries",
  },
  {
    id: "react-pages",
    name: "@gaddario98/react-pages",
    description:
      "Page orchestrator: forms + queries + SEO + lazy loading + cross-platform",
    dir: join(PACKAGES_ROOT, "pages"),
    readmePath: join(PACKAGES_ROOT, "pages", "README.md"),
    typesPath: join(PACKAGES_ROOT, "pages", "types.ts"),
    github: "https://github.com/gaddario98/react-pages",
  },
];

// ─── Utilities ──────────────────────────────────────────────────────────────────

function readFileSafe(path: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return `Error: file not found at ${path}`;
  }
}

function findPackage(id: string): PackageInfo | undefined {
  return PACKAGES.find(
    (p) =>
      p.id === id || p.name === id || p.id === id.replace(/^@gaddario98\//, ""),
  );
}

/**
 * Recursively collect all source files in a directory,
 * skipping node_modules, dist, .git, and other non-source dirs.
 */
function collectSourceFiles(
  dir: string,
  base: string = dir,
  extensions: string[] = [".ts", ".tsx", ".js", ".jsx"],
): string[] {
  const IGNORE = new Set([
    "node_modules",
    "dist",
    ".git",
    ".github",
    ".claude",
  ]);
  const results: string[] = [];

  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath, base, extensions));
    } else if (extensions.includes(extname(entry.name))) {
      results.push(relative(base, fullPath));
    }
  }

  return results;
}

/**
 * Simple grep: search for a pattern in all source files of a package.
 */
function searchInPackage(
  pkg: PackageInfo,
  pattern: string,
  maxResults: number = 20,
): { file: string; line: number; content: string }[] {
  const files = collectSourceFiles(pkg.dir);
  const results: { file: string; line: number; content: string }[] = [];
  let regex: RegExp;

  try {
    regex = new RegExp(pattern, "gi");
  } catch {
    regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  }

  for (const file of files) {
    if (results.length >= maxResults) break;

    const fullPath = join(pkg.dir, file);
    try {
      const content = readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (results.length >= maxResults) break;
        if (regex.test(lines[i])) {
          results.push({
            file,
            line: i + 1,
            content: lines[i].trim(),
          });
          regex.lastIndex = 0; // reset for global regex
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  return results;
}

// ─── MCP Server ─────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "gaddario98-react-docs",
  version: "1.0.0",
});

// ─── Resources ──────────────────────────────────────────────────────────────────

for (const pkg of PACKAGES) {
  server.registerResource(
    `${pkg.id}-readme`,
    `docs://${pkg.id}/readme`,
    {
      description: `${pkg.name} — full README documentation`,
      mimeType: "text/markdown",
    },
    () => ({
      contents: [
        {
          uri: `docs://${pkg.id}/readme`,
          mimeType: "text/markdown",
          text: readFileSafe(pkg.readmePath),
        },
      ],
    }),
  );
}

// ─── Tools ──────────────────────────────────────────────────────────────────────

// 1. list_packages
server.registerTool(
  "list_packages",
  {
    description:
      "List all available @gaddario98 React packages with their descriptions, versions, and GitHub links",
  },
  async () => {
    // Read version from root package.json
    let version = "unknown";
    try {
      const rootPkg = JSON.parse(
        readFileSync(join(PACKAGES_ROOT, "package.json"), "utf-8"),
      );
      version = rootPkg.version;
    } catch {
      // ignore
    }

    const list = PACKAGES.map(
      (p) =>
        `### ${p.name}\n- **ID**: \`${p.id}\`\n- **Description**: ${p.description}\n- **GitHub**: ${p.github}\n- **Directory**: \`${relative(PACKAGES_ROOT, p.dir) || "."}\``,
    ).join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `# @gaddario98 React Packages (v${version})\n\n${list}\n\n---\n\n**Usage**: Use \`get_package_docs\` to read the full README, \`get_package_types\` for TypeScript types, or \`search_source\` to find specific patterns.`,
        },
      ],
    };
  },
);

// 2. get_package_docs
server.registerTool(
  "get_package_docs",
  {
    description:
      "Get the full README.md documentation for a specific @gaddario98 React package",
    inputSchema: {
      packageId: z
        .string()
        .describe(
          "Package identifier: 'react-core', 'react-form', 'react-queries', or 'react-pages'",
        ),
    },
  },
  async ({ packageId }) => {
    const pkg = findPackage(packageId);
    if (!pkg) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Package "${packageId}" not found. Available: ${PACKAGES.map((p) => p.id).join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: readFileSafe(pkg.readmePath),
        },
      ],
    };
  },
);

// 3. get_package_types
server.registerTool(
  "get_package_types",
  {
    description:
      "Get the TypeScript type definitions (types.ts) for a specific @gaddario98 React package",
    inputSchema: {
      packageId: z
        .string()
        .describe(
          "Package identifier: 'react-form', 'react-queries', or 'react-pages'",
        ),
    },
  },
  async ({ packageId }) => {
    const pkg = findPackage(packageId);
    if (!pkg) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Package "${packageId}" not found. Available: ${PACKAGES.map((p) => p.id).join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    if (!pkg.typesPath) {
      // For react-core, aggregate type info from sub-modules
      const subTypes = PACKAGES.filter((p) => p.typesPath)
        .map(
          (p) =>
            `// ═══ ${p.name} types ═══\n// File: ${relative(PACKAGES_ROOT, p.typesPath!)}\n\n${readFileSafe(p.typesPath!)}`,
        )
        .join("\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `// @gaddario98/react-core aggregated types\n// The core package re-exports from sub-modules:\n\n${subTypes}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `// ${pkg.name} — ${relative(PACKAGES_ROOT, pkg.typesPath)}\n\n${readFileSafe(pkg.typesPath)}`,
        },
      ],
    };
  },
);

// 4. get_package_source
server.registerTool(
  "get_package_source",
  {
    description:
      "Read the contents of a specific source file from a @gaddario98 React package. Use list_packages first to see available packages, then explore files.",
    inputSchema: {
      packageId: z
        .string()
        .describe(
          "Package identifier: 'react-core', 'react-form', 'react-queries', or 'react-pages'",
        ),
      filePath: z
        .string()
        .optional()
        .describe(
          "Relative path to the file within the package directory (e.g., 'hooks/useFormManager.tsx'). Omit to list all source files.",
        ),
    },
  },
  async ({ packageId, filePath }) => {
    const pkg = findPackage(packageId);
    if (!pkg) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Package "${packageId}" not found. Available: ${PACKAGES.map((p) => p.id).join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    // If no file specified, list all source files
    if (!filePath) {
      const files = collectSourceFiles(pkg.dir);
      return {
        content: [
          {
            type: "text" as const,
            text: `# Source files in ${pkg.name}\n\n${files.map((f) => `- \`${f}\``).join("\n")}\n\n---\nUse \`get_package_source\` with a \`filePath\` to read a specific file.`,
          },
        ],
      };
    }

    const fullPath = join(pkg.dir, filePath);

    // Security: ensure file is within pkg dir
    if (!fullPath.startsWith(pkg.dir)) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: path traversal not allowed",
          },
        ],
        isError: true,
      };
    }

    if (!existsSync(fullPath)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `File not found: ${filePath}\n\nAvailable files:\n${collectSourceFiles(
              pkg.dir,
            )
              .map((f) => `- ${f}`)
              .join("\n")}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `// ${pkg.name} — ${filePath}\n\n${readFileSafe(fullPath)}`,
        },
      ],
    };
  },
);

// 5. search_source
server.registerTool(
  "search_source",
  {
    description:
      "Search for a pattern (text or regex) across all source files of a @gaddario98 React package. Returns matching lines with file location.",
    inputSchema: {
      packageId: z
        .string()
        .describe("Package identifier, or 'all' to search across all packages"),
      pattern: z
        .string()
        .describe("Search pattern (text or regex) to find in source files"),
      maxResults: z
        .number()
        .optional()
        .default(20)
        .describe("Maximum number of results to return (default: 20)"),
    },
  },
  async ({ packageId, pattern, maxResults }) => {
    const packagesToSearch =
      packageId === "all"
        ? PACKAGES
        : ([findPackage(packageId)].filter(Boolean) as PackageInfo[]);

    if (packagesToSearch.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Package "${packageId}" not found. Available: ${PACKAGES.map((p) => p.id).join(", ")}, or use 'all'`,
          },
        ],
        isError: true,
      };
    }

    const allResults: {
      pkg: string;
      file: string;
      line: number;
      content: string;
    }[] = [];

    for (const pkg of packagesToSearch) {
      const results = searchInPackage(
        pkg,
        pattern,
        maxResults - allResults.length,
      );
      allResults.push(...results.map((r) => ({ pkg: pkg.id, ...r })));
      if (allResults.length >= maxResults) break;
    }

    if (allResults.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No results found for pattern "${pattern}" in ${packageId === "all" ? "any package" : packageId}`,
          },
        ],
      };
    }

    const output = allResults
      .map(
        (r) =>
          `**${r.pkg}** — \`${r.file}:${r.line}\`\n\`\`\`\n${r.content}\n\`\`\``,
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `# Search results for "${pattern}"\n\nFound ${allResults.length} match${allResults.length > 1 ? "es" : ""}:\n\n${output}`,
        },
      ],
    };
  },
);

// ─── Start Server ───────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 gaddario98-react-docs MCP server running on stdio");
  console.error(`📦 Serving ${PACKAGES.length} packages from ${PACKAGES_ROOT}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
