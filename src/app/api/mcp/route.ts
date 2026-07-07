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

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function nextExamId(db: Db): Promise<number> {
  const last = await db
    .collection("doctorateExams")
    .find({ examId: { $type: "number" } })
    .sort({ examId: -1 })
    .limit(1)
    .project({ examId: 1 })
    .toArray()
  return (last[0]?.examId ?? 0) + 1
}

// كل تمرين → وثيقة مستقلة مطابقة تماماً لبنية قاعدتك
function buildDocs(exam: any, examId: number) {
  const problems: any[] = exam.problems ?? exam.exercises ?? []
  const examType =
    String(exam.examType ?? "specialist").toLowerCase() === "general"
      ? "general"
      : "specialist"

  return problems.map((p: any, i: number) => {
    const problemNumber = Number(p.problemNumber ?? i + 1)
    const title = String(p.title ?? `Exercice ${problemNumber}`)
    return {
      title,
      slug: `${Number(exam.year)}-${examType}-${slugify(title)}`,
      examType,
      specialty: String(exam.specialty ?? ""),
      year: Number(exam.year),
      university: String(exam.university ?? ""),
      source: String(exam.source ?? ""),
      problemNumber,
      statement: String(p.statement ?? ""),
      solution: String(p.solution ?? ""),
      tags: Array.isArray(p.tags) ? p.tags : [],
      difficulty: ["easy", "medium", "hard", "very-hard"].includes(p.difficulty)
        ? p.difficulty
        : "medium",
      published: true,
      __v: 0,
      examId,
    }
  })
}

async function importExams(exams: any[]) {
  const db = await getDb()
  const col = db.collection("doctorateExams")
  let inserted = 0
  let updated = 0

  for (const exam of exams) {
    const examId = exam.examId ?? (await nextExamId(db))
    const docs = buildDocs(exam, examId)
    for (const doc of docs) {
      const result = await col.updateOne(
        { slug: doc.slug },
        {
          $set: { ...doc, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      )
      if (result.upsertedCount > 0) inserted++
      else if (result.modifiedCount > 0) updated++
    }
  }
  return { inserted, updated }
}

// ---------- استيراد Lovable ----------
async function handleImport(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const exams: any[] = Array.isArray(body) ? body : body.exams ?? []
    if (exams.length === 0) {
      return Response.json({ error: "No exams provided" }, { status: 400 })
    }
    const { inserted, updated } = await importExams(exams)
    return Response.json({ ok: true, inserted, updated })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// ---------- أدوات MCP ----------
const mcpHandler = createMcpHandler((server) => {
  server.tool(
    "add_doctorate_exam",
    "Add a doctorate exam. Each problem becomes one flat document in doctorateExams with a shared numeric examId.",
    {
      examType: z.enum(["general", "specialist"]),
      year: z.number(),
      university: z.string(),
      specialty: z.string(),
      source: z.string(),
      examId: z.number().optional(),
      problems: z.array(
        z.object({
          problemNumber: z.number(),
          title: z.string(),
          difficulty: z.enum(["easy", "medium", "hard", "very-hard"]),
          tags: z.array(z.string()),
          statement: z.string(),
          solution: z.string(),
        })
      ),
    },
    async (args) => {
      const { inserted, updated } = await importExams([args])
      return {
        content: [
          { type: "text", text: `✅ inserted=${inserted}, updated=${updated}` },
        ],
      }
    }
  )

  server.tool(
    "list_doctorate_exams",
    "List recent doctorate exam problems, most recent first.",
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
        .project({ title: 1, examId: 1, year: 1, specialty: 1, university: 1 })
        .toArray()
      return { content: [{ type: "text", text: JSON.stringify(docs, null, 2) }] }
    }
  )
})

// ---------- التوجيه ----------
export async function POST(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${process.env.IMPORT_TOKEN}`) return handleImport(req)
  if (auth === `Bearer ${process.env.MCP_API_KEY}`) return mcpHandler(req)
  return new Response("Unauthorized", { status: 401 })
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${process.env.MCP_API_KEY}`) return mcpHandler(req)
  return new Response("Unauthorized", { status: 401 })
}
