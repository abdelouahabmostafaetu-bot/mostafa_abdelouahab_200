import React from 'react';
import { marked } from 'marked';

interface MDXContentProps {
  content: string;
}

async function renderMarkdown(content: string): Promise<string> {
  return marked(content || '', {
    breaks: true,
    gfm: true,
  });
}

export default async function MDXContent({ content }: MDXContentProps) {
  const html = await renderMarkdown(content);

  return (
    <div
      className="prose prose-invert max-w-none
        prose-h1:text-3xl prose-h1:font-bold prose-h1:text-white prose-h1:mt-8 prose-h1:mb-4
        prose-h2:text-2xl prose-h2:font-bold prose-h2:text-white prose-h2:mt-6 prose-h2:mb-3
        prose-h3:text-xl prose-h3:font-bold prose-h3:text-white prose-h3:mt-4 prose-h3:mb-2
        prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
        prose-a:text-blue-400 prose-a:hover:text-blue-300 prose-a:underline
        prose-strong:text-white prose-strong:font-semibold
        prose-em:text-gray-200 prose-em:italic
        prose-code:bg-gray-900 prose-code:text-pink-300 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-sm
        prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg prose-pre:overflow-auto
        prose-pre:p-4 prose-pre:my-4
        prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-300
        prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4 prose-ul:text-gray-300
        prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4 prose-ol:text-gray-300
        prose-li:my-2
        prose-table:border-collapse prose-table:w-full prose-table:my-4
        prose-th:bg-gray-800 prose-th:text-white prose-th:font-bold prose-th:p-2 prose-th:text-left prose-th:border prose-th:border-gray-700
        prose-td:p-2 prose-td:text-gray-300 prose-td:border prose-td:border-gray-700
        prose-img:rounded-lg prose-img:my-4 prose-img:max-w-full
        prose-hr:border-gray-700 prose-hr:my-6
      "
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
