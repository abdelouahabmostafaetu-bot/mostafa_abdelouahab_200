interface NoteCategoriesProps {
  category: string;
  count: number;
}

export default function NoteCategories({ category, count }: NoteCategoriesProps) {
  const categoryInfo: Record<
    string,
    {
      icon: string;
      title: string;
      description: string;
    }
  > = {
    theorem: {
      icon: '📐',
      title: 'Theorems',
      description: 'Important mathematical results and their proofs',
    },
    definition: {
      icon: '📖',
      title: 'Definitions',
      description: 'Essential mathematical concepts and terminology',
    },
    lemma: {
      icon: '🔑',
      title: 'Lemmas',
      description: 'Auxiliary results supporting major theorems',
    },
    corollary: {
      icon: '✓',
      title: 'Corollaries',
      description: 'Direct consequences of theorems',
    },
    conjecture: {
      icon: '❓',
      title: 'Conjectures',
      description: 'Unproven mathematical hypotheses',
    },
    note: {
      icon: '📝',
      title: 'Notes',
      description: 'Miscellaneous observations and remarks',
    },
  };

  const info = categoryInfo[category] || categoryInfo.note;

  return (
    <div className="flex items-start gap-4">
      <div className="text-4xl">{info.icon}</div>
      <div>
        <h2 className="text-2xl font-bold text-white">{info.title}</h2>
        <p className="mt-1 text-gray-400">{info.description}</p>
        <p className="mt-2 text-sm text-gray-500">{count} items</p>
      </div>
    </div>
  );
}
