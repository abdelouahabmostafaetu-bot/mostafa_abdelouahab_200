import type { Db } from "mongodb";
import { MongoClient } from "mongodb";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
​
/* ── Vercel runtime ───────────────────────────────────────── */
export const runtime = "nodejs";
export const maxDuration = 60;
​
/* ── CORS ─────────────────────────────────────────────────── */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
​
/* ══════════════════════════════════════════════════════════
   CLOSED SPECIALTY LIST — single source of truth.
   The MCP tools enforce it with z.enum, and the REST import
   path normalizes toward it. "general" exams always have
   specialty = "".
   ══════════════════════════════════════════════════════════ */
const SPECIALTIES = [
  "Algèbre",
  "Systèmes Dynamiques",
  "Probabilités & Statistiques",
  "EDP",
  "Analyse Fonctionnelle",
  "Analyse Numérique & Optimisation",
  "Recherche Opérationnelle",
  "Analyse Complexe",
  "Biomathématiques",
] as const;
type Specialty = (typeof SPECIALTIES)[number];
​
/* canon(): lowercase, strip accents/punctuation → synonym key */
function canon(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
​
const SPECIALTY_SYNONYMS: Record<string, Specialty> = {
  // Algèbre (advanced: groups, rings, morphisms, crypto, discrete math)
  algebre: "Algèbre",
  algebra: "Algèbre",
  algbra: "Algèbre",
  algere: "Algèbre",
  "algebre avancee": "Algèbre",
  "theorie des groupes": "Algèbre",
  "group theory": "Algèbre",
  "theorie des nombres": "Algèbre",
  cryptographie: "Algèbre",
  cryptography: "Algèbre",
  crypto: "Algèbre",
  "math discrete": "Algèbre",
  "mathematiques discretes": "Algèbre",
  "discrete mathematics": "Algèbre",
  // Systèmes Dynamiques
  "systemes dynamiques": "Systèmes Dynamiques",
  "systeme dynamique": "Systèmes Dynamiques",
  "dynamical systems": "Systèmes Dynamiques",
  chaos: "Systèmes Dynamiques",
  // Probabilités & Statistiques
  probabilites: "Probabilités & Statistiques",
  "probabilites et statistiques": "Probabilités & Statistiques",
  "probabilites statistiques": "Probabilités & Statistiques",
  probability: "Probabilités & Statistiques",
  statistiques: "Probabilités & Statistiques",
  statistics: "Probabilités & Statistiques",
  "proba stat": "Probabilités & Statistiques",
  proba: "Probabilités & Statistiques",
  // EDP
  edp: "EDP",
  pde: "EDP",
  "equations aux derivees partielles": "EDP",
  "partial differential equations": "EDP",
  // Analyse Fonctionnelle
  "analyse fonctionnelle": "Analyse Fonctionnelle",
  "functional analysis": "Analyse Fonctionnelle",
  // Analyse Numérique & Optimisation
  "analyse numerique": "Analyse Numérique & Optimisation",
  "analyse numerique et optimisation": "Analyse Numérique & Optimisation",
  "numerical analysis": "Analyse Numérique & Optimisation",
  optimisation: "Analyse Numérique & Optimisation",
  optimization: "Analyse Numérique & Optimisation",
  // Recherche Opérationnelle
  "recherche operationnelle": "Recherche Opérationnelle",
  "operations research": "Recherche Opérationnelle",
  ro: "Recherche Opérationnelle",
  // Analyse Complexe
  "analyse complexe": "Analyse Complexe",
  "complex analysis": "Analyse Complexe",
  // Biomathématiques
  biomathematiques: "Biomathématiques",
  biomathematique: "Biomathématiques",
  biomath: "Biomathématiques",
  "mathematical biology": "Biomathématiques",
};
​
/**
 * Returns:
 *  - "" for empty input (general exams)
 *  - an official Specialty when the value is known/mappable
 *  - null when the value is unknown (caller decides what to do)
 */
function normalizeSpecialty(raw?: string | null): Specialty | "" | null {
  if (!raw || !raw.trim()) return "";
  const trimmed = raw.trim();
  const exact = SPECIALTIES.find((s) => s === trimmed);
  if (exact) return exact;
  return SPECIALTY_SYNONYMS[canon(trimmed)] ?? null;
}
​
/* ══════════════════════════════════════════════════════════
   UNIVERSITY NORMALIZATION — same philosophy as specialties:
   one official list + keyword matching. Unknown values are
   reported (never silently changed).
   ══════════════════════════════════════════════════════════ */
const UNIVERSITIES = [
  "Université Saâd Dahlab - Blida 1",
  "Université Djilali Liabès - Sidi Bel Abbès",
  "Université Larbi Ben M'Hidi - Oum El Bouaghi",
  "Université Abou Bekr Belkaïd - Tlemcen",
  "Université Abderrahmane Mira - Béjaïa",
  "Université Badji Mokhtar - Annaba",
  "Université Frères Mentouri - Constantine 1",
  "Université Ferhat Abbas - Sétif 1",
  "Université Mouloud Mammeri - Tizi Ouzou",
  "Université Mohamed Khider - Biskra",
  "Université Abdelhamid Ibn Badis - Mostaganem",
  "Université Ahmed Ben Bella - Oran 1",
  "Université des Sciences et de la Technologie Houari Boumediène (USTHB)",
  "Université des Sciences et de la Technologie d'Oran Mohamed Boudiaf (USTO-MB)",
  "Université d'Alger 1 - Benyoucef Benkhedda",
  "Université Batna 2 - Mostefa Ben Boulaïd",
  "Université Kasdi Merbah - Ouargla",
  "Université Amar Telidji - Laghouat",
  "Université Mohamed Boudiaf - M'Sila",
  "Université 8 Mai 1945 - Guelma",
  "Université Mohamed El Bachir El Ibrahimi - Bordj Bou Arréridj",
  "Université Hassiba Benbouali - Chlef",
  "Université M'Hamed Bougara - Boumerdès",
  "Université Ibn Khaldoun - Tiaret",
  "Université Dr Moulay Tahar - Saïda",
  "Université 20 Août 1955 - Skikda",
  "Université Mohammed Seddik Benyahia - Jijel",
  "Université Larbi Tébessi - Tébessa",
  "Université Akli Mohand Oulhadj - Bouira",
  "Université Yahia Farès - Médéa",
  "Université Ziane Achour - Djelfa",
  "Université Mustapha Stambouli - Mascara",
  "Centre Universitaire Abdelhafid Boussouf - Mila",
  "Centre Universitaire Nour Bachir - El Bayadh",
  "Centre Universitaire Salhi Ahmed - Naâma",
  "Centre Universitaire de Barika",
  "École Normale Supérieure Cheikh Mohamed El Bachir El Ibrahimi - Kouba (ENS Kouba)",
  "École Nationale Supérieure de Statistique et d'Économie Appliquée (ENSSEA)",
  "École Normale Supérieure d'Enseignement Technologique de Skikda (ENSET Skikda)",
  "Concours national d'accès au Doctorat (Algérie)",
  "Source inconnue",
] as const;
​
/* Keyword patterns tested against canon(raw). ORDER MATTERS:
   schools/acronyms BEFORE their city (enset before skikda, usto
   before oran, kouba before alger...). Extend freely. */
const UNIVERSITY_KEYWORDS: Array<[RegExp, string]> = [
  [
    /\benssea\b|statistique et d ?economie/,
    "École Nationale Supérieure de Statistique et d'Économie Appliquée (ENSSEA)",
  ],
  [
    /\benset\b/,
    "École Normale Supérieure d'Enseignement Technologique de Skikda (ENSET Skikda)",
  ],
  [
    /\bkouba\b/,
    "École Normale Supérieure Cheikh Mohamed El Bachir El Ibrahimi - Kouba (ENS Kouba)",
  ],
  [
    /\bmila\b|\babdelhafid boussouf\b/,
    "Centre Universitaire Abdelhafid Boussouf - Mila",
  ],
  [
    /\bel ?bayadh\b|\bnour bachir\b/,
    "Centre Universitaire Nour Bachir - El Bayadh",
  ],
  [/\bnaama\b|\bsalhi ahmed\b/, "Centre Universitaire Salhi Ahmed - Naâma"],
  [/\bbarika\b/, "Centre Universitaire de Barika"],
  [
    /\busthb\b|\bhouari boumediene\b|\bbab ezzouar\b/,
    "Université des Sciences et de la Technologie Houari Boumediène (USTHB)",
  ],
  [
    /\busto\b/,
    "Université des Sciences et de la Technologie d'Oran Mohamed Boudiaf (USTO-MB)",
  ],
  [/\bblida\b|\bsaad dahlab\b/, "Université Saâd Dahlab - Blida 1"],
  [
    /\bsidi bel abbes\b|\bdjilali liabes\b/,
    "Université Djilali Liabès - Sidi Bel Abbès",
  ],
  [
    /\boum el bouaghi\b|\blarbi ben m ?hidi\b/,
    "Université Larbi Ben M'Hidi - Oum El Bouaghi",
  ],
  [
    /\btlemcen\b|\babou bekr belkaid\b/,
    "Université Abou Bekr Belkaïd - Tlemcen",
  ],
  [
    /\bbejaia\b|\bbgayet\b|\babderrahmane mira\b/,
    "Université Abderrahmane Mira - Béjaïa",
  ],
  [/\bannaba\b|\bbadji mokhtar\b/, "Université Badji Mokhtar - Annaba"],
  [
    /\bconstantine\b|\bmentouri\b/,
    "Université Frères Mentouri - Constantine 1",
  ],
  [/\bsetif\b|\bferhat abbas\b/, "Université Ferhat Abbas - Sétif 1"],
  [
    /\btizi ?ouzou\b|\bmouloud mammeri\b/,
    "Université Mouloud Mammeri - Tizi Ouzou",
  ],
  [/\bbiskra\b|\bmohamed khider\b/, "Université Mohamed Khider - Biskra"],
  [
    /\bmostaganem\b|\bibn badis\b/,
    "Université Abdelhamid Ibn Badis - Mostaganem",
  ],
  [/\boran\b|\bahmed ben bella\b/, "Université Ahmed Ben Bella - Oran 1"],
  [
    /\balger\b|\bbenyoucef benkhedda\b/,
    "Université d'Alger 1 - Benyoucef Benkhedda",
  ],
  [
    /\bbatna\b|\bmostefa ben boulaid\b/,
    "Université Batna 2 - Mostefa Ben Boulaïd",
  ],
  [/\bouargla\b|\bkasdi merbah\b/, "Université Kasdi Merbah - Ouargla"],
  [/\blaghouat\b|\bamar telidji\b/, "Université Amar Telidji - Laghouat"],
  [/\bm ?sila\b/, "Université Mohamed Boudiaf - M'Sila"],
  [/\bguelma\b|\b8 mai 1945\b/, "Université 8 Mai 1945 - Guelma"],
  [
    /\bbordj bou arreridj\b|\bbba\b/,
    "Université Mohamed El Bachir El Ibrahimi - Bordj Bou Arréridj",
  ],
  [/\bchlef\b|\bhassiba benbouali\b/, "Université Hassiba Benbouali - Chlef"],
  [/\bboumerdes\b|\bbougara\b/, "Université M'Hamed Bougara - Boumerdès"],
  [/\btiaret\b|\bibn khaldoun\b/, "Université Ibn Khaldoun - Tiaret"],
  [/\bsaida\b|\bmoulay tahar\b/, "Université Dr Moulay Tahar - Saïda"],
  [/\bskikda\b|\b20 aout\b/, "Université 20 Août 1955 - Skikda"],
  [
    /\bjijel\b|\bseddik benyahia\b/,
    "Université Mohammed Seddik Benyahia - Jijel",
  ],
  [/\btebessa\b|\blarbi tebessi\b/, "Université Larbi Tébessi - Tébessa"],
  [/\bbouira\b|\bakli mohand\b/, "Université Akli Mohand Oulhadj - Bouira"],
  [/\bmedea\b|\byahia fares\b/, "Université Yahia Farès - Médéa"],
  [/\bdjelfa\b|\bziane achour\b/, "Université Ziane Achour - Djelfa"],
  [/\bmascara\b|\bstambouli\b/, "Université Mustapha Stambouli - Mascara"],
  [
    /\bconcours\b|\bministere\b|\bformation doctorale\b/,
    "Concours national d'accès au Doctorat (Algérie)",
  ],
  [/\bnon precisee?\b|\binconnue?\b|\bunknown\b/, "Source inconnue"],
];
​
/**
 * Returns the official name, or null when the value is unknown
 * (unknowns are reported by audits and fixed via rename_university).
 */
function normalizeUniversity(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return "Source inconnue";
  const trimmed = raw.trim();
  if ((UNIVERSITIES as readonly string[]).includes(trimmed)) return trimmed;
  const key = canon(trimmed);
  const exact = UNIVERSITIES.find((u) => canon(u) === key);
  if (exact) return exact;
  for (const [re, official] of UNIVERSITY_KEYWORDS) {
    if (re.test(key)) return official;
  }
  return null;
}
​
/* ── Mongo connection (cached across warm invocations) ────── */
let cachedClient: MongoClient | null = null;
​
async function getDb(): Promise<Db> {
  if (!cachedClient) {
    cachedClient = new MongoClient(process.env.MONGODB_URI as string);
    await cachedClient.connect();
  }
  return cachedClient.db("mylibrary");
}
​
/* ── Helpers ──────────────────────────────────────────────── */
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
​
async function nextExamId(db: Db): Promise<number> {
  const last = await db
    .collection("doctorateproblems")
    .find({ examId: { $type: "number" } })
    .sort({ examId: -1 })
    .limit(1)
    .project({ examId: 1 })
    .toArray();
  return (last[0]?.examId ?? 0) + 1;
}
​
function buildDocs(exam: any, examId: number) {
  const problems: any[] = exam.problems ?? exam.exercises ?? [];
  const examType =
    String(exam.examType ?? "specialist").toLowerCase() === "general"
      ? "general"
      : "specialist";
​
  // Normalize specialty toward the closed list; keep the raw value if
  // unknown so no data is lost (fix later with update_exam_classification).
  const rawSpecialty = String(exam.specialty ?? "");
  const normalizedSpec = normalizeSpecialty(rawSpecialty);
  const specialty =
    examType === "general" ? "" : (normalizedSpec ?? rawSpecialty);
​
  // Normalize university toward the official list; keep raw if unknown.
  const rawUniversity = String(exam.university ?? "");
  const university = normalizeUniversity(rawUniversity) ?? rawUniversity;
​
  return problems.map((p: any, i: number) => {
    const problemNumber = Number(p.problemNumber ?? i + 1);
    const title = String(p.title ?? `Exercice ${problemNumber}`);
    return {
      title,
      slug: `${Number(exam.year)}-${examType}-${slugify(title)}`,
      examType,
      specialty,
      year: Number(exam.year),
      university,
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
    };
  });
}
​
async function importExams(exams: any[]) {
  const db = await getDb();
  const col = db.collection("doctorateproblems");
  let inserted = 0;
  let updated = 0;
​
  for (const exam of exams) {
    const examId = exam.examId ?? (await nextExamId(db));
    const docs = buildDocs(exam, examId);
    for (const doc of docs) {
      const result = await col.updateOne(
        { slug: doc.slug },
        {
          $set: { ...doc, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
      if (result.upsertedCount > 0) inserted++;
      else if (result.modifiedCount > 0) updated++;
    }
  }
  return { inserted, updated };
}
​
async function deleteExam(examId: number): Promise<Response> {
  const db = await getDb();
  const result = await db
    .collection("doctorateproblems")
    .deleteMany({ examId });
  return Response.json(
    {
      ok: true,
      action: "delete",
      examId,
      deletedProblems: result.deletedCount,
    },
    { headers: corsHeaders },
  );
}
​
/* ── REST-style import/admin endpoint (Bearer IMPORT_TOKEN) ── */
async function handleImport(req: Request): Promise<Response> {
  try {
    const body = await req.json();
​
    // ===== DELETE EXAM BY examId =====
    if (!Array.isArray(body) && body && body.action === "delete") {
      const examId = Number(body.examId);
      if (!Number.isFinite(examId)) {
        return Response.json(
          { ok: false, error: "examId must be a number" },
          { status: 400, headers: corsHeaders },
        );
      }
      return deleteExam(examId);
    }
​
    // ===== LIST DISTINCT VALUES =====
    if (!Array.isArray(body) && body && body.action === "list_distinct") {
      const db = await getDb();
      const col = db.collection("doctorateproblems");
      const universities = await col.distinct("university");
      const specialties = await col.distinct("specialty");
      return Response.json(
        {
          ok: true,
          universities: (universities as string[]).filter(Boolean).sort(),
          specialties: (specialties as string[]).filter(Boolean).sort(),
          officialSpecialties: SPECIALTIES,
          officialUniversities: UNIVERSITIES,
        },
        { headers: corsHeaders },
      );
    }
​
    // ===== NORMALIZE universities / specialties (manual maps) =====
    if (!Array.isArray(body) && body && body.action === "normalize") {
      const db = await getDb();
      const col = db.collection("doctorateproblems");
      const results: {
        field: string;
        from: string;
        to: string;
        updated: number;
      }[] = [];
​
      const uniMap: Record<string, string> = body.universities ?? {};
      const specMap: Record<string, string> = body.specialties ?? {};
​
      for (const [oldVal, newVal] of Object.entries(uniMap)) {
        const r = await col.updateMany(
          { university: oldVal },
          { $set: { university: newVal, updatedAt: new Date() } },
        );
        if (r.modifiedCount > 0)
          results.push({
            field: "university",
            from: oldVal,
            to: String(newVal),
            updated: r.modifiedCount,
          });
      }
​
      for (const [oldVal, newVal] of Object.entries(specMap)) {
        const r = await col.updateMany(
          { specialty: oldVal },
          { $set: { specialty: newVal, updatedAt: new Date() } },
        );
        if (r.modifiedCount > 0)
          results.push({
            field: "specialty",
            from: oldVal,
            to: String(newVal),
            updated: r.modifiedCount,
          });
      }
​
      return Response.json(
        {
          ok: true,
          action: "normalize",
          changes: results.length,
          details: results,
        },
        { headers: corsHeaders },
      );
    }
​
    // ===== AUTO-NORMALIZE specialties toward the closed list =====
    if (
      !Array.isArray(body) &&
      body &&
      body.action === "auto_normalize_specialties"
    ) {
      const db = await getDb();
      const report = await autoNormalizeSpecialties(db);
      return Response.json(
        { ok: true, action: "auto_normalize_specialties", ...report },
        { headers: corsHeaders },
      );
    }
​
    // ===== AUTO-NORMALIZE universities toward the official list =====
    if (
      !Array.isArray(body) &&
      body &&
      body.action === "auto_normalize_universities"
    ) {
      const db = await getDb();
      const report = await autoNormalizeUniversities(db);
      return Response.json(
        { ok: true, action: "auto_normalize_universities", ...report },
        { headers: corsHeaders },
      );
    }
​
    // ===== CLEAR SPECIALTY FOR GENERAL EXAMS =====
    if (
      !Array.isArray(body) &&
      body &&
      body.action === "clear_general_specialty"
    ) {
      const db = await getDb();
      const result = await db
        .collection("doctorateproblems")
        .updateMany(
          { examType: "general" },
          { $set: { specialty: "", updatedAt: new Date() } },
        );
      return Response.json(
        {
          ok: true,
          action: "clear_general_specialty",
          updated: result.modifiedCount,
        },
        { headers: corsHeaders },
      );
    }
​
    // ===== GET EXAM BY examId =====
    if (!Array.isArray(body) && body && body.action === "get_exam") {
      const examId = Number(body.examId);
      if (!Number.isFinite(examId))
        return Response.json(
          { ok: false, error: "examId must be a number" },
          { status: 400, headers: corsHeaders },
        );
      const db = await getDb();
      const problems = await db
        .collection("doctorateproblems")
        .find({ examId })
        .sort({ problemNumber: 1 })
        .toArray();
      if (problems.length === 0)
        return Response.json(
          { ok: false, error: `No exam found with ID ${examId}` },
          { status: 404, headers: corsHeaders },
        );
      return Response.json(
        { ok: true, examId, problems },
        { headers: corsHeaders },
      );
    }
​
    // ===== UPDATE EXAM-LEVEL FIELDS =====
    if (!Array.isArray(body) && body && body.action === "update_exam_fields") {
      const examId = Number(body.examId);
      if (!Number.isFinite(examId))
        return Response.json(
          { ok: false, error: "examId must be a number" },
          { status: 400, headers: corsHeaders },
        );
      const db = await getDb();
      const fields: any = { updatedAt: new Date() };
      if (body.university !== undefined)
        fields.university =
          normalizeUniversity(body.university) ?? body.university;
      if (body.specialty !== undefined) {
        const normalized = normalizeSpecialty(body.specialty);
        fields.specialty = normalized ?? body.specialty;
      }
      if (body.examType !== undefined) {
        fields.examType = body.examType;
        if (body.examType === "general") fields.specialty = "";
      }
      if (body.year !== undefined) fields.year = Number(body.year);
      if (body.source !== undefined) fields.source = body.source;
      const result = await db
        .collection("doctorateproblems")
        .updateMany({ examId }, { $set: fields });
      return Response.json(
        {
          ok: true,
          action: "update_exam_fields",
          examId,
          updated: result.modifiedCount,
        },
        { headers: corsHeaders },
      );
    }
​
    // ===== UPDATE ONE PROBLEM BY SLUG =====
    if (!Array.isArray(body) && body && body.action === "update_problem") {
      const db = await getDb();
      const fields: any = { updatedAt: new Date() };
      if (body.title !== undefined) fields.title = body.title;
      if (body.difficulty !== undefined) fields.difficulty = body.difficulty;
      if (body.tags !== undefined)
        fields.tags = Array.isArray(body.tags)
          ? body.tags
          : String(body.tags)
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean);
      if (body.statement !== undefined) fields.statement = body.statement;
      if (body.solution !== undefined) fields.solution = body.solution;
      const result = await db
        .collection("doctorateproblems")
        .updateOne({ slug: body.slug }, { $set: fields });
      return Response.json(
        { ok: true, action: "update_problem", updated: result.modifiedCount },
        { headers: corsHeaders },
      );
    }
​
    // ===== DELETE ONE PROBLEM BY SLUG =====
    if (!Array.isArray(body) && body && body.action === "delete_problem") {
      const db = await getDb();
      const result = await db
        .collection("doctorateproblems")
        .deleteOne({ slug: body.slug });
      return Response.json(
        { ok: true, action: "delete_problem", deleted: result.deletedCount },
        { headers: corsHeaders },
      );
    }
​
    // ===== ADD NEW PROBLEM TO EXISTING EXAM =====
    if (!Array.isArray(body) && body && body.action === "add_problem") {
      const db = await getDb();
      const examId = Number(body.examId);
      const problemNumber = Number(body.problemNumber ?? 1);
      const title = String(body.title ?? `Exercice ${problemNumber}`);
      const examType = body.examType ?? "specialist";
      const normalized = normalizeSpecialty(body.specialty);
      const doc = {
        title,
        slug: `${examId}-new-${Date.now()}`,
        examType,
        specialty:
          examType === "general" ? "" : (normalized ?? body.specialty ?? ""),
        year: Number(body.year ?? 0),
        university:
          normalizeUniversity(body.university) ?? body.university ?? "",
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
      };
      await db.collection("doctorateproblems").insertOne(doc);
      return Response.json(
        { ok: true, action: "add_problem", examId },
        { headers: corsHeaders },
      );
    }
​
    // ===== UPDATE SPECIALTY BY examId =====
    if (!Array.isArray(body) && body && body.action === "update_specialty") {
      const examId = Number(body.examId);
      const raw = String(body.specialty ?? "");
      if (!Number.isFinite(examId))
        return Response.json(
          { ok: false, error: "examId must be a number" },
          { status: 400, headers: corsHeaders },
        );
      const normalized = normalizeSpecialty(raw);
      const specialty = normalized ?? raw;
      const db = await getDb();
      const result = await db
        .collection("doctorateproblems")
        .updateMany({ examId }, { $set: { specialty, updatedAt: new Date() } });
      return Response.json(
        {
          ok: true,
          action: "update_specialty",
          examId,
          specialty,
          normalized: normalized !== null,
          updated: result.modifiedCount,
        },
        { headers: corsHeaders },
      );
    }
​
    const exams: any[] = Array.isArray(body) ? body : (body.exams ?? []);
    if (exams.length === 0) {
      return Response.json(
        { error: "No exams provided" },
        { status: 400, headers: corsHeaders },
      );
    }
    const { inserted, updated } = await importExams(exams);
    return Response.json(
      { ok: true, inserted, updated },
      { headers: corsHeaders },
    );
  } catch (err: any) {
    return Response.json(
      { error: err.message },
      { status: 500, headers: corsHeaders },
    );
  }
}
​
/* ══════════════════════════════════════════════════════════
   Shared cleanup routines. Unknown values are reported,
   never silently changed.
   ══════════════════════════════════════════════════════════ */
async function autoNormalizeSpecialties(db: Db) {
  const col = db.collection("doctorateproblems");
​
  // 1) general exams never carry a specialty
  const cleared = await col.updateMany(
    { examType: "general", specialty: { $ne: "" } },
    { $set: { specialty: "", updatedAt: new Date() } },
  );
​
  // 2) map every distinct specialist value through the synonym table
  const distinct = (await col.distinct("specialty")) as string[];
  let normalizedCount = 0;
  const changes: { from: string; to: string; updated: number }[] = [];
  const unknown: string[] = [];
​
  for (const value of distinct) {
    if (!value) continue;
    const target = normalizeSpecialty(value);
    if (target === null) {
      unknown.push(value);
      continue;
    }
    if (target !== value) {
      const r = await col.updateMany(
        { specialty: value, examType: "specialist" },
        { $set: { specialty: target, updatedAt: new Date() } },
      );
      normalizedCount += r.modifiedCount;
      changes.push({ from: value, to: target, updated: r.modifiedCount });
    }
  }
​
  return {
    clearedGeneral: cleared.modifiedCount,
    normalized: normalizedCount,
    changes,
    unknownValues: unknown, // fix these with update_exam_classification
    officialSpecialties: SPECIALTIES,
  };
}
​
async function autoNormalizeUniversities(db: Db) {
  const col = db.collection("doctorateproblems");
  const distinct = (await col.distinct("university")) as string[];
  let normalizedCount = 0;
  const changes: { from: string; to: string; updated: number }[] = [];
  const unknown: string[] = [];
​
  for (const value of distinct) {
    if (!value) continue;
    const target = normalizeUniversity(value);
    if (target === null) {
      unknown.push(value);
      continue;
    }
    if (target !== value) {
      const r = await col.updateMany(
        { university: value },
        { $set: { university: target, updatedAt: new Date() } },
      );
      normalizedCount += r.modifiedCount;
      changes.push({ from: value, to: target, updated: r.modifiedCount });
    }
  }
​
  return {
    normalized: normalizedCount,
    changes,
    unknownValues: unknown, // fix these with rename_university
    officialUniversities: UNIVERSITIES,
  };
}
​
/* ── MCP server (stateless per request) ───────────────────── */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "doctorate-exams-mcp",
    version: "3.0.0",
  });
​
  server.tool(
    "add_doctorate_exam",
    "Add a doctorate exam. Each problem becomes one flat document in doctorateproblems with a shared numeric examId. RULES: examType 'general' = exam mixing undergraduate licence subjects, its specialty is ALWAYS empty. examType 'specialist' REQUIRES exactly one specialty from the closed list. University names are normalized toward the official list automatically.",
    {
      examType: z.enum(["general", "specialist"]),
      year: z.number(),
      university: z.string(),
      // Closed list enforced by the server itself:
      specialty: z.enum(SPECIALTIES).optional(),
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
        }),
      ),
    },
    async (args) => {
      if (args.examType === "specialist" && !args.specialty) {
        return {
          content: [
            {
              type: "text" as const,
              text: `ERROR: specialist exams require a specialty. Choose one of: ${SPECIALTIES.join(" | ")}`,
            },
          ],
        };
      }
      const payload = {
        ...args,
        specialty: args.examType === "general" ? "" : args.specialty,
      };
      const { inserted, updated } = await importExams([payload]);
      const uniNormalized = normalizeUniversity(args.university);
      const uniNote =
        uniNormalized === null
          ? ` WARNING: university "${args.university}" is not in the official list — stored as-is. Fix with rename_university if needed.`
          : "";
      return {
        content: [
          {
            type: "text" as const,
            text: `inserted=${inserted}, updated=${updated}.${uniNote}`,
          },
        ],
      };
    },
  );
​
  server.tool(
    "get_doctorate_exam",
    "Load ALL problems (statements + solutions) of one exam by its numeric examId. Use this to READ an exam before classifying it or comparing duplicates.",
    { examId: z.number() },
    async ({ examId }) => {
      const db = await getDb();
      const problems = await db
        .collection("doctorateproblems")
        .find({ examId })
        .sort({ problemNumber: 1 })
        .toArray();
      if (problems.length === 0) {
        return {
          content: [
            { type: "text" as const, text: `No exam found with ID ${examId}` },
          ],
        };
      }
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(problems, null, 2) },
        ],
      };
    },
  );
​
  server.tool(
    "update_exam_classification",
    "Set the classification of one exam (all its problems share the examId). Pass examType 'general' to mark it as a general exam (specialty is cleared automatically), or examType 'specialist' + a specialty from the closed list.",
    {
      examId: z.number(),
      examType: z.enum(["general", "specialist"]),
      specialty: z.enum(SPECIALTIES).optional(),
    },
    async ({ examId, examType, specialty }) => {
      if (examType === "specialist" && !specialty) {
        return {
          content: [
            {
              type: "text" as const,
              text: `ERROR: specialist exams require a specialty. Choose one of: ${SPECIALTIES.join(" | ")}`,
            },
          ],
        };
      }
      const db = await getDb();
      const result = await db.collection("doctorateproblems").updateMany(
        { examId },
        {
          $set: {
            examType,
            specialty: examType === "general" ? "" : specialty,
            updatedAt: new Date(),
          },
        },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Exam #${examId} → ${examType}${
              examType === "specialist" ? ` / ${specialty}` : ""
            } (updated ${result.modifiedCount} problems)`,
          },
        ],
      };
    },
  );
​
  server.tool(
    "list_doctorate_exams",
    "List doctorate exam problems, most recent first. Optional filters: year, specialty, examType, onlyUnclassified (specialist exams whose specialty is empty or not in the official list).",
    {
      limit: z.number().optional(),
      year: z.number().optional(),
      specialty: z.enum(SPECIALTIES).optional(),
      examType: z.enum(["general", "specialist"]).optional(),
      onlyUnclassified: z.boolean().optional(),
    },
    async ({ limit, year, specialty, examType, onlyUnclassified }) => {
      const db = await getDb();
      const filter: Record<string, unknown> = {};
      if (year) filter.year = year;
      if (specialty) filter.specialty = specialty;
      if (examType) filter.examType = examType;
      if (onlyUnclassified) {
        filter.examType = "specialist";
        filter.specialty = { $nin: [...SPECIALTIES] };
      }
      const docs = await db
        .collection("doctorateproblems")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit ?? 20)
        .project({
          title: 1,
          examId: 1,
          year: 1,
          examType: 1,
          specialty: 1,
          university: 1,
        })
        .toArray();
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(docs, null, 2) },
        ],
      };
    },
  );
​
  server.tool(
    "audit_specialties",
    "Audit data quality: distinct specialty values with counts, which values are OUTSIDE the official closed list, per examType.",
    {},
    async () => {
      const db = await getDb();
      const col = db.collection("doctorateproblems");
      const counts = await col
        .aggregate([
          {
            $group: {
              _id: { specialty: "$specialty", examType: "$examType" },
              problems: { $sum: 1 },
              examIds: { $addToSet: "$examId" },
            },
          },
          { $sort: { problems: -1 } },
        ])
        .toArray();
      const report = counts.map((c: any) => ({
        specialty: c._id.specialty || "(empty)",
        examType: c._id.examType,
        problems: c.problems,
        exams: c.examIds.length,
        official:
          c._id.examType === "general"
            ? c._id.specialty === ""
            : (SPECIALTIES as readonly string[]).includes(c._id.specialty),
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { officialSpecialties: SPECIALTIES, specialtyReport: report },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
​
  server.tool(
    "normalize_all_specialties",
    "One-shot cleanup: clears specialty on all general exams and maps every known synonym (algebra, edp, chaos, proba stat, ...) to its official specialty. Returns unknown values that need manual classification via update_exam_classification.",
    {},
    async () => {
      const db = await getDb();
      const report = await autoNormalizeSpecialties(db);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(report, null, 2) },
        ],
      };
    },
  );
​
  server.tool(
    "audit_universities",
    "Audit universities: every distinct value with exam/problem counts, whether it matches the official list, and the suggested official name. Run before and after cleanup.",
    {},
    async () => {
      const db = await getDb();
      const rows = await db
        .collection("doctorateproblems")
        .aggregate([
          {
            $group: {
              _id: "$university",
              problems: { $sum: 1 },
              examIds: { $addToSet: "$examId" },
            },
          },
          { $sort: { problems: -1 } },
        ])
        .toArray();
      const report = rows.map((r: any) => ({
        university: r._id || "(empty)",
        problems: r.problems,
        exams: r.examIds.length,
        official: (UNIVERSITIES as readonly string[]).includes(r._id),
        suggested: r._id ? normalizeUniversity(r._id) : "Source inconnue",
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { officialUniversities: UNIVERSITIES, report },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
​
  server.tool(
    "normalize_all_universities",
    "One-shot cleanup: merges every duplicate/variant university spelling into its official name (accents, hyphens, abbreviations, acronyms). Returns unknown values to fix manually with rename_university.",
    {},
    async () => {
      const db = await getDb();
      const report = await autoNormalizeUniversities(db);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(report, null, 2) },
        ],
      };
    },
  );
​
  server.tool(
    "rename_university",
    "Rename ONE exact university value across all problems (for unknown values that auto-normalize could not map). 'from' must match the stored value exactly.",
    { from: z.string(), to: z.string() },
    async ({ from, to }) => {
      const db = await getDb();
      const target = normalizeUniversity(to) ?? to;
      const result = await db
        .collection("doctorateproblems")
        .updateMany(
          { university: from },
          { $set: { university: target, updatedAt: new Date() } },
        );
      return {
        content: [
          {
            type: "text" as const,
            text: `"${from}" → "${target}" (updated ${result.modifiedCount} problems)`,
          },
        ],
      };
    },
  );
​
  server.tool(
    "set_exam_university",
    "Set the university of ONE exam (all problems sharing the examId). The value is normalized toward the official list when possible.",
    { examId: z.number(), university: z.string() },
    async ({ examId, university }) => {
      const db = await getDb();
      const target = normalizeUniversity(university) ?? university;
      const result = await db
        .collection("doctorateproblems")
        .updateMany(
          { examId },
          { $set: { university: target, updatedAt: new Date() } },
        );
      return {
        content: [
          {
            type: "text" as const,
            text: `Exam #${examId} → "${target}" (updated ${result.modifiedCount} problems)`,
          },
        ],
      };
    },
  );
​
  server.tool(
    "find_duplicate_candidates",
    "Find groups of exams sharing the same year + university + examType + specialty (potential duplicates). ALWAYS verify content with get_doctorate_exam before deleting anything.",
    {},
    async () => {
      const db = await getDb();
      const groups = await db
        .collection("doctorateproblems")
        .aggregate([
          {
            $group: {
              _id: {
                year: "$year",
                university: "$university",
                examType: "$examType",
                specialty: "$specialty",
                examId: "$examId",
              },
              problems: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: {
                year: "$_id.year",
                university: "$_id.university",
                examType: "$_id.examType",
                specialty: "$_id.specialty",
              },
              exams: {
                $push: { examId: "$_id.examId", problems: "$problems" },
              },
              examCount: { $sum: 1 },
            },
          },
          { $match: { examCount: { $gt: 1 } } },
          { $sort: { "_id.year": -1 } },
        ])
        .toArray();
      return {
        content: [
          {
            type: "text" as const,
            text:
              groups.length === 0
                ? "No duplicate candidates found."
                : JSON.stringify(groups, null, 2),
          },
        ],
      };
    },
  );
​
  server.tool(
    "delete_doctorate_exam",
    "Delete ALL problems of one exam by its numeric examId from doctorateproblems.",
    { examId: z.number() },
    async ({ examId }) => {
      const db = await getDb();
      const result = await db
        .collection("doctorateproblems")
        .deleteMany({ examId });
      return {
        content: [
          {
            type: "text" as const,
            text: `Deleted ${result.deletedCount} problems from exam #${examId}`,
          },
        ],
      };
    },
  );
​
  return server;
}
​
/**
 * Runs a single MCP JSON-RPC request through the official SDK's Streamable
 * HTTP transport, in stateless + JSON-only mode.
 * enableJsonResponse: true avoids the SSE "Not Acceptable" rejection.
 */
async function handleMcp(req: Request): Promise<Response> {
  let server: McpServer | undefined;
​
  try {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
      enableJsonResponse: true, // no SSE requirement
    });
​
    server = createMcpServer();
    await server.connect(transport);
​
    // Patch the Accept header so clients that don't send text/event-stream
    // (ClickUp, PowerShell, some Notion clients) are still accepted.
    const bodyText = await req.text();
    const patchedHeaders = new Headers(req.headers);
    patchedHeaders.set("accept", "application/json, text/event-stream");
    patchedHeaders.set("content-type", "application/json");
​
    const patchedReq = new Request(req.url, {
      method: "POST",
      headers: patchedHeaders,
      body: bodyText,
    });
​
    const response = await transport.handleRequest(patchedReq);
​
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      headers.set(key, value);
    }
​
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("[MCP] handler error:", error);
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: "Internal server error" },
      },
      { status: 500, headers: corsHeaders },
    );
  } finally {
    if (server) {
      await server.close().catch(() => {});
    }
  }
}
​
/* ── Route handlers ───────────────────────────────────────── */
​
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
​
/**
 * POST /api/mcp — routed by REQUEST CONTENT:
 * JSON-RPC 2.0 body → MCP handler (either valid token).
 * Anything else → REST admin/import path (IMPORT_TOKEN only).
 */
export async function POST(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization");
​
  const importAuth = `Bearer ${process.env.IMPORT_TOKEN}`;
  const mcpAuth = `Bearer ${process.env.MCP_API_KEY}`;
​
  if (auth !== importAuth && auth !== mcpAuth) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }
​
  let looksLikeMcp = false;
  try {
    const preview: any = await req.clone().json();
    looksLikeMcp =
      !!preview &&
      !Array.isArray(preview) &&
      preview.jsonrpc === "2.0" &&
      typeof preview.method === "string";
  } catch {
    looksLikeMcp = false;
  }
​
  if (looksLikeMcp) {
    return handleMcp(req);
  }
​
  if (auth === importAuth) {
    return handleImport(req);
  }
​
  return new Response("Unauthorized", { status: 401, headers: corsHeaders });
}
​
/** GET /api/mcp — plain, unauthenticated health check. */
export async function GET(): Promise<Response> {
  return Response.json({ status: "ok" }, { headers: corsHeaders });
}
​
