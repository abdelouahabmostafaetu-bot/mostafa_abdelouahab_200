declare module 'html2pdf.js' {
	export type Html2PdfOptions = {
		margin?: number | number[];
		filename?: string;
		image?: { type?: string; quality?: number };
		html2canvas?: Record<string, unknown>;
		jsPDF?: Record<string, unknown>;
		pagebreak?: {
			mode?: string[];
			before?: string | string[];
			after?: string | string[];
			avoid?: string | string[];
		};
		enableLinks?: boolean;
	};

	export type Html2PdfWorker = {
		set: (options: Html2PdfOptions) => Html2PdfWorker;
		from: (element: HTMLElement | string) => Html2PdfWorker;
		toPdf: () => Html2PdfWorker;
		get: (key: string) => Promise<unknown>;
		save: (filename?: string) => Promise<void>;
	};

	const html2pdf: () => Html2PdfWorker;
	export default html2pdf;
}
