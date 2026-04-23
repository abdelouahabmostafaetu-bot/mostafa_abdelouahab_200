import React from 'react';

export default function ProfileSection() {
  return (
    <section className="py-16 md:py-20 border-b border-[var(--color-border)]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)] mb-3">
            Curriculum Vitae
          </p>
          <h1
            className="text-4xl font-bold text-[var(--color-text)] md:text-5xl mb-6"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Abdelouahab Mostafa
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)] mx-auto md:mx-0">
            Master student in fundamental mathematics at the University of Mila. My research and studies primarily focus on analysis, topology, and their interconnections.
          </p>

          <div className="mt-10 pt-8 border-t border-[var(--color-border)]">
            <div className="grid gap-8 sm:grid-cols-3 text-left">
              {[
                { label: 'Institution', value: 'University of Mila' },
                { label: 'Department', value: 'Fundamental Mathematics' },
                { label: 'Location', value: 'Mila, Algeria' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] font-medium">
                    {item.label}
                  </p>
                  <p className="mt-1.5 text-base text-[var(--color-text)] font-medium">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
