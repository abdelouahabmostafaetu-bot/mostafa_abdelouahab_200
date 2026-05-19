import React from 'react';
import SiteIcon, { type SiteIconName } from '@/components/ui/SiteIcon';

const profileFacts = [
  { label: 'Institution', value: 'University of Mila', icon: 'research' },
  { label: 'Department', value: 'Fundamental Mathematics', icon: 'math' },
  { label: 'Location', value: 'Mila, Algeria', icon: 'home' },
] satisfies Array<{ label: string; value: string; icon: SiteIconName }>;

export default function ProfileSection() {
  return (
    <section className="py-16 md:py-24 border-b border-[var(--color-border)]">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <div className="text-center md:text-left">
          <p className="mb-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)] md:mb-4 md:gap-2 md:text-xs md:tracking-[0.2em]">
            <SiteIcon name="document" alt="" className="h-3.5 w-3.5 md:h-4 md:w-4" />
            Curriculum Vitae
          </p>
          <h1
            className="mb-4 text-[clamp(2rem,9vw,2.7rem)] font-normal text-[var(--color-text)] md:mb-7 md:text-6xl"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Abdelouahab Mostafa
          </h1>
          <p className="mx-auto line-clamp-2 max-w-2xl text-[14px] leading-7 text-[var(--color-text-secondary)] md:mx-0 md:line-clamp-none md:text-lg md:leading-8">
            Master&apos;s student in fundamental mathematics, interested in analysis and topology.
          </p>

          <div className="mt-8 border-t border-[var(--color-border)] pt-6 md:mt-12 md:pt-9">
            <div className="grid grid-cols-3 gap-3 text-left md:gap-8">
              {profileFacts.map((item) => (
                <div key={item.label}>
                  <p className="inline-flex items-center gap-1 text-[8px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)] md:gap-2 md:text-[10px] md:tracking-[0.2em]">
                    <SiteIcon name={item.icon} alt="" className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    {item.label}
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-4 text-[var(--color-text)] md:mt-1.5 md:text-base md:leading-normal">
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
