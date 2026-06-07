'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function RemoveNotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const searchNotes = async (query: string) => {
    if (!query.trim()) {
      setNotes([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/notes?search=${encodeURIComponent(query)}&limit=50&admin=1`);
      const data = await response.json();

      if (data.success) {
        setNotes(data.data || []);
      }
    } catch (error) {
      console.error('Error searching notes:', error);
      toast.error('Failed to search notes');
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async (slug: string) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/notes/${slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin: 1 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete note');
      }

      toast.success('Note deleted successfully');
      setNotes((prev) => prev.filter((n) => n.slug !== slug));
      setConfirmDelete(null);
      router.refresh();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to delete note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <a href="/admin/notes" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
            <span>←</span> Back
          </a>
          <h1 className="text-3xl font-bold text-white">Remove Note</h1>
          <p className="mt-2 text-gray-400">Delete notes from your collection</p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="rounded-lg border border-red-700/30 bg-red-900/20 p-4 flex gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-200">Permanent Action</p>
            <p className="text-xs text-red-300 mt-1">
              Deleting a note is permanent and cannot be undone. Please proceed with caution.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 pb-12">
        <div className="space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Search Notes to Delete</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchNotes(e.target.value);
                }}
                placeholder="Search by title or content..."
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
              />
              {searching && <span className="absolute right-4 top-3 text-red-400">⟳</span>}
            </div>
          </div>

          {/* Notes List */}
          {notes.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Found {notes.length} results</p>

              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 hover:border-gray-600 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{note.title}</h3>
                      <p className="mt-1 text-sm text-gray-400 line-clamp-2">{note.preview}</p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                          {note.category}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                          {note.difficulty}
                        </span>
                        {note.isFavorite && (
                          <span className="text-xs px-2 py-1 rounded bg-yellow-900/50 text-yellow-200">
                            ⭐ Favorite
                          </span>
                        )}
                      </div>
                    </div>

                    {confirmDelete === note.slug ? (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleDelete(note.slug)}
                          disabled={loading}
                          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          disabled={loading}
                          className="px-4 py-2 rounded-lg border border-gray-700 text-white text-sm font-semibold hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(note.slug)}
                        className="flex-shrink-0 px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-300 hover:text-red-200 text-sm font-semibold transition-all border border-red-700/50 hover:border-red-700"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery && notes.length === 0 && !searching && (
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center">
              <p className="text-gray-400">No notes found matching your search</p>
            </div>
          )}

          {!searchQuery && (
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center">
              <p className="text-gray-400">Start typing to search for notes to delete</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
