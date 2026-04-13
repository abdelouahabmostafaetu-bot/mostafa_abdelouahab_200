import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children, ...props }) => (
      <h1 className="text-[1.35rem] leading-[1.3] md:text-2xl font-bold mt-10 mb-4 text-[var(--color-text)]" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-lg md:text-[1.35rem] md:leading-[1.35] font-bold mt-8 mb-3 text-[var(--color-text)]" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-base md:text-lg font-semibold mt-6 mb-2 text-[var(--color-text)]" {...props}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }) => (
      <p className="mb-4 text-[14px] md:text-[15px] leading-[1.8] text-[var(--color-text-secondary)]" {...props}>
        {children}
      </p>
    ),
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80 transition-opacity"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    ),
    ul: ({ children, ...props }) => (
      <ul className="mb-4 pl-6 list-disc text-[var(--color-text-secondary)]" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="mb-4 pl-6 list-decimal text-[var(--color-text-secondary)]" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="mb-1 leading-7" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-2 border-[var(--color-accent)] pl-4 italic my-4 text-[var(--color-text-secondary)]"
        {...props}
      >
        {children}
      </blockquote>
    ),
    code: ({ children, ...props }) => (
      <code
        className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    ),
    pre: ({ children, ...props }) => (
      <pre
        className="bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto my-6 text-sm"
        {...props}
      >
        {children}
      </pre>
    ),
    img: ({ src, alt, ...props }) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt || ''} className="rounded my-6 mx-auto max-w-full" {...props} />
    ),
    hr: (props) => <hr className="border-[var(--color-border)] my-8" {...props} />,
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-6">
        <table className="w-full border-collapse text-sm" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th
        className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-left font-semibold border border-[var(--color-border)]"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="px-4 py-2 border border-[var(--color-border)]" {...props}>
        {children}
      </td>
    ),
    Callout: ({ children, type = 'info' }: { children: React.ReactNode; type?: string }) => {
      const styles: Record<string, string> = {
        info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800',
        warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800',
        theorem: 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700',
        definition: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800',
      };
      return (
        <div className={`border-l-2 p-4 rounded-r my-4 ${styles[type] || styles.info}`}>
          {children}
        </div>
      );
    },
    ...components,
  };
}
