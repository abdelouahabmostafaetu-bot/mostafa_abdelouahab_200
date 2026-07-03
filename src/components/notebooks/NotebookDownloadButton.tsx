'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

type Props = {
	notebookTitle: string;
	notebookSlug?: string;
	notebookSubject?: string;
	notebookDescription?: string;
};

export default function NotebookDownloadButton({
	notebookTitle,
	notebookSlug,
}: Props) {
	const [isWorking, setIsWorking] = useState(false);
	const [failed, setFailed] = useState(false);

	const handleDownload = async () => {
		if (isWorking) return;
		setIsWorking(true);
		setFailed(false);

		try {
			const slug =
				notebookSlug ||
				window.location.pathname.split('/').filter(Boolean).pop() ||
				'notebook';

			const response = await fetch(
				`/api/notes/notebook/${encodeURIComponent(slug)}/pdf`,
			);
			if (!response.ok) {
				throw new Error('PDF generation failed.');
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = `${slug}.pdf`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);
		} catch {
			setFailed(true);
		} finally {
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
