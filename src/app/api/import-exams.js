import { MongoClient } from "mongodb"

let cachedClient = null
async function getClient() {
  if (cachedClient) return cachedClient
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  cachedClient = client
  return client
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "")
  if (!process.env.IMPORT_TOKEN || token !== process.env.IMPORT_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const body = req.body
    const exams = Array.isArray(body) ? body : body?.exams
    if (!Array.isArray(exams) || !exams.length) {
      return res.status(400).json({ error: "Body must be { exams: [...] } or an array" })
    }
    const client = await getClient()
    const col = client.db("mylibrary").collection("doctorateExams")
    let inserted = 0, updated = 0
    const results = []
    for (const exam of exams) {
      if (!exam.title || !exam.year) {
        results.push({ ok: false, error: "Missing title/year", exam })
        continue
      }
      const filter = { title: exam.title, year: exam.year, specialty: exam.specialty ?? null }
      const { upsertedCount, modifiedCount } = await col.updateOne(
        filter,
        { $set: { ...exam, updatedAt: new Date() } },
        { upsert: true }
      )
      if (upsertedCount > 0) inserted++
      else if (modifiedCount > 0) updated++
      results.push({ ok: true, title: exam.title, action: upsertedCount > 0 ? "inserted" : "updated" })
    }
    const total = await col.countDocuments()
    return res.status(200).json({ ok: true, inserted, updated, total, results })
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
