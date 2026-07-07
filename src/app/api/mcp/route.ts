import { createMcpHandler } from "mcp-handler"
import { z } from "zod"
import { MongoClient, Db } from "mongodb"

let client: MongoClient | null = null

async function getDb(): Promise<Db> {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI as string)
    await client.connect()
  }
  return client.db("mylibrary")
}

const mcpHandler = createMcpHandler((server) => {
  // ✅ أداة إضافة امتحان — matches production schema
  server.tool(
    "add_doctorate_exam",
    "Add a doctorate exam to MongoDB (doctorateExams collection). Use examType 'general' or 'specialist', year as number, and problems array.",
    {
      examType: z.enum(["general", "specialist"]),
      year: z.number(),
      university: z.string(),
      specialty: z.string(),
      source: z.string(),
      problems: z.array(
        z.object({
          problemNumber: z.number(),
          title: z.string(),
          difficulty: z.enum(["easy", "medium", "hard", "very-hard"]),
          tags: z.array(z.string()),
          statement: z.string(),
          solution: z.string(),
          remark: z.string().optional().default(""),
        })
      ),
    },
    async (args) => {
      const db = await getDb()
      const result = await db.collection("doctorateExams").insertOne({
        ...args,
        createdAt: new Date(),
      })
      return {
        content: [
          {
            type: "text",
            text: `✅ Exam inserted. id=${result.insertedId.toString()}, year=${args.year}, specialty=${args.specialty}`,
          },
        ],
      }
    }
  )

  // ✅ أداة عرض آخر الامتحانات
  server.tool(
    "list_doctorate_exams",
    "List recent doctorate exams from MongoDB, most recent first.",
    {
      limit: z.number().optional(),
      year: z.number().optional(),
      examType: z.enum(["general", "specialist"]).optional(),
    },
    async ({ limit, year, examType }) => {
      const db = await getDb()
      const filter: Record<string, unknown> = {}
      if (year) filter.year = year
      if (examType) filter.examType = examType

      const docs = await db
        .collection("doctorateExams")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit ?? 10)
        .project({ _id: 1, examType: 1, year: 1, specialty: 1, university: 1, source: 1 })
        .toArray()

      return {
        content: [{ type: "text", text: JSON.stringify(docs, null, 2) }],
      }
    }
  )

  // ✅ أداة تحديث الحل لمسألة معينة
  server.tool(
    "update_doctorate_solution",
    "Update the solution text of a specific problem inside an existing doctorate exam.",
    {
      examId: z.string(),
      problemNumber: z.number(),
      solution: z.string(),
    },
    async ({ examId, problemNumber, solution }) => {
      const db = await getDb()
      const { ObjectId } = await import("mongodb")
      const result = await db.collection("doctorateExams").updateOne(
        { _id: new ObjectId(examId), "problems.problemNumber": problemNumber },
        { $set: { "problems.$.solution": solution } }
      )
      return {
        content: [
          {
            type: "text",
            text: `matched=${result.matchedCount}, modified=${result.modifiedCount}`,
          },
        ],
      }
    }
  )
})

async function verifyAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization")
  return authHeader === `Bearer ${process.env.MCP_API_KEY}`
}

export async function POST(req: Request) {
  if (!(await verifyAuth(req))) {
    return new Response("Unauthorized", { status: 401 })
  }
  return mcpHandler(req)
}

export async function GET(req: Request) {
  if (!(await verifyAuth(req))) {
    return new Response("Unauthorized", { status: 401 })
  }
  return mcpHandler(req)
}
