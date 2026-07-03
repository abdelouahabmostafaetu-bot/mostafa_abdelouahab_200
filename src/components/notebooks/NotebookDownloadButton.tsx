'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

type Props = {
	notebookTitle: string;
	notebookSlug?: string;
	notebookSubject?: string;
	notebookDescription?: string;
};

type SectionInfo = { title: string; node: HTMLElement };

type JsPdfLike = {
	setPage: (page: number) => void;
	setFontSize: (size: number) => void;
	setTextColor: (color: number) => void;
	text: (
		value: string,
		x: number,
		y: number,
		options?: Record<string, unknown>,
	) => void;
	save: (filename: string) => void;
	internal: {
		getNumberOfPages: () => number;
		pageSize: { getWidth: () => number; getHeight: () => number };
	};
};

const FONT_CSS_ID = 'cm-web-fonts';
const FONT_CSS_URL =
	'https://cdn.jsdelivr.net/gh/aaaakshat/cm-web-fonts@latest/fonts.css';

// LaTeX-inspired print stylesheet: black text on white paper, Computer Modern
// serif body, justified paragraphs, clean rules, and sensible page breaking.
// NOTE: .nb-pdf-root must stay in normal document flow (no absolute/offscreen
// positioning here) because html2pdf clones it, and an offscreen clone
// produces a blank capture. Hiding is done by the outer wrapper only.
const PDF_CSS = [
	'.nb-pdf-root { width: 700px; margin: 0; background: #ffffff; color: #1a1a1a; font-family: "Computer Modern Serif", "CMU Serif", Georgia, "Times New Roman", serif; font-size: 15px; line-height: 1.7; }',
	'.nb-pdf-root * { color: #1a1a1a !important; background: transparent !important; box-shadow: none !important; text-shadow: none !important; }',
	'.nb-pdf-root p, .nb-pdf-root li, .nb-pdf-root blockquote, .nb-pdf-root h1, .nb-pdf-root h2, .nb-pdf-root h3, .nb-pdf-root h4, .nb-pdf-root td, .nb-pdf-root th { font-family: inherit !important; }',
	'.nb-pdf-root p { margin: 0 0 12px; text-align: justify; }',
	'.nb-pdf-root h1, .nb-pdf-root h2, .nb-pdf-root h3, .nb-pdf-root h4 { page-break-after: avoid; line-height: 1.35; }',
	'.nb-pdf-root ul, .nb-pdf-root ol { margin: 0 0 12px; padding-left: 26px; }',
	'.nb-pdf-root pre, .nb-pdf-root code { font-family: "Courier New", ui-monospace, SFMono-Regular, monospace !important; font-size: 13px; }',
	'.nb-pdf-root pre { background: #f6f6f4 !important; border: 1px solid #ddd; border-radius: 4px; padding: 10px 12px; overflow: hidden; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }',
	'.nb-pdf-root a { color: #1d4ed8 !important; text-decoration: none; }',
	'.nb-pdf-root table { border-collapse: collapse; width: 100%; margin: 14px 0; page-break-inside: avoid; }',
	'.nb-pdf-root th, .nb-pdf-root td { border: 1px solid #bbb; padding: 6px 10px; }',
	'.nb-pdf-root blockquote { border-left: 3px solid #999; margin: 12px 0; padding: 2px 0 2px 14px; font-style: italic; }',
	'.nb-pdf-root hr { border: 0; border-top: 1px solid #bbb; margin: 18px 0; }',
	'.nb-pdf-root img { max-width: 100%; }',
	'.nb-pdf-root .katex-display { page-break-inside: avoid; margin: 14px 0; }',
	'.nb-pdf-cover { min-height: 960px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; page-break-after: always; }',
	'.nb-pdf-kicker { font-size: 13px; letter-spacing: 0.3em; text-transform: uppercase; color: #555 !important; margin-bottom: 26px; }',
	'.nb-pdf-title { font-size: 40px; line-height: 1.25; font-weight: 700; margin: 18px 40px; }',
	'.nb-pdf-rule { width: 220px; border-top: 1.5px solid #1a1a1a; margin: 6px auto 22px; }',
	'.nb-pdf-desc { max-width: 480px; margin: 0 auto 42px; font-style: italic; color: #444 !important; }',
	'.nb-pdf-author { font-size: 18px; margin-bottom: 8px; }',
	'.nb-pdf-date { font-size: 14px; color: #555 !important; }',
	'.nb-pdf-brand { margin-top: 90px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #777 !important; }',
	'.nb-pdf-toc { page-break-after: always; padding-top: 30px; }',
	'.nb-pdf-toc-title { font-size: 26px; font-weight: 700; margin-bottom: 24px; }',
	'.nb-pdf-toc-list { list-style: none; margin: 0; padding: 0; }',
	'.nb-pdf-toc-item { display: flex; align-items: baseline; gap: 10px; padding: 7px 0; border-bottom: 1px dotted #ccc; }',
	'.nb-pdf-toc-num { min-width: 26px; font-weight: 700; }',
	'.nb-pdf-section { margin-top: 30px; }',
	'.nb-pdf-h { font-size: 22px; font-weight: 700; margin: 0 0 6px; page-break-after: avoid; }',
	'.nb-pdf-h-rule { border: 0; border-top: 1px solid #1a1a1a; margin: 0 0 16px; }',
].join('\n');

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function collectSections(): SectionInfo[] {
	const result: SectionInfo[] = [];
	const nodes = document.querySelectorAll<HTMLElement>('section[id^="page-"]');
	nodes.forEach((section) => {
		const content = section.querySelector<HTMLElement>(
			'.notebook-reader-content',
		);
		if (!content) return;
		const heading = section.querySelector('h2');
		const title =
			heading && heading.textContent
				? heading.textContent.trim()
				: `Page ${result.length + 1}`;
		result.push({ title, node: content });
	});
	return result;
}

async function ensureFontsLoaded(): Promise<void> {
	if (!document.getElementById(FONT_CSS_ID)) {
		const link = document.createElement('link');
		link.id = FONT_CSS_ID;
		link.rel = 'stylesheet';
		link.href = FONT_CSS_URL;
		document.head.appendChild(link);
	}
	try {
		await Promise.race([
			document.fonts.ready,
			new Promise((resolve) => setTimeout(resolve, 4000)),
		]);
	} catch {
		// Fall back to system serif fonts if the webfont fails to load.
	}
}

function buildDocument(
	title: string,
	subject: string,
	description: string,
	sections: SectionInfo[],
): HTMLElement {
	const root = document.createElement('div');
	root.className = 'nb-pdf-root';

	const style = document.createElement('style');
	style.textContent = PDF_CSS;
	root.appendChild(style);

	const dateText = new Date().toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});

	// Cover page (LaTeX \\maketitle look)
	const cover = document.createElement('div');
	cover.className = 'nb-pdf-cover';
	cover.innerHTML = [
		`<p class="nb-pdf-kicker">${escapeHtml(subject || 'Research Notebook')}</p>`,
		'<div class="nb-pdf-rule"></div>',
		`<h1 class="nb-pdf-title">${escapeHtml(title)}</h1>`,
		'<div class="nb-pdf-rule"></div>',
		description ? `<p class="nb-pdf-desc">${escapeHtml(description)}</p>` : '',
		'<p class="nb-pdf-author">Abdelouahab Mostafa</p>',
		`<p class="nb-pdf-date">${escapeHtml(dateText)}</p>`,
		'<p class="nb-pdf-brand">Research Journal &middot; mostafaabdelouahab.me</p>',
	].join('');
	root.appendChild(cover);

	// Table of contents
	if (sections.length > 1) {
		const toc = document.createElement('div');
		toc.className = 'nb-pdf-toc';
		const items = sections
			.map(
				(s, i) =>
					`<li class="nb-pdf-toc-item"><span class="nb-pdf-toc-num">${i + 1}.</span><span>${escapeHtml(s.title)}</span></li>`,
			)
			.join('');
		toc.innerHTML = `<h2 class="nb-pdf-toc-title">Contents</h2><ul class="nb-pdf-toc-list">${items}</ul>`;
		root.appendChild(toc);
	}

	// Numbered sections with the already-rendered page content (keeps KaTeX math)
	sections.forEach((s, i) => {
		const section = document.createElement('div');
		section.className = 'nb-pdf-section';

		const heading = document.createElement('h2');
		heading.className = 'nb-pdf-h';
		heading.textContent = `${i + 1}.\u2002${s.title}`;
		section.appendChild(heading);

		const rule = document.createElement('hr');
		rule.className = 'nb-pdf-h-rule';
		section.appendChild(rule);

		section.appendChild(s.node.cloneNode(true));
		root.appendChild(section);
	});

	return root;
}

export default function NotebookDownloadButton({
	notebookTitle,
	notebookSlug,
	notebookSubject,
	notebookDescription,
}: Props) {
	const [isWorking, setIsWorking] = useState(false);
	const [failed, setFailed] = useState(false);

	const handleDownload = async () => {
		if (isWorking) return;
		setIsWorking(true);
		setFailed(false);

		let wrapper: HTMLElement | null = null;
		try {
			const sections = collectSections();
			if (sections.length === 0) {
				throw new Error('No notebook content found on this page.');
			}

			await ensureFontsLoaded();

			const root = buildDocument(
				notebookTitle,
				notebookSubject ?? '',
				notebookDescription ?? '',
				sections,
			);

			// Hide the working copy with an outer wrapper only. The root itself
			// must stay in normal flow so the html2pdf clone renders correctly.
			wrapper = document.createElement('div');
			wrapper.setAttribute('aria-hidden', 'true');
			wrapper.style.position = 'fixed';
			wrapper.style.left = '-10000px';
			wrapper.style.top = '0';
			wrapper.style.width = '700px';
			wrapper.style.pointerEvents = 'none';
			wrapper.appendChild(root);
			document.body.appendChild(wrapper);

			// Give the browser a moment to lay out the document and apply fonts.
			await new Promise((resolve) => setTimeout(resolve, 300));

			const html2pdfModule = await import('html2pdf.js');
			const html2pdf = html2pdfModule.default;

			const safeName = (notebookSlug || notebookTitle || 'notebook')
				.toString()
				.trim()
				.replace(/\s+/g, '-')
				.toLowerCase();
			const filename = `${safeName}.pdf`;

			const options = {
				margin: [15, 14, 17, 14],
				filename,
				image: { type: 'jpeg', quality: 0.98 },
				html2canvas: {
					scale: 2,
					useCORS: true,
					backgroundColor: '#ffffff',
					logging: false,
					scrollX: 0,
					scrollY: 0,
				},
				jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
				pagebreak: { mode: ['css', 'legacy'] },
			};

			const pdf = (await html2pdf()
				.set(options)
				.from(root)
				.toPdf()
				.get('pdf')) as JsPdfLike;

			// Add centered page numbers (skip the cover page).
			const pageCount = pdf.internal.getNumberOfPages();
			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			for (let i = 2; i <= pageCount; i += 1) {
				pdf.setPage(i);
				pdf.setFontSize(9);
				pdf.setTextColor(120);
				pdf.text(String(i), pageWidth / 2, pageHeight - 7, {
					align: 'center',
				});
			}

			pdf.save(filename);
		} catch {
			setFailed(true);
		} finally {
			if (wrapper && wrapper.parentNode) {
				wrapper.parentNode.removeChild(wrapper);
			}
			setIsWorking(false);
		}
	};

	let label = 'Download PDF';
	if (isWorking) label = 'Preparing PDF\u2026';
	else if (failed) label = 'Try again';

	return (
		<button
			type="button"
			onClick={handleDownload}
			disabled={isWorking}
			className="print:hidden inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
			aria-label={`Download ${notebookTitle} as PDF`}
			title="Download this notebook as a typeset PDF"
		>
			{isWorking ? (
				<Loader2 size={13} className="animate-spin" aria-hidden="true" />
			) : (
				<Download size={13} aria-hidden="true" />
			)}
			{label}
		</button>
	);
}
