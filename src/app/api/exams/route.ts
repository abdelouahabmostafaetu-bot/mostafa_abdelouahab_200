import { NextRequest, NextResponse } from "next/server"
import { MongoClient, type Db } from "mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

let cachedClient: MongoClient | null = null

async function getDb(): Promise<Db> {
	const uri = process.env.MONGODB_URI
	if (!uri) throw new Error("MONGODB_URI is not set")
	if (!cachedClient) {
		cachedClient = new MongoClient(uri)
		await cachedClient.connect()
	}
	return cachedClient.db("mylibrary")
}

const COLLECTION = "doctorateproblems"

function isAuthorized(req: NextRequest): boolean {
	const key = process.env.EXAM_API_KEY
	if (!key) return false
	const header = req.headers.get("authorization") || ""
	return header === `Bearer ${key}`
}

function slugify(input: string): string {
	return input
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 200)
}

type ProblemInput = {
	problemNumber?: number
	title?: string
	statement: string
	solution?: string
	remark?: string
	difficulty?: "easy" | "medium" | "hard" | "very-hard"
	tags?: string[]
}

type ExamInput = {
	examType: "general" | "specialist"
	year: number
	university?: string
	specialty?: string
	source?: string
	problems: ProblemInput[]
}

function validateExam(body: unknown): { ok: true; exam: ExamInput } | { ok: false; error: string } {
	const b = body as Partial<ExamInput>
	if (b?.examType !== "general" && b?.examType !== "specialist")
		return { ok: false, error: 'examType must be "general" or "specialist"' }
	if (typeof b.year !== "number" || b.year < 1990 || b.year > 2100)
		return { ok: false, error: "year must be a number between 1990 and 2100" }
	if (b.examType === "specialist" && !b.specialty)
		return { ok: false, error: "specialty is required when examType is specialist" }
	if (!Array.isArray(b.problems) || b.problems.length < 1 || b.problems.length > 15)
		return { ok: false, error: "problems must be an array of 1 to 15 items" }
	for (const [i, p] of b.problems.entries()) {
		if (typeof p?.statement !== "string" || p.statement.trim().length < 10)
			return { ok: false, error: `problems[${i}].statement is required (min 10 characters)` }
		if (p.title && p.title.length > 250)
			return { ok: false, error: `problems[${i}].title is too long (max 250)` }
		if (p.tags && (!Array.isArray(p.tags) || p.tags.length > 12))
			return { ok: false, error: `problems[${i}].tags must be an array of max 12 strings` }
		if (p.difficulty && !["easy", "medium", "hard", "very-hard"].includes(p.difficulty))
			return { ok: false, error: `problems[${i}].difficulty must be easy | medium | hard | very-hard` }
	}
	if (b.university && b.university.length > 200)
		return { ok: false, error: "university is too long (max 200)" }
	if (b.specialty && b.specialty.length > 120)
		return { ok: false, error: "specialty is too long (max 120)" }
	if (b.source && b.source.length > 500)
		return { ok: false, error: "source is too long (max 500)" }
	return { ok: true, exam: b as ExamInput }
}

// ---------- GET /api/exams?year=&examType=&examId=&university=&limit= ----------
export async function GET(req: NextRequest) {
	if (!isAuthorized(req)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}
	try {
		const db = await getDb()
		const { searchParams } = new URL(req.url)

		const filter: Record<string, unknown> = {}
		const year = searchParams.get("year")
		const examType = searchParams.get("examType")
		const examId = searchParams.get("examId")
		const university = searchParams.get("university")
		if (year) filter.year = Number(year)
		if (examType) filter.examType = examType
		if (examId) filter.examId = Number(examId)
		if (university) filter.university = { $regex: university, $options: "i" }

		const limit = Math.min(Number(searchParams.get("limit") || 50), 50)

		const docs = await db
			.collection(COLLECTION)
			.find(filter, { projection: { statement: 0, solution: 0 } })
			.sort({ examId: 1, problemNumber: 1 })
			.limit(limit * 15)
			.toArray()

		return NextResponse.json({ count: docs.length, problems: docs })
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Server error" },
			{ status: 500 }
		)
	}
}

// ---------- POST /api/exams  (add ?force=true to override duplicate check) ----------
export async function POST(req: NextRequest) {
	if (!isAuthorized(req)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}
	try {
		const body = await req.json()
		const result = validateExam(body)
		if (!result.ok) {
			return NextResponse.json({ error: result.error }, { status: 400 })
		}
		const exam = result.exam
		const db = await getDb()
		const col = db.collection(COLLECTION)
		const force = new URL(req.url).searchParams.get("force") === "true"

		// Coarse duplicate check: same year + examType + university (+ specialty)
		const dupFilter: Record<string, unknown> = {
			year: exam.year,
			examType: exam.examType,
		}
		if (exam.university) dupFilter.university = exam.university
		if (exam.specialty) dupFilter.specialty = exam.specialty
		const existing = await col.findOne(dupFilter, { projection: { examId: 1 } })
		if (existing && !force) {
			return NextResponse.json(
				{
					duplicate: true,
					error: "Possible duplicate exam",
					existingExamId: existing.examId,
					hint: "Compare with the existing exam. To insert anyway, call POST /api/exams?force=true",
				},
				{ status: 409 }
			)
		}

		// Auto-increment examId
		const last = await col.find({}).sort({ examId: -1 }).limit(1).toArray()
		const examId = ((last[0]?.examId as number) || 0) + 1

		const now = new Date()
		const docs = exam.problems.map((p, i) => ({
			examId,
			year: exam.year,
			examType: exam.examType,
			university: exam.university ?? null,
			specialty: exam.specialty ?? null,
			source: exam.source ?? null,
			problemNumber: p.problemNumber ?? i + 1,
			title: p.title ?? `Exercice ${i + 1}`,
			statement: p.statement,
			solution: p.solution ?? null,
			remark: p.remark ?? null,
			difficulty: p.difficulty ?? null,
			tags: p.tags ?? [],
			slug: slugify(`${exam.year} ${exam.examType} ${p.title ?? `exercice-${i + 1}-exam-${examId}`}`),
			published: true,
			createdAt: now,
			updatedAt: now,
		}))

		// Strong duplicate check: identical exercise titles => identical slugs
		const slugs = docs.map((d) => d.slug)
		const slugClashes = await col
			.find({ slug: { $in: slugs } }, { projection: { slug: 1, examId: 1 } })
			.toArray()

		if (slugClashes.length > 0 && !force) {
			return NextResponse.json(
				{
					duplicate: true,
					error: "This exam already exists in the archive (identical exercise titles)",
					existingExamId: slugClashes[0].examId,
					conflictingSlugs: slugClashes.map((d) => d.slug),
					hint: "This is almost certainly the same exam. Only use ?force=true if it is truly a different exam.",
				},
				{ status: 409 }
			)
		}

		if (slugClashes.length > 0 && force) {
			// Make slugs unique so the insert cannot hit the unique index
			const taken = new Set(slugClashes.map((d) => d.slug))
			for (const d of docs) {
				if (taken.has(d.slug)) d.slug = `${d.slug}-${examId}`
			}
		}

		try {
			await col.insertMany(docs)
		} catch (insertErr) {
			// Rollback any partial insert so no half-exam is left behind
			await col.deleteMany({ examId })
			const msg = insertErr instanceof Error ? insertErr.message : ""
			if (msg.includes("E11000")) {
				return NextResponse.json(
					{
						duplicate: true,
						error: "Insert aborted: an exercise with the same title/slug already exists. Nothing was saved (rolled back).",
					},
					{ status: 409 }
				)
			}
			throw insertErr
		}

		return NextResponse.json(
			{
				success: true,
				examId,
				inserted: docs.length,
				slugs: docs.map((d) => d.slug),
			},
			{ status: 201 }
		)
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Server error" },
			{ status: 500 }
		)
	}
}

// ---------- PATCH /api/exams — one-time repair: set published on docs missing it ----------
export async function PATCH(req: NextRequest) {
	if (!isAuthorized(req)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}
	try {
		const db = await getDb()
		const res = await db
			.collection(COLLECTION)
			.updateMany({ published: { $exists: false } }, { $set: { published: true } })
		return NextResponse.json({ matched: res.matchedCount, modified: res.modifiedCount })
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Server error" },
			{ status: 500 }
		)
	}
}
