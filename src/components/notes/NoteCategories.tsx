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
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text)] flex items-center gap-2">
          <span>{info.icon}</span> {info.title}
        </h2>
        <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">{info.description}</p>
      </div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] font-medium">
        {count} item{count !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
