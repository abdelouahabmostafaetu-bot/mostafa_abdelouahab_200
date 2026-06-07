import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Note } from "@/lib/models/note";
import { requireAdminApi } from "@/lib/admin";
import { checkRateLimit } from "@/lib/security";
import { slugify } from "@/lib/utils";

type RouteContext = { params: Promise<{ slug: string }> };

/* ─── GET ──────────────────────────────────────────────────────────────── */

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    const note = await Note.findOne({ slug, published: true }).lean();
    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...note, id: String(note._id), _id: undefined },
    });
  } catch (error) {
    console.error("Note GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch note" },
      { status: 500 },
    );
  }
}

/* ─── PUT ──────────────────────────────────────────────────────────────── */

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const rateLimitResponse = checkRateLimit(request, "notes:update", 10);
    if (rateLimitResponse) return rateLimitResponse;

    const adminResponse = await requireAdminApi();
    if (adminResponse) return adminResponse;

    await connectToDatabase();

    /* Find by original slug — no published filter so drafts can also be edited */
    const note = await Note.findOne({ slug });
    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 },
      );
    }

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

    /* Title + slug update */
    if (typeof title === "string" && title.trim()) {
      note.title = title.trim();
      const newSlug = slugify(title.trim());
      if (newSlug !== note.slug) {
        const conflict = await Note.findOne({ slug: newSlug });
        if (conflict && String(conflict._id) !== String(note._id)) {
          return NextResponse.json(
            { success: false, error: "A note with this title already exists" },
            { status: 400 },
          );
        }
        note.slug = newSlug;
      }
    }

    if (typeof content === "string" && content.trim())
      note.content = content.trim();
    if (typeof category === "string" && category) note.category = category;
    if (typeof difficulty === "string" && difficulty)
      note.difficulty = difficulty;
    if (typeof preview === "string" && preview.trim())
      note.preview = preview.trim();
    if (typeof isFavorite === "boolean") note.isFavorite = isFavorite;

    if (Array.isArray(tags)) {
      note.tags = (tags as string[])
        .filter((t) => typeof t === "string")
        .map((t) => t.trim());
    }
    if (Array.isArray(references)) {
      note.references = (references as string[]).filter(
        (r) => typeof r === "string",
      );
    }

    await note.save();

    return NextResponse.json({
      success: true,
      data: { ...note.toObject(), id: String(note._id), _id: undefined },
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to update note";
    console.error("Note PUT error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/* ─── DELETE ───────────────────────────────────────────────────────────── */

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const rateLimitResponse = checkRateLimit(request, "notes:delete", 10);
    if (rateLimitResponse) return rateLimitResponse;

    const adminResponse = await requireAdminApi();
    if (adminResponse) return adminResponse;

    await connectToDatabase();

    const result = await Note.deleteOne({ slug });
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Note DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete note" },
      { status: 500 },
    );
  }
}
