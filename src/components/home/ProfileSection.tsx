import React from 'react';
import SiteIcon, { type SiteIconName } from '@/components/ui/SiteIcon';

const profileFacts = [
  { label: 'Institution', value: 'University of Mila', icon: 'research' },
  { label: 'Department', value: 'Fundamental Mathematics', icon: 'math' },
  { label: 'Location', value: 'Mila, Algeria', icon: 'home' },
] satisfies Array<{ label: string; value: string; icon: SiteIconName }>;

export default function ProfileSection() {
  return (
    <section className="py-16 md:py-20 border-b border-[var(--color-border)]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center md:text-left">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            <SiteIcon name="document" alt="" className="h-4 w-4" />
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
              {profileFacts.map((item) => (
                <div key={item.label}>
                  <p className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] font-medium">
                    <SiteIcon name={item.icon} alt="" className="h-3.5 w-3.5" />
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
