/**
 * app/api/mcp/route.ts
 *
 * MCP (Model Context Protocol) Server — Next.js App Router endpoint.
 *
 * Compatible with:
 *   • Vercel serverless functions (Node.js runtime)
 *   • Notion Custom MCP Server (Streamable HTTP transport)
 *   • @modelcontextprotocol/sdk (latest)
 *
 * Transport: StreamableHTTPServerTransport
 *   GET  /api/mcp  → SSE stream (server-to-client push)
 *   POST /api/mcp  → JSON-RPC messages (client-to-server)
 *   DELETE /api/mcp → Session termination
 *
 * Each request creates an isolated server + transport instance.
 * No shared state — fully stateless, safe for serverless deployment.
 *
 * Install dependency before using:
 *   npm install @modelcontextprotocol/sdk zod
 */

import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

/* ─── Vercel runtime configuration ───────────────────────────────────────── */

/** Use Node.js runtime — required by the MCP SDK (uses Node-specific APIs). */
export const runtime = "nodejs";

/**
 * Allow up to 60 seconds per request.
 * SSE connections held by Notion may stay open for several seconds.
 */
export const maxDuration = 60;

/* ─── Server factory ─────────────────────────────────────────────────────── */

/**
 * Creates a fully configured McpServer instance.
 *
 * A new instance is built per request so that the serverless function
 * remains completely stateless. Shared state (DB connections, caches)
 * should be handled outside this factory if needed.
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "mostafa-academic-mcp",
    version: "1.0.0",
  });

  /* ── Tool: health_check ─────────────────────────────────────────────────
   * Returns server status, version, and the current UTC timestamp.
   * Useful for Notion to verify the connection is alive.
   * Input schema: {} (no parameters)
   */
  server.tool(
    "health_check",
    "Verify the MCP server is running and return metadata",
    {}, // no input parameters
    async () => {
      const payload = {
        status: "ok",
        server: "mostafa-academic-mcp",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV ?? "production",
        platform: "Vercel · Next.js",
        transport: "StreamableHTTP",
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );

  /* ── Tool: hello_world ──────────────────────────────────────────────────
   * Demonstrates a parameterized tool using Zod schema validation.
   * Input: { name?: string }
   */
  server.tool(
    "hello_world",
    "Return a personalized greeting — useful for testing the connection",
    {
      /** Optional name to personalize the greeting. Defaults to "World". */
      name: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe('Name to include in the greeting (e.g. "Mostafa")'),
    },
    async ({ name }) => {
      const who = name ?? "World";
      const message =
        `Hello, ${who}! 👋\n` +
        `Connected to mostafa-academic-mcp v1.0.0 via Notion Custom MCP Server.\n` +
        `Timestamp: ${new Date().toISOString()}`;

      return {
        content: [
          {
            type: "text" as const,
            text: message,
          },
        ],
      };
    }
  );

  return server;
}

/* ─── JSON-RPC error helper ──────────────────────────────────────────────── */

/**
 * Builds a spec-compliant JSON-RPC 2.0 error response body.
 *
 * @param code    Standard JSON-RPC error code (e.g. -32603 = Internal Error)
 * @param message Human-readable error message
 * @param data    Optional additional data (omitted in production)
 */
function jsonRpcError(
  code: number,
  message: string,
  data?: unknown
): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: null,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === "development" && data !== undefined
        ? { data }
        : {}),
    },
  });
}

/* ─── Route handlers ─────────────────────────────────────────────────────── */

/**
 * POST /api/mcp
 *
 * Primary MCP endpoint. Notion sends JSON-RPC requests here.
 *
 * Flow:
 *   1. Notion POSTs a JSON-RPC message (initialize / tools/call / etc.)
 *   2. StreamableHTTPServerTransport parses the request
 *   3. McpServer dispatches to the matching tool handler
 *   4. Response is returned as JSON (or SSE if the client requested streaming)
 */
export async function POST(req: NextRequest): Promise<Response> {
  let server: McpServer | undefined;

  try {
    /* Create a stateless transport.
     * sessionIdGenerator: undefined → no session cookie is issued.
     * This is the correct mode for serverless: each POST is self-contained. */
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    server = createMcpServer();

    /* Attach server logic to the transport layer. */
    await server.connect(transport);

    /* Hand off to the SDK — it reads the body, routes the call,
     * runs the tool, and serialises the JSON-RPC response. */
    const response = await transport.handleRequest(req);

    return response;
  } catch (error) {
    console.error("[MCP] POST handler error:", error);

    return new Response(
      jsonRpcError(
        -32603, // JSON-RPC 2.0 Internal Error
        "Internal server error",
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { message: String(error) }
      ),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    /* Always close the server to free resources (important in serverless). */
    if (server) {
      await server.close().catch(() => {
        // Suppress close errors — they do not affect the client response.
      });
    }
  }
}

/**
 * GET /api/mcp
 *
 * SSE (Server-Sent Events) endpoint.
 * The Streamable HTTP transport spec requires GET support so that
 * the server can push messages to the client asynchronously.
 *
 * Notion may open this connection to receive server-initiated events.
 */
export async function GET(req: NextRequest): Promise<Response> {
  let server: McpServer | undefined;

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    server = createMcpServer();
    await server.connect(transport);

    /* The transport recognises the Accept: text/event-stream header
     * and upgrades the response to an SSE stream automatically. */
    return await transport.handleRequest(req);
  } catch (error) {
    console.error("[MCP] GET handler error:", error);

    return new Response(
      JSON.stringify({ error: "Failed to establish SSE connection" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    if (server) {
      await server.close().catch(() => {});
    }
  }
}

/**
 * DELETE /api/mcp
 *
 * Session termination endpoint (Streamable HTTP spec §4.2.5).
 * Called by MCP clients to explicitly signal they are done.
 * Returns 204 No Content on success (or graceful error fallback).
 */
export async function DELETE(req: NextRequest): Promise<Response> {
  let server: McpServer | undefined;

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    server = createMcpServer();
    await server.connect(transport);

    return await transport.handleRequest(req);
  } catch (error) {
    console.error("[MCP] DELETE handler error:", error);

    /* Graceful fallback: always return 204 so the client can disconnect cleanly. */
    return new Response(null, { status: 204 });
  } finally {
    if (server) {
      await server.close().catch(() => {});
    }
  }
}
