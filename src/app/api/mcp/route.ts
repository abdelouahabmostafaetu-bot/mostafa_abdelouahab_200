import { MongoClient } from "mongodb"

let cachedClient: MongoClient | null = null

async function getClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient
  const client = new MongoClient(process.env.MONGODB_URI as string)
  await client.connect()
  cachedClient = client
  return client
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.replace(/^Bearer\s+/i, "")
  if (!process.env.IMPORT_TOKEN || token !== process.env.IMPORT_TOKEN) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    )
  }
  try {
    const body = await req.json()
    const exams: any[] = Array.isArray(body) ? body : body?.exams
    if (!Array.isArray(exams) || !exams.length) {
      return Response.json(
        { error: "Body must be { exams: [...] } or an array" },
        { status: 400, headers: corsHeaders }
      )
    }
    const client = await getClient()
    const col = client.db("mylibrary").collection("doctorateExams")
    let inserted = 0
    let updated = 0
    const results: any[] = []
    for (const exam of exams) {
      if (!exam.title || !exam.year) {
        results.push({ ok: false, error: "Missing title/year", exam })
        continue
      }
      const filter = {
        title: exam.title,
        year: exam.year,
        specialty: exam.specialty ?? null,
      }
      const { upsertedCount, modifiedCount } = await col.updateOne(
        filter,
        { $set: { ...exam, updatedAt: new Date() } },
        { upsert: true }
      )
      if (upsertedCount > 0) inserted++
      else if (modifiedCount > 0) updated++
      results.push({
        ok: true,
        title: exam.title,
        action: upsertedCount > 0 ? "inserted" : "updated",
      })
    }
    const total = await col.countDocuments()
    return Response.json(
      { ok: true, inserted, updated, total, results },
      { headers: corsHeaders }
    )
  } catch (err: any) {
    return Response.json(
      { error: String(err?.message || err) },
      { status: 500, headers: corsHeaders }
    )
  }
}
