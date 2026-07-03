import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { connectToDatabase } from '@/lib/mongodb';
import { NotebookModel } from '@/lib/models/notebook';
import { NotebookPageModel } from '@/lib/models/notebook-page';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ slug: string }> };

const KATEX_CSS_URL =
	'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
const CM_FONTS_CSS_URL =
	'https://cdn.jsdelivr.net/gh/aaaakshat/cm-web-fonts@latest/fonts.css';

const markdownProcessor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkMath)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeKatex)
	.use(rehypeStringify, { allowDangerousHtml: true });

async function markdownToHtml(markdown: string): Promise<string> {
	const file = await markdownProcessor.process(markdown);
	return String(file);
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// LaTeX "article"-inspired print stylesheet. Real vector text, Computer
// Modern serif, justified paragraphs, booktabs-style tables, theorem-style
// blockquotes, and safe page breaking around display math.
const DOCUMENT_CSS = [
	'@page { size: A4; }',
	'* { box-sizing: border-box; }',
	'html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
	'body { margin: 0; background: #ffffff; color: #141414; font-family: "Computer Modern Serif", "CMU Serif", "Latin Modern Roman", Georgia, "Times New Roman", serif; font-size: 11.5pt; line-height: 1.62; text-align: justify; hyphens: auto; }',
	'.cover { height: 246mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; page-break-after: always; }',
	'.cover-kicker { font-size: 10pt; letter-spacing: 0.32em; text-transform: uppercase; color: #555555; margin: 0 0 4mm; }',
	'.cover-rule { width: 64mm; border: 0; border-top: 0.6pt solid #141414; margin: 5mm auto; }',
	'.cover-title { font-size: 27pt; line-height: 1.25; font-weight: 700; margin: 2mm 8mm; }',
	'.cover-desc { max-width: 122mm; margin: 9mm auto 15mm; font-style: italic; font-size: 12pt; color: #333333; }',
	'.cover-author { font-size: 13.5pt; margin: 0 0 3mm; }',
	'.cover-date { font-size: 11pt; color: #444444; margin: 0; }',
	'.cover-brand { margin-top: 24mm; font-size: 8.5pt; letter-spacing: 0.22em; text-transform: uppercase; color: #858585; }',
	'.section { margin-top: 10mm; }',
	'.section:first-of-type { margin-top: 0; }',
	'.section-title { font-size: 17pt; font-weight: 700; margin: 0 0 2mm; text-align: left; page-break-after: avoid; }',
	'.section-rule { border: 0; border-top: 0.7pt solid #141414; margin: 0 0 6mm; }',
	'.content h1, .content h2 { font-size: 14.5pt; font-weight: 700; margin: 8mm 0 3mm; text-align: left; page-break-after: avoid; }',
	'.content h3, .content h4 { font-size: 12.5pt; font-weight: 700; margin: 6mm 0 2.5mm; text-align: left; page-break-after: avoid; }',
	'.content p { margin: 0 0 3.2mm; }',
	'.content ul, .content ol { margin: 0 0 3.2mm; padding-left: 7mm; }',
	'.content li { margin-bottom: 1.2mm; }',
	'.content blockquote { margin: 4mm 0; padding: 3mm 4.5mm; background: #f7f6f3; border-left: 1.1mm solid #2f2f2f; page-break-inside: avoid; }',
	'.content blockquote p:last-child { margin-bottom: 0; }',
	'.content code { font-family: "Latin Modern Mono", "Courier New", ui-monospace, monospace; font-size: 10pt; background: #f2f1ee; padding: 0.4mm 1.2mm; border-radius: 1mm; }',
	'.content pre { background: #f7f6f3; border: 0.4pt solid #d8d6d0; border-radius: 1.5mm; padding: 3.5mm 4mm; overflow: hidden; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }',
	'.content pre code { background: transparent; padding: 0; }',
	'.content table { border-collapse: collapse; width: 100%; margin: 4mm 0; page-break-inside: avoid; font-size: 10.5pt; }',
	'.content th { border-top: 1pt solid #141414; border-bottom: 0.5pt solid #141414; padding: 1.8mm 3mm; text-align: left; }',
	'.content td { border-bottom: 0.3pt solid #c9c7c1; padding: 1.8mm 3mm; }',
	'.content hr { border: 0; border-top: 0.4pt solid #b5b5b5; margin: 6mm 0; }',
	'.content img { max-width: 100%; }',
	'.content a { color: #10386e; text-decoration: none; }',
	'.katex { font-size: 1.05em; }',
	'.katex-display { margin: 4.5mm 0; page-break-inside: avoid; text-align: center; direction: ltr; }',
	'.katex-display > .katex { display: inline-block; text-align: initial; margin: 0 auto; }',
].join('\n');

function buildDocumentHtml(args: {
	title: string;
	subject: string;
	description: string;
	sections: Array<{ title: string; html: string }>;
}): string {
	const dateText = new Date().toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});

	const sectionsHtml = args.sections
		.map(
			(s, i) =>
				`<section class="section"><h1 class="section-title">${i + 1}&ensp;${escapeHtml(s.title)}</h1><hr class="section-rule" /><div class="content">${s.html}</div></section>`,
		)
		.join('');

	const descBlock = args.description
		? `<p class="cover-desc">${escapeHtml(args.description)}</p>`
		: '';

	return [
		'<!DOCTYPE html>',
		'<html lang="en">',
		'<head>',
		'<meta charset="utf-8" />',
		`<link rel="stylesheet" href="${KATEX_CSS_URL}" />`,
		`<link rel="stylesheet" href="${CM_FONTS_CSS_URL}" />`,
		`<style>${DOCUMENT_CSS}</style>`,
		'</head>',
		'<body>',
		'<div class="cover">',
		`<p class="cover-kicker">${escapeHtml(args.subject || 'Research Notebook')}</p>`,
		'<hr class="cover-rule" />',
		`<h1 class="cover-title">${escapeHtml(args.title)}</h1>`,
		'<hr class="cover-rule" />',
		descBlock,
		'<p class="cover-author">Abdelouahab Mostafa</p>',
		`<p class="cover-date">${escapeHtml(dateText)}</p>`,
		'<p class="cover-brand">Research Journal &middot; mostafaabdelouahab.me</p>',
		'</div>',
		sectionsHtml,
		'</body>',
		'</html>',
	].join('\n');
}

async function launchBrowser() {
	const isServerless = Boolean(
		process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
	);
	if (isServerless) {
		return puppeteer.launch({
			args: chromium.args,
			defaultViewport: chromium.defaultViewport,
			executablePath: await chromium.executablePath(),
			headless: chromium.headless,
		});
	}
	const localExecutable =
		process.env.PUPPETEER_EXECUTABLE_PATH ||
		(process.platform === 'win32'
			? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
			: '/usr/bin/google-chrome');
	return puppeteer.launch({
		args: ['--no-sandbox', '--disable-dev-shm-usage'],
		executablePath: localExecutable,
		headless: true,
	});
}

export async function GET(_request: Request, context: RouteContext) {
	const { slug } = await context.params;

	let notebook: {
		title: string;
		subject: string;
		description: string;
	} | null = null;
	let sections: Array<{ title: string; html: string }> = [];

	try {
		await connectToDatabase();
		const nb = await NotebookModel.findOne({ slug, isPublished: true }).lean();
		if (!nb) {
			return NextResponse.json(
				{ error: 'Notebook not found.' },
				{ status: 404 },
			);
		}
		notebook = {
			title: nb.title,
			subject: nb.subject,
			description: nb.description,
		};

		const rawPages = await NotebookPageModel.find({ notebookSlug: slug })
			.sort({ pageNumber: 1 })
			.lean();

		sections = await Promise.all(
			rawPages.map(async (p, index) => ({
				title: p.title || `Page ${index + 1}`,
				html: await markdownToHtml(p.content || ''),
			})),
		);
	} catch {
		return NextResponse.json(
			{ error: 'Failed to load notebook content.' },
			{ status: 500 },
		);
	}

	if (sections.length === 0) {
		return NextResponse.json(
			{ error: 'This notebook has no pages yet.' },
			{ status: 404 },
		);
	}

	const html = buildDocumentHtml({
		title: notebook.title,
		subject: notebook.subject,
		description: notebook.description,
		sections,
	});

	let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
	try {
		browser = await launchBrowser();
		const page = await browser.newPage();
		await page.setContent(html, {
			waitUntil: 'load',
			timeout: 45000,
		});
		// Ensure the KaTeX stylesheet and Computer Modern webfonts are fully
		// applied before printing (setContent 'load' does not wait for fonts).
		try {
			await page.evaluate(async () => {
				if (document.fonts && document.fonts.ready) {
					await document.fonts.ready;
				}
			});
		} catch {
			// Continue with fallback fonts if webfonts are slow.
		}
		await new Promise((resolve) => setTimeout(resolve, 400));

		const footerTemplate =
			'<div style="width:100%; text-align:center; font-size:9px; color:#888888; font-family: Georgia, serif;"><span class="pageNumber"></span></div>';

		const pdfData = await page.pdf({
			format: 'A4',
			printBackground: true,
			displayHeaderFooter: true,
			headerTemplate: '<div></div>',
			footerTemplate,
			margin: { top: '20mm', bottom: '18mm', left: '19mm', right: '19mm' },
		});

		const body = new Uint8Array(pdfData);
		return new NextResponse(body, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${slug}.pdf"`,
				'Cache-Control': 'no-store',
			},
		});
	} catch {
		return NextResponse.json(
			{ error: 'Failed to generate the PDF.' },
			{ status: 500 },
		);
	} finally {
		if (browser) {
			try {
				await browser.close();
			} catch {
				// Ignore close errors.
			}
		}
	}
}
