import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const MCP_TOKEN = process.env.MCP_TOKEN;

function checkAuth(req: NextRequest) {
  if (!MCP_TOKEN) {
    return true;
  }

  const auth = req.headers.get("authorization");

  return auth === `Bearer ${MCP_TOKEN}`;
}

function createMcpServer() {
  const server = new McpServer({
    name: "mostafa-academic-mcp",
    version: "1.0.0",
  });

  server.tool(
    "health_check",
    "Verify the MCP server is running",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "ok",
                server: "mostafa-academic-mcp",
                version: "1.0.0",
                timestamp: new Date().toISOString(),
                platform: "Vercel + Next.js",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "hello_world",
    "Return a personalized greeting",
    {
      name: z.string().min(1).max(100).optional(),
    },
    async ({ name }) => {
      return {
        content: [
          {
            type: "text",
            text: `Hello, ${name ?? "World"}! MCP connection is working.`,
          },
        ],
      };
    },
  );

  return server;
}

async function handleMcp(req: NextRequest): Promise<Response> {
  if (!checkAuth(req)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  const server = createMcpServer();

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  return transport.handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleMcp(req);
}

export async function GET(req: NextRequest) {
  return handleMcp(req);
}

export async function DELETE(req: NextRequest) {
  return handleMcp(req);
}