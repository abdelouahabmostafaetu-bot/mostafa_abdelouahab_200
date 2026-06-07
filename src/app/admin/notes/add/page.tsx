'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AdminMarkdownEditor from '@/components/admin/AdminMarkdownEditor';

export default function AddNotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');

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

      const response = await fetch('/api/notes', {
        method: 'POST',
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
        throw new Error(data.error || 'Failed to create note');
      }

      toast.success('Note created successfully!');
      router.push('/admin/notes');
      router.refresh();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to create note');
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
          <h1 className="text-3xl font-bold text-white">Add New Note</h1>
          <p className="mt-2 text-gray-400">Create a new theorem, definition, or note</p>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
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
                  placeholder="e.g., Fermat's Last Theorem"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                  placeholder="e.g., number theory, proof, famous"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                  placeholder="Brief description (auto-generated if left empty)"
                  rows={3}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
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
                  placeholder="e.g., Wikipedia article\nArXiv paper\nTextbook reference"
                  rows={5}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>

              {/* Info Box */}
              <div className="rounded-lg border border-blue-700/30 bg-blue-900/20 p-4">
                <p className="text-xs text-blue-200">
                  💡 <strong>Tip:</strong> Use markdown formatting in your content. LaTeX expressions like $ax^2 + bx + c$ are fully supported.
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
              placeholder="Write your note using markdown. Supports LaTeX formulas like $f(x) = x^2$ or $$\int_a^b f(x)dx$$"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-semibold text-white transition-all hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/30"
            >
              {loading ? 'Creating...' : 'Create Note'}
            </button>
            <a
              href="/admin/notes"
              className="rounded-lg border border-gray-700 px-6 py-3 font-semibold text-white transition-all hover:bg-gray-800"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
