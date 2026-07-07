import { createMcpHandler } from "mcp-handler"
import { z } from "zod"
import { MongoClient, Db } from "mongodb"
​
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}
​
let cachedClient: MongoClient | null = null
​
async function getDb(): Promise<Db> {
  if (!cachedClient) {
    cachedClient = new MongoClient(process.env.MONGODB_URI as string)
    await cachedClient.connect()
  }
  return cachedClient.db("mylibrary")
}
​
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
​
async function nextExamId(db: Db): Promise<number> {
  const last = await db
    .collection("doctorateproblems")
    .find({ examId: { $type: "number" } })
    .sort({ examId: -1 })
    .limit(1)
    .project({ examId: 1 })
    .toArray()
  return (last[0]?.examId ?? 0) + 1
}
​
function buildDocs(exam: any, examId: number) {
  const problems: any[] = exam.problems ?? exam.exercises ?? []
  const examType =
    String(exam.examType ?? "specialist").toLowerCase() === "general"
      ? "general"
      : "specialist"
​
  return problems.map((p: any, i: number) => {
    const problemNumber = Number(p.problemNumber ?? i + 1)
    const title = String(p.title ?? `Exercice ${problemNumber}`)
    return {
      title,
      slug: `${Number(exam.year)}-${examType}-${slugify(title)}`,
      examType,
      // general exams have no specialty
      specialty: examType === "general" ? "" : String(exam.specialty ?? ""),
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
​
async function importExams(exams: any[]) {
  const db = await getDb()
  const col = db.collection("doctorateproblems")
  let inserted = 0
  let updated = 0
​
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
​
async function deleteExam(examId: number): Promise<Response> {
  const db = await getDb()
  const result = await db
    .collection("doctorateproblems")
    .deleteMany({ examId })
  return Response.json(
    { ok: true, action: "delete", examId, deletedProblems: result.deletedCount },
    { headers: corsHeaders }
  )
}
​
async function handleImport(req: Request): Promise<Response> {
  try {
    const body = await req.json()
​
    // ===== DELETE EXAM BY examId =====
    if (!Array.isArray(body) && body && body.action === "delete") {
      const examId = Number(body.examId)
      if (!Number.isFinite(examId)) {
        return Response.json(
          { ok: false, error: 'examId must be a number' },
          { status: 400, headers: corsHeaders }
        )
      }
      return deleteExam(examId)
    }
    // ===== END DELETE =====
​
    // ===== LIST DISTINCT VALUES =====
    if (!Array.isArray(body) && body && body.action === "list_distinct") {
      const db = await getDb()
      const col = db.collection("doctorateproblems")
      const universities = await col.distinct("university")
      const specialties = await col.distinct("specialty")
      return Response.json(
        {
          ok: true,
          universities: (universities as string[]).filter(Boolean).sort(),
          specialties: (specialties as string[]).filter(Boolean).sort(),
        },
        { headers: corsHeaders }
      )
    }
    // ===== END LIST DISTINCT =====
​
    // ===== NORMALIZE universities / specialties =====
    if (!Array.isArray(body) && body && body.action === "normalize") {
      const db = await getDb()
      const col = db.collection("doctorateproblems")
      const results: { field: string; from: string; to: string; updated: number }[] = []
​
      const uniMap: Record<string, string> = body.universities ?? {}
      const specMap: Record<string, string> = body.specialties ?? {}
​
      for (const [oldVal, newVal] of Object.entries(uniMap)) {
        const r = await col.updateMany(
          { university: oldVal },
          { $set: { university: newVal, updatedAt: new Date() } }
        )
        if (r.modifiedCount > 0)
          results.push({ field: "university", from: oldVal, to: String(newVal), updated: r.modifiedCount })
      }
​
      for (const [oldVal, newVal] of Object.entries(specMap)) {
        const r = await col.updateMany(
          { specialty: oldVal },
          { $set: { specialty: newVal, updatedAt: new Date() } }
        )
        if (r.modifiedCount > 0)
          results.push({ field: "specialty", from: oldVal, to: String(newVal), updated: r.modifiedCount })
      }
​
      return Response.json(
        { ok: true, action: "normalize", changes: results.length, details: results },
        { headers: corsHeaders }
      )
    }
    // ===== END NORMALIZE =====
​
    // ===== CLEAR SPECIALTY FOR GENERAL EXAMS =====
    if (!Array.isArray(body) && body && body.action === "clear_general_specialty") {
      const db = await getDb()
      const result = await db
        .collection("doctorateproblems")
        .updateMany(
          { examType: "general" },
          { $set: { specialty: "", updatedAt: new Date() } }
        )
      return Response.json(
        { ok: true, action: "clear_general_specialty", updated: result.modifiedCount },
        { headers: corsHeaders }
      )
    }
    // ===== END CLEAR GENERAL SPECIALTY =====
​
    // ===== GET EXAM BY examId =====
    if (!Array.isArray(body) && body && body.action === "get_exam") {
      const examId = Number(body.examId)
      if (!Number.isFinite(examId))
        return Response.json({ ok: false, error: "examId must be a number" }, { status: 400, headers: corsHeaders })
      const db = await getDb()
      const problems = await db.collection("doctorateproblems")
        .find({ examId }).sort({ problemNumber: 1 }).toArray()
      if (problems.length === 0)
        return Response.json({ ok: false, error: `No exam found with ID ${examId}` }, { status: 404, headers: corsHeaders })
      return Response.json({ ok: true, examId, problems }, { headers: corsHeaders })
    }
    // ===== END GET EXAM =====
​
    // ===== UPDATE EXAM-LEVEL FIELDS (university, specialty, examType, year, source) =====
    if (!Array.isArray(body) && body && body.action === "update_exam_fields") {
      const examId = Number(body.examId)
      if (!Number.isFinite(examId))
        return Response.json({ ok: false, error: "examId must be a number" }, { status: 400, headers: corsHeaders })
      const db = await getDb()
      const fields: any = { updatedAt: new Date() }
      if (body.university !== undefined) fields.university = body.university
      if (body.specialty !== undefined) fields.specialty = body.specialty
      if (body.examType !== undefined) fields.examType = body.examType
      if (body.year !== undefined) fields.year = Number(body.year)
      if (body.source !== undefined) fields.source = body.source
      const result = await db.collection("doctorateproblems")
        .updateMany({ examId }, { $set: fields })
      return Response.json({ ok: true, action: "update_exam_fields", examId, updated: result.modifiedCount }, { headers: corsHeaders })
    }
    // ===== END UPDATE EXAM FIELDS =====
​
    // ===== UPDATE ONE PROBLEM BY SLUG =====
    if (!Array.isArray(body) && body && body.action === "update_problem") {
      const db = await getDb()
      const fields: any = { updatedAt: new Date() }
      if (body.title !== undefined) fields.title = body.title
      if (body.difficulty !== undefined) fields.difficulty = body.difficulty
      if (body.tags !== undefined)
        fields.tags = Array.isArray(body.tags)
          ? body.tags
          : String(body.tags).split(",").map((t: string) => t.trim()).filter(Boolean)
      if (body.statement !== undefined) fields.statement = body.statement
      if (body.solution !== undefined) fields.solution = body.solution
      const result = await db.collection("doctorateproblems")
        .updateOne({ slug: body.slug }, { $set: fields })
      return Response.json({ ok: true, action: "update_problem", updated: result.modifiedCount }, { headers: corsHeaders })
    }
    // ===== END UPDATE PROBLEM =====
​
    // ===== DELETE ONE PROBLEM BY SLUG =====
    if (!Array.isArray(body) && body && body.action === "delete_problem") {
      const db = await getDb()
      const result = await db.collection("doctorateproblems").deleteOne({ slug: body.slug })
      return Response.json({ ok: true, action: "delete_problem", deleted: result.deletedCount }, { headers: corsHeaders })
    }
    // ===== END DELETE PROBLEM =====
​
    // ===== ADD NEW PROBLEM TO EXISTING EXAM =====
    if (!Array.isArray(body) && body && body.action === "add_problem") {
      const db = await getDb()
      const examId = Number(body.examId)
      const problemNumber = Number(body.problemNumber ?? 1)
      const title = String(body.title ?? `Exercice ${problemNumber}`)
      const doc = {
        title,
        slug: `${examId}-new-${Date.now()}`,
        examType: body.examType ?? "specialist",
        specialty: body.specialty ?? "",
        year: Number(body.year ?? 0),
        university: body.university ?? "",
        source: body.source ?? "",
        problemNumber,
        statement: body.statement ?? "",
        solution: body.solution ?? "",
        tags: Array.isArray(body.tags) ? body.tags : [],
        difficulty: body.difficulty ?? "medium",
        published: true,
        __v: 0,
        examId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await db.collection("doctorateproblems").insertOne(doc)
      return Response.json({ ok: true, action: "add_problem", examId }, { headers: corsHeaders })
    }
    // ===== END ADD PROBLEM =====
​
    // ===== UPDATE SPECIALTY BY examId =====
    if (!Array.isArray(body) && body && body.action === "update_specialty") {
      const examId = Number(body.examId)
      const specialty = String(body.specialty ?? "")
      if (!Number.isFinite(examId))
        return Response.json({ ok: false, error: "examId must be a number" }, { status: 400, headers: corsHeaders })
      const db = await getDb()
      const result = await db.collection("doctorateproblems")
        .updateMany({ examId }, { $set: { specialty, updatedAt: new Date() } })
      return Response.json({ ok: true, action: "update_specialty", examId, specialty, updated: result.modifiedCount }, { headers: corsHeaders })
    }
    // ===== END UPDATE SPECIALTY =====
​
    const exams: any[] = Array.isArray(body) ? body : body.exams ?? []
    if (exams.length === 0) {
      return Response.json(
        { error: "No exams provided" },
        { status: 400, headers: corsHeaders }
      )
    }
    const { inserted, updated } = await importExams(exams)
    return Response.json(
      { ok: true, inserted, updated },
      { headers: corsHeaders }
    )
  } catch (err: any) {
    return Response.json(
      { error: err.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
​
const mcpHandler = createMcpHandler((server) => {
  server.tool(
    "add_doctorate_exam",
    "Add a doctorate exam. Each problem becomes one flat document in doctorateproblems with a shared numeric examId.",
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
​
  server.tool(
    "delete_doctorate_exam",
    "Delete ALL problems of one exam by its numeric examId from doctorateproblems.",
    { examId: z.number() },
    async ({ examId }) => {
      const db = await getDb()
      const result = await db.collection("doctorateproblems").deleteMany({ examId })
      return {
        content: [{ type: "text", text: `🗑️ Deleted ${result.deletedCount} problems from exam #${examId}` }],
      }
    }
  )
​
  server.tool(
    "list_doctorate_exams",
    "List recent doctorate exam problems, most recent first.",
    { limit: z.number().optional(), year: z.number().optional() },
    async ({ limit, year }) => {
      const db = await getDb()
      const filter: Record<string, unknown> = {}
      if (year) filter.year = year
      const docs = await db
        .collection("doctorateproblems")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit ?? 10)
        .project({ title: 1, examId: 1, year: 1, specialty: 1, university: 1 })
        .toArray()
      return { content: [{ type: "text", text: JSON.stringify(docs, null, 2) }] }
    }
  )
})
​
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}
​
export async function POST(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${process.env.IMPORT_TOKEN}`) return handleImport(req)
  if (auth === `Bearer ${process.env.MCP_API_KEY}`) return mcpHandler(req)
  return new Response("Unauthorized", { status: 401, headers: corsHeaders })
}
​
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (auth === `Bearer ${process.env.MCP_API_KEY}`) return mcpHandler(req)
  return new Response("Unauthorized", { status: 401, headers: corsHeaders })
}
​
