'use client';

import { useEffect } from 'react';

export default function MathCopyButton() {
  useEffect(() => {
    const mathBlocks = document.querySelectorAll('.katex-display');

    mathBlocks.forEach((block) => {
      // Skip if already has a copy button
      if (block.querySelector('.math-copy-btn')) return;

      // Make the block a positioning context
      const el = block as HTMLElement;
      el.style.position = 'relative';

      const btn = document.createElement('button');
      btn.className = 'math-copy-btn';
      btn.title = 'Copy LaTeX';
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

      btn.addEventListener('click', () => {
        // Extract LaTeX source from the annotation element
        const annotation = block.querySelector('annotation[encoding="application/x-tex"]');
        const latex = annotation?.textContent?.trim() || '';

        if (latex) {
          const wrapped = `$$\n${latex}\n$$`;
          navigator.clipboard.writeText(wrapped).then(() => {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
            btn.classList.add('copied');
            setTimeout(() => {
              btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
              btn.classList.remove('copied');
            }, 2000);
          });
        }
      });

      el.appendChild(btn);
    });
  }, []);

  return null;
}
