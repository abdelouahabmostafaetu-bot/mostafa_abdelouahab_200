import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { DoctorateProblem } from "@/lib/models/doctorate-problem";
import { buildDoctorateSlug } from "@/lib/doctorate-problems";

export const runtime = "nodejs";
export const maxDuration = 60;

const MCP_TOKEN = process.env.MCP_TOKEN;
const MAX_PROBLEMS = 15;

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

  server.tool(
    "add_doctorate_exam",
    "Add a full doctorate entrance exam (one or more exercises) to the doctorate problems archive in MongoDB. Each exercise becomes a DoctorateProblem document sharing the same year/examType/university.",
    {
      examType: z.enum(["general", "specialist"]),
      year: z.number().int().min(1990).max(2100),
      specialty: z.string().max(120).optional(),
      university: z.string().max(200).optional(),
      source: z.string().max(500).optional(),
      problems: z
        .array(
          z.object({
            problemNumber: z.number().int().min(1).max(99).optional(),
            title: z.string().max(250).optional(),
            difficulty: z
              .enum(["easy", "medium", "hard", "very-hard"])
              .optional(),
            tags: z.array(z.string()).max(12).optional(),
            statement: z.string().min(10),
            solution: z.string().optional(),
          }),
        )
        .min(1)
        .max(MAX_PROBLEMS),
    },
    async ({ examType, year, specialty, university, source, problems }) => {
      await connectToDatabase();

      const specialtyStr = (specialty ?? "").trim() || "Mathematics";
      const universityStr = (university ?? "").trim();
      const sourceStr = (source ?? "").trim();

      const docs: Array<Record<string, unknown>> = [];
      const slugs: string[] = [];

      for (let i = 0; i < problems.length; i += 1) {
        const p = problems[i];
        const problemNumber =
          p.problemNumber && p.problemNumber > 0 ? p.problemNumber : i + 1;
        const titleStr = (p.title ?? "").trim() || `Exercice ${problemNumber}`;

        const slug = buildDoctorateSlug(year, examType, titleStr);
        if (slugs.includes(slug)) {
          return {
            content: [
              {
                type: "text",
                text: `Exercice ${i + 1}: duplicate exercice ("${titleStr}") within this exam.`,
              },
            ],
            isError: true,
          };
        }
        slugs.push(slug);

        docs.push({
          title: titleStr,
          slug,
          examType,
          specialty: specialtyStr,
          year,
          university: universityStr,
          source: sourceStr,
          problemNumber,
          statement: p.statement.trim(),
          solution: (p.solution ?? "").trim(),
          tags: (p.tags ?? [])
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 12),
          difficulty: p.difficulty ?? "medium",
          published: true,
        });
      }

      const existing = await DoctorateProblem.find({ slug: { $in: slugs } })
        .select("slug title")
        .lean();
      if (existing.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `This exam already has "${existing[0].title}" in the archive (${existing[0].slug}). Edit or remove it first.`,
            },
          ],
          isError: true,
        };
      }

      const created = await DoctorateProblem.insertMany(docs, {
        ordered: true,
      });

      return {
        content: [
          {
            type: "text",
            text: `Created ${created.length} exercise(s) for the ${year} ${examType} exam. Slugs: ${slugs.join(", ")}`,
          },
        ],
      };
    },
  );

  server.tool(
    "list_doctorate_exams",
    "List recent doctorate exam problems stored in MongoDB",
    {
      year: z.number().int().optional(),
      examType: z.enum(["general", "specialist"]).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
    async ({ year, examType, limit }) => {
      await connectToDatabase();

      const query: Record<string, unknown> = {};
      if (year) query.year = year;
      if (examType) query.examType = examType;

      const docs = await DoctorateProblem.find(query)
        .sort({ year: -1, problemNumber: 1 })
        .limit(limit ?? 10)
        .select(
          "title slug examType year university problemNumber difficulty published",
        )
        .lean();

      return {
        content: [{ type: "text", text: JSON.stringify(docs, null, 2) }],
      };
    },
  );

  server.tool(
    "update_doctorate_solution",
    "Update (or add) the solution text for an existing doctorate problem, identified by its slug (as returned by add_doctorate_exam or list_doctorate_exams).",
    {
      slug: z.string().min(1),
      solution: z.string().min(1),
    },
    async ({ slug, solution }) => {
      await connectToDatabase();

      const updated = await DoctorateProblem.findOneAndUpdate(
        { slug },
        { $set: { solution: solution.trim() } },
        { new: true },
      )
        .select("slug title")
        .lean();

      if (!updated) {
        return {
          content: [
            {
              type: "text",
              text: `No doctorate problem found with slug "${slug}".`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Updated solution for "${updated.title}" (${updated.slug}).`,
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