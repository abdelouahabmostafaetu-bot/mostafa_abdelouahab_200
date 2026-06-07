import { INote } from '@/lib/models/note';

export function mapNoteSummary(note: any): any {
  return {
    id: note._id?.toString?.() || note.id,
    title: note.title,
    slug: note.slug,
    preview: note.preview || note.content?.substring(0, 300),
    category: note.category,
    difficulty: note.difficulty,
    isFavorite: note.isFavorite,
    tags: note.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export function mapNoteDetail(note: any): any {
  return {
    id: note._id?.toString?.() || note.id,
    title: note.title,
    slug: note.slug,
    content: note.content,
    preview: note.preview,
    category: note.category,
    difficulty: note.difficulty,
    isFavorite: note.isFavorite,
    tags: note.tags,
    references: note.references,
    author: note.author,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}
