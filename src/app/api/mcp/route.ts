import { createMcpHandler } from "mcp-handler"
import { z } from "zod"
import { MongoClient, Db } from "mongodb"

let cachedClient: MongoClient | null = null

async function getDb(): Promise<Db> {
  if (!cachedClient) {
    cachedClient = new MongoClient(process.env.MONGODB_URI as string)
    await cachedClient.connect()
  }
  return cachedClient.db("mylibrary")
}

// ---------- تنظيف وتصحيح الامتحان ليطابق schema الموقع ----------
function normalizeExam(exam: any) {
  const problems = (exam.problems ?? exam.exercises ?? []).map(
    (p: any, i: number) => ({
      problemNumber: Number(p.problemNumber ?? i + 1),
      title: String(p.title ?? `Problème ${i + 1}`),
      difficulty: ["easy", "medium", "hard", "very-hard"].includes(p.difficulty)
        ? p.difficulty
        : "medium",
      tags: Array.isArray(p.tags) ? p.tags : [],
      statement: String(p.statement ?? ""),
      solution: String(p.solution ?? ""),
      remark: String(p.remark ?? ""),
    })
  )

  const rawType = String(exam.examType ?? "specialist").toLowerCase()

  return {
    examType: rawType === "general" ? "general" : "specialist",
    year: Number(exam.year),
    university: String(exam.university ?? "Source inconnue"),
    specialty: String(exam.specialty ?? exam.filiere ?? ""),
    source: String(exam.source ?? exam.title ?? ""),
    problems,
  }
}

// ---------- استيراد Lovable (JSON عادي) ----------
async function handleImport(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const exams: any[] = Array.isArray(body) ? body : body.exams ?? []
    if (exams.length === 0) {
      return Response.json({ error: "No exams provided" }, { status: 400 })
    }

    const db = await getDb()
    const col = db.collection("doctorateExams")
    let inserted = 0
    let updated = 0

    for (const raw of exams) {
      const exam = normalizeExam(raw)
      const result = await col.updateOne(
        { year: exam.year, university: exam.university, source: exam.source },
        { $set: exam, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      )
      if (result.upsertedCount > 0) inserted++
      else if (result.modifiedCount > 0) updated++
    }

    return Response.json({ ok: true, inserted, updated, total: exams.length })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// ---------- أدوات MCP ----------
const mcpHandler = createMcpHandler((server) => {
  server.tool(
    "add_doctorate_exam",
    "Add a doctorate exam to MongoDB. examType is 'general' or 'specialist', year is a number, problems is an array.",
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
          remark: z.string().optional(),
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
          { type: "text", text: `✅ inserted id=${result.insertedId.toString()}` },
        ],
      }
    }
  )

  server.tool(
    "list_doctorate_exams",
    "List recent doctorate exams, most recent first.",
    { limit: z.number().optional(), year: z.number().optional() },
    async ({ limit, year }) => {
      const db = await getDb()
      const filter: Record<string, unknown> = {}
      if (year) filter.year = year
      const docs = await db
        .collection("doctorateExams")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit ?? 10)
        .project({ examType: 1, year: 1, specialty: 1, university: 1, source: 1 })
        .toArray()
      return { content: [{ type: "text", text: JSON.stringify(docs, null, 2) }] }
    }
  )
})

// ---------- التوجيه حسب المفتاح ----------
export async function POST(req: Request) {
  const auth = req.headers.get("authorization")

  // Lovable يستعمل IMPORT_TOKEN → استيراد مباشر
  if (auth === `Bearer ${process.env.IMPORT_TOKEN}`) {
    return handleImport(req)
  }

  // عملاء MCP يستعملون MCP_API_KEY
  if (auth === `Bearer ${process.env.MCP_API_KEY}`) {
    return mcpHandler(req)
  }

  return new Response("Unauthorized", { status: 401 })
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${process.env.MCP_API_KEY}`) {
    return mcpHandler(req)
  }
  return new Response("Unauthorized", { status: 401 })
}
