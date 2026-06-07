import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Note } from "@/lib/models/note";
import { requireAdminApi } from "@/lib/admin";
import { checkRateLimit } from "@/lib/security";
import { slugify } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      200,
      parseInt(searchParams.get("limit") || "50", 10),
    );
    const favorite = searchParams.get("favorite") === "true";
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    /*
     * published filter:
     *  - param = 'true'  → only published
     *  - param = 'false' → only drafts
     *  - param absent    → all notes (used by admin pages)
     */
    const publishedParam = searchParams.get("published");
    const publishedFilter =
      publishedParam === "true"
        ? { published: true }
        : publishedParam === "false"
          ? { published: false }
          : {}; /* no filter → return everything */

    await connectToDatabase();

    const query: Record<string, unknown> = { ...publishedFilter };
    if (favorite) query.isFavorite = true;
    if (category) query.category = category;
    if (search) query.$text = { $search: search };

    const skip = (page - 1) * limit;
    const total = await Note.countDocuments(query);
    const notes = await Note.find(query)
      .sort({ isFavorite: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const data = notes.map((note) => ({
      ...note,
      id: String(note._id),
      _id: undefined,
      __v: undefined,
    }));

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Notes GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = checkRateLimit(request, "notes:create", 10);
    if (rateLimitResponse) return rateLimitResponse;

    const adminResponse = await requireAdminApi();
    if (adminResponse) return adminResponse;

    await connectToDatabase();

    const body = (await request.json()) as Record<string, unknown>;
    const {
      title,
      content,
      category,
      tags,
      difficulty,
      isFavorite,
      preview,
      references,
    } = body;

    if (!String(title ?? "").trim() || !String(content ?? "").trim()) {
      return NextResponse.json(
        { success: false, error: "Title and content are required" },
        { status: 400 },
      );
    }

    const titleStr = String(title).trim();
    const slug = slugify(titleStr);

    const existing = await Note.findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A note with this title already exists" },
        { status: 400 },
      );
    }

    const contentStr = String(content).trim();

    const note = new Note({
      title: titleStr,
      slug,
      content: contentStr,
      category: category || "note",
      tags: Array.isArray(tags)
        ? (tags as string[])
            .filter((t) => typeof t === "string")
            .map((t) => t.trim())
        : [],
      difficulty: difficulty || "intermediate",
      isFavorite: Boolean(isFavorite),
      preview:
        String(preview ?? "").trim() || contentStr.substring(0, 300).trim(),
      references: Array.isArray(references)
        ? (references as string[]).filter((r) => typeof r === "string")
        : [],
      published: true,
    });

    await note.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          ...note.toObject(),
          id: String(note._id),
          _id: undefined,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to create note";
    console.error("Notes POST error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
