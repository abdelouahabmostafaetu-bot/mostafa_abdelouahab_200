'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AdminMarkdownEditor from '@/components/admin/AdminMarkdownEditor';

export default function EditNotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [preview, setPreview] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    preview: '',
    category: 'theorem' as 'theorem' | 'definition' | 'lemma' | 'corollary' | 'conjecture' | 'note',
    tags: '',
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'research',
    isFavorite: false,
    references: '',
  });

  const searchNotes = async (query: string) => {
    if (!query.trim()) {
      setNotes([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/notes?search=${encodeURIComponent(query)}&limit=20&admin=1`);
      const data = await response.json();

      if (data.success) {
        setNotes(data.data || []);
      }
    } catch (error) {
      console.error('Error searching notes:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectNote = (note: any) => {
    setSelectedNote(note);
    setFormData({
      title: note.title || '',
      content: note.content || '',
      preview: note.preview || '',
      category: note.category || 'theorem',
      tags: (note.tags || []).join(', '),
      difficulty: note.difficulty || 'intermediate',
      isFavorite: note.isFavorite || false,
      references: (note.references || []).join('\n'),
    });
    setNotes([]);
    setSearchQuery(note.title);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleContentChange = (content: string) => {
    setFormData((prev) => ({
      ...prev,
      content,
    }));
    setPreview(content.substring(0, 300));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedNote) {
      toast.error('Please select a note');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Please enter content');
      return;
    }

    setLoading(true);

    try {
      const tags = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const references = formData.references
        .split('\n')
        .map((ref) => ref.trim())
        .filter((ref) => ref);

      const response = await fetch(`/api/notes/${selectedNote.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          preview: formData.preview || preview,
          category: formData.category,
          tags,
          difficulty: formData.difficulty,
          isFavorite: formData.isFavorite,
          references,
          admin: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update note');
      }

      toast.success('Note updated successfully!');
      router.push('/admin/notes');
      router.refresh();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to update note');
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
          <h1 className="text-3xl font-bold text-white">Edit Note</h1>
          <p className="mt-2 text-gray-400">Modify an existing note</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        {!selectedNote ? (
          // Search View
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Search Notes</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchNotes(e.target.value);
                  }}
                  placeholder="Search by title or content..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {searching && <span className="absolute right-4 top-3 text-blue-400">⟳</span>}
              </div>
            </div>

            {notes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Found {notes.length} results</p>
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className="w-full text-left rounded-lg border border-gray-700 bg-gray-800 p-4 hover:border-blue-500 hover:bg-gray-700 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                          {note.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-400 line-clamp-2">{note.preview}</p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                            {note.category}
                          </span>
                          {note.isFavorite && <span className="text-xs px-2 py-1 rounded bg-yellow-900/50 text-yellow-200">
                            ⭐ Favorite
                          </span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && notes.length === 0 && !searching && (
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6 text-center">
                <p className="text-gray-400">No notes found matching your search</p>
              </div>
            )}
          </div>
        ) : (
          // Edit Form
          <form onSubmit={handleSubmit} className="space-y-6">
            <button
              type="button"
              onClick={() => setSelectedNote(null)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              ← Change note
            </button>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="theorem">Theorem</option>
                    <option value="definition">Definition</option>
                    <option value="lemma">Lemma</option>
                    <option value="corollary">Corollary</option>
                    <option value="conjecture">Conjecture</option>
                    <option value="note">Note</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Difficulty Level</label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="research">Research Level</option>
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                {/* Favorite */}
                <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-700 bg-gray-900/50">
                  <input
                    type="checkbox"
                    name="isFavorite"
                    checked={formData.isFavorite}
                    onChange={handleInputChange}
                    id="isFavorite"
                    className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="isFavorite" className="text-sm font-semibold text-white cursor-pointer">
                    Mark as Favorite ⭐
                  </label>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Preview (optional)</label>
                  <textarea
                    name="preview"
                    value={formData.preview || preview}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* References */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">References (one per line)</label>
                  <textarea
                    name="references"
                    value={formData.references}
                    onChange={handleInputChange}
                    rows={5}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>

                {/* Info Box */}
                <div className="rounded-lg border border-blue-700/30 bg-blue-900/20 p-4">
                  <p className="text-xs text-blue-200">
                    💡 <strong>Tip:</strong> Use markdown formatting. LaTeX expressions like $ax^2 + bx + c$ are fully supported.
                  </p>
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Content * (Markdown supported, LaTeX enabled)</label>
              <AdminMarkdownEditor
                value={formData.content}
                onChange={handleContentChange}
                placeholder="Edit your note using markdown..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 font-semibold text-white transition-all hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/30"
              >
                {loading ? 'Updating...' : 'Update Note'}
              </button>
              <a
                href="/admin/notes"
                className="rounded-lg border border-gray-700 px-6 py-3 font-semibold text-white transition-all hover:bg-gray-800"
              >
                Cancel
              </a>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
