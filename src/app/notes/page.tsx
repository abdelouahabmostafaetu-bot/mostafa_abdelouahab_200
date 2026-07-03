import type { Metadata } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { NotebookModel } from "@/lib/models/notebook";
import { NotebookPageModel } from "@/lib/models/notebook-page";
import { getCurrentAdminUser } from "@/lib/admin";
import NotebooksExplorer, {
  type NotebookSummary,
} from "@/components/notes/NotebooksExplorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research Journal",
  description:
    "A personal collection of PhD research notebooks — theories, theorems, definitions, and observations in mathematics.",
};

async function getNotebooks(): Promise<NotebookSummary[]> {
  try {
    await connectToDatabase();

    const [notebooks, counts] = await Promise.all([
      NotebookModel.find({ isPublished: true }).sort({ createdAt: -1 }).lean(),
      NotebookPageModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$notebookSlug", count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(counts.map((c) => [c._id, c.count]));

    return notebooks.map((nb) => ({
      id: String(nb._id),
      slug: nb.slug,
      title: nb.title,
      subject: nb.subject,
      description: nb.description,
      color: nb.color,
      pageCount: countMap.get(nb.slug) ?? 0,
    }));
  } catch {
    return [];
  }
}

export default async function NotesPage() {
  const [notebooks, adminUser] = await Promise.all([
    getNotebooks(),
    getCurrentAdminUser(),
  ]);

  return (
    <NotebooksExplorer notebooks={notebooks} isAdmin={Boolean(adminUser)} />
  );
}
