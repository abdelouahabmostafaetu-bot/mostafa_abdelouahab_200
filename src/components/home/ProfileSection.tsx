import React from 'react';

export default function ProfileSection() {
  return (
    <section className="py-12 md:py-16 border-b border-[var(--color-border)]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-2">
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

          <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
            <div className="grid gap-6 sm:grid-cols-3 text-left">
              {[
                { label: 'Institution', value: 'University of Mila' },
                { label: 'Department', value: 'Fundamental Mathematics' },
                { label: 'Location', value: 'Mila, Algeria' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] bg-transparent">
                    {item.label}
                  </p>
                  <p className="mt-1 text-base text-[var(--color-text)] font-medium bg-transparent">
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
