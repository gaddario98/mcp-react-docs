#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Configuration ────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Helper to make API calls to GitHub with optional authentication
async function fetchGitHubAPI(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "mcp-react-docs-server",
    ...options.headers,
  };

  if (GITHUB_TOKEN) {
    headers.Authorization = `token ${GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API Error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

async function fetchRawFile(
  repo: string,
  branch: string,
  path: string,
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File not found: ${path} in ${repo}`);
    }
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }

  return response.text();
}

// ─── Package Registry ──────────────────────────────────────────────────────────

interface PackageInfo {
  id: string;
  name: string;
  description: string;
  repo: string;
  branch: string;
  basePath: string; // Directory inside the monorepo
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
    repo: "gaddario98/react-core",
    branch: "master",
    basePath: "",
    readmePath: "README.md",
    typesPath: null,
    github: `https://github.com/gaddario98/react-core`,
  },
  {
    id: "react-form",
    name: "@gaddario98/react-form",
    description:
      "Dynamic, type-safe form builder on TanStack React Form with Jotai state",
    repo: "gaddario98/react-base-form",
    branch: "master",
    basePath: "",
    readmePath: "README.md",
    typesPath: "types.ts",
    github: `https://github.com/gaddario98/react-base-form`,
  },
  {
    id: "react-queries",
    name: "@gaddario98/react-queries",
    description:
      "Unified data fetching layer on TanStack Query + Jotai: queries, mutations, WebSockets",
    repo: "gaddario98/react-base-queries",
    branch: "master",
    basePath: "",
    readmePath: "README.md",
    typesPath: "types.ts",
    github: `https://github.com/gaddario98/react-base-queries`,
  },
  {
    id: "react-pages",
    name: "@gaddario98/react-pages",
    description:
      "Page orchestrator: forms + queries + SEO + lazy loading + cross-platform",
    repo: "gaddario98/react-base-pages",
    branch: "master",
    basePath: "",
    readmePath: "README.md",
    typesPath: "types.ts",
    github: `https://github.com/gaddario98/react-base-pages`,
  },
];

function findPackage(id: string): PackageInfo | undefined {
  return PACKAGES.find(
    (p) =>
      p.id === id || p.name === id || p.id === id.replace(/^@gaddario98\//, ""),
  );
}

// ─── MCP Server ─────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "gaddario98-react-docs",
  version: "1.1.0",
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
    async () => {
      try {
        const text = await fetchRawFile(pkg.repo, pkg.branch, pkg.readmePath);
        return {
          contents: [
            {
              uri: `docs://${pkg.id}/readme`,
              mimeType: "text/markdown",
              text,
            },
          ],
        };
      } catch (error: any) {
        return {
          contents: [
            {
              uri: `docs://${pkg.id}/readme`,
              mimeType: "text/markdown",
              text: `Error loading README: ${error.message}`,
            },
          ],
        };
      }
    },
  );
}

// ─── Tools ──────────────────────────────────────────────────────────────────────

// 1. list_packages
server.registerTool(
  "list_packages",
  {
    description:
      "List all available @gaddario98 React packages with their descriptions and GitHub links",
  },
  async () => {
    // Determine version by fetching the root package.json
    let version = "unknown";
    try {
      const pkgJsonText = await fetchRawFile(
        "gaddario98/react-core",
        "master",
        "package.json",
      );
      const pkgJson = JSON.parse(pkgJsonText);
      version = pkgJson.version;
    } catch {
      // ignore
    }

    const list = PACKAGES.map(
      (p) =>
        `### ${p.name}\n- **ID**: \`${p.id}\`\n- **Description**: ${p.description}\n- **GitHub**: ${p.github}`,
    ).join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `# @gaddario98 React Packages (v${version})\n\n${list}\n\n---\n\n**Usage**:\nUse \`get_package_docs\` to read the full README, \`get_package_types\` for TypeScript types, or \`search_source\` to find specific patterns.`,
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

    try {
      const text = await fetchRawFile(pkg.repo, pkg.branch, pkg.readmePath);
      return {
        content: [{ type: "text" as const, text }],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching documentation: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
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
      try {
        const subPkgs = PACKAGES.filter((p) => p.typesPath !== null);
        const subTypesPromises = subPkgs.map(async (p) => {
          try {
            const content = await fetchRawFile(p.repo, p.branch, p.typesPath!);
            return `// ═══ ${p.name} types ═══\n// File: ${p.typesPath}\n\n${content}`;
          } catch {
            return `// ═══ ${p.name} types: Not Available ═══`;
          }
        });

        const subTypes = (await Promise.all(subTypesPromises)).join("\n\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `// @gaddario98/react-core aggregated types\n// The core package re-exports from sub-modules:\n\n${subTypes}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    }

    try {
      const text = await fetchRawFile(pkg.repo, pkg.branch, pkg.typesPath);
      return {
        content: [
          {
            type: "text" as const,
            text: `// ${pkg.name} — ${pkg.typesPath}\n\n${text}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching types: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
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

    // If no file specified, list all source files via GitHub Tree API
    if (!filePath) {
      try {
        const treeData = await fetchGitHubAPI(
          `/repos/${pkg.repo}/git/trees/${pkg.branch}?recursive=1`,
        );

        const IGNORE_PATTERNS = [
          "node_modules",
          "dist",
          ".git",
          ".github",
          ".claude",
        ];
        const files = (treeData.tree as any[])
          .filter((item) => item.type === "blob")
          .map((item) => item.path as string)
          .filter((path) => {
            // Only include files in the package's base path
            if (pkg.basePath && !path.startsWith(pkg.basePath + "/"))
              return false;

            // Ignore specific folders
            for (const ignore of IGNORE_PATTERNS) {
              if (path.includes(`/${ignore}/`) || path.startsWith(`${ignore}/`))
                return false;
            }

            // Only include common source code extensions
            return path.match(/\.(ts|tsx|js|jsx)$/);
          })
          .map((path) =>
            pkg.basePath ? path.replace(pkg.basePath + "/", "") : path,
          );

        return {
          content: [
            {
              type: "text" as const,
              text: `# Source files in ${pkg.name}\n\n${files.map((f) => `- \`${f}\``).join("\n")}\n\n---\nUse \`get_package_source\` with a \`filePath\` to read a specific file.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing files: ${error.message}${!GITHUB_TOKEN ? "\nNote: Rate limiting may occur without GITHUB_TOKEN configured." : ""}`,
            },
          ],
          isError: true,
        };
      }
    }

    const fullPath = pkg.basePath ? `${pkg.basePath}/${filePath}` : filePath;

    try {
      const text = await fetchRawFile(pkg.repo, pkg.branch, fullPath);
      return {
        content: [
          {
            type: "text" as const,
            text: `// ${pkg.name} — ${filePath}\n\n${text}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching source file: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// 5. search_source
server.registerTool(
  "search_source",
  {
    description:
      "Search for a pattern across all source files of a @gaddario98 React package using GitHub Code Search. Requires GITHUB_TOKEN environment variable for best results.",
    inputSchema: {
      packageId: z
        .string()
        .describe("Package identifier, or 'all' to search across all packages"),
      pattern: z
        .string()
        .describe(
          "Search text to find in source files (GitHub Search syntax is supported)",
        ),
    },
  },
  async ({ packageId, pattern }) => {
    const pkg = findPackage(packageId);

    let query = `${pattern} in:file`;

    if (packageId !== "all" && pkg) {
      query += ` repo:${pkg.repo}`;
    } else {
      // Search across all repos
      const repos = Array.from(new Set(PACKAGES.map((p) => p.repo)));
      query += ` ${repos.map((r) => `repo:${r}`).join(" ")}`;
    }

    try {
      const searchData = await fetchGitHubAPI(
        `/search/code?q=${encodeURIComponent(query)}`,
      );

      if (!searchData.items || searchData.items.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No results found on GitHub for pattern "${pattern}" in ${packageId === "all" ? "any package" : packageId}`,
            },
          ],
        };
      }

      const output = searchData.items
        .map((item: any) => {
          let pkgIdMatch = "react-core";
          const repoFullName = item.repository.full_name;

          if (repoFullName === "gaddario98/react-base-form")
            pkgIdMatch = "react-form";
          else if (repoFullName === "gaddario98/react-base-queries")
            pkgIdMatch = "react-queries";
          else if (repoFullName === "gaddario98/react-base-pages")
            pkgIdMatch = "react-pages";

          return `**${repoFullName} (${pkgIdMatch})** — \`${item.path}\`\n[View File on GitHub](${item.html_url})`;
        })
        .join("\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `# GitHub Search results for "${pattern}"\n\nFound ${searchData.total_count} files containing the pattern:\n\n${output}\n\nUse \`get_package_source\` to read the specific contents of a file.`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `GitHub API Search Error: ${error.message}\n\nNote: GitHub Code Search requires authentication. Make sure GITHUB_TOKEN is set in your environment.`,
          },
        ],
        isError: true,
      };
    }
  },
);

// ─── Start Server ───────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 gaddario98-react-docs MCP server running on stdio");
  const reposList = Array.from(new Set(PACKAGES.map((p) => p.repo))).join(", ");
  console.error(
    `📦 Serving ${PACKAGES.length} packages from GitHub (${reposList})`,
  );
  if (!GITHUB_TOKEN) {
    console.error(
      "⚠️  GITHUB_TOKEN is not set. API rate limits will apply for 'search_source' and 'get_package_source' listing.",
    );
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
