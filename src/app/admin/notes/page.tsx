import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';

export default async function AdminNotesPage() {
  await requireAdmin();

  const actions = [
    {
      title: 'Add New Note',
      description: 'Create a new theorem, definition, or note',
      href: '/admin/notes/add',
      color: 'from-blue-600 to-blue-700',
      icon: '✏️',
    },
    {
      title: 'Edit Note',
      description: 'Modify existing notes and theorems',
      href: '/admin/notes/edit',
      color: 'from-purple-600 to-purple-700',
      icon: '📝',
    },
    {
      title: 'Remove Note',
      description: 'Delete notes from your collection',
      href: '/admin/notes/remove',
      color: 'from-red-600 to-red-700',
      icon: '🗑️',
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 p-3">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">My Notes Management</h1>
              <p className="mt-2 text-gray-400">Add, edit, or remove theorems and notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {actions.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="group relative overflow-hidden rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-6 transition-all duration-300 hover:border-gray-600 hover:shadow-2xl hover:shadow-blue-500/10"
            >
              {/* Gradient overlay on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 transition-opacity duration-300 group-hover:opacity-10`}
              />

              {/* Icon */}
              <div className="mb-4 text-4xl">{action.icon}</div>

              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                  {action.title}
                </h3>
                <p className="mt-2 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                  {action.description}
                </p>
              </div>

              {/* Arrow */}
              <div className="absolute right-6 top-6 text-gray-600 transition-all duration-300 group-hover:right-4 group-hover:text-blue-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Info Section */}
      <div className="mx-auto max-w-7xl px-6 pb-12">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-3">About Notes</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Organize and showcase your favorite theorems, definitions, lemmas, and mathematical notes. Each note supports rich formatting with LaTeX, can be tagged for easy discovery, and marked as favorites for quick access.
          </p>
        </div>
      </div>
    </main>
  );
}
