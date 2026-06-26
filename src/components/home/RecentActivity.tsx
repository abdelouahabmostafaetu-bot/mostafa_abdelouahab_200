import Link from 'next/link';
import SiteIcon from '@/components/ui/SiteIcon';
import { getCurrentAdminUser } from '@/lib/admin';
import { getBlogPosts } from '@/lib/content';
import { renderInlineMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import { getLatestPublishedProblem } from '@/lib/problems';

const academicLinks = [
  {
    href: '/blog',
    title: 'Academic writing',
    description: 'Short essays and research-oriented reflections in mathematics.',
    icon: 'blog',
  },
  {
    href: '/notes',
    title: 'Mathematical notes',
    description: 'Definitions, theorems, examples, and study notes written for clarity.',
    icon: 'notebook',
  },
  {
    href: '/library',
    title: 'Personal library',
    description: 'Books, references, and learning materials for mathematical study.',
    icon: 'library',
  },
] as const;

export default async function RecentActivity() {
  const [posts, latestProblem] = await Promise.all([
    getBlogPosts().then((blogPosts) => blogPosts.slice(0, 1)),
    getLatestPublishedProblem(),
  ]);
  const adminUser = await getCurrentAdminUser();
  const postsWithHtml = await Promise.all(
    posts.map(async (post) => ({
      ...post,
      titleHtml: await renderInlineMarkdownPreviewToHtml(post.title),
    })),
  );
  const latestProblemHtml = latestProblem
    ? {
        title: await renderInlineMarkdownPreviewToHtml(latestProblem.title),
        shortDescription: await renderInlineMarkdownPreviewToHtml(
          latestProblem.shortDescription,
        ),
      }
    : null;

  return (
    <section className="py-14 md:py-24">
      <div className="university-container">
        <div className="mb-9 grid gap-4 border-b border-[var(--color-border)] pb-7 md:mb-12 md:grid-cols-[0.8fr_1fr] md:items-end">
          <div>
            <p className="university-kicker mb-3">
              <SiteIcon name="document" alt="" className="h-4 w-4" />
              Selected work
            </p>
            <h2 className="font-serif text-3xl font-normal tracking-tight text-[var(--color-text)] md:text-5xl">
              Writing, notes, and problems
            </h2>
          </div>
          <p className="university-body max-w-2xl md:justify-self-end md:text-right">
            A simple academic archive for mathematical learning: essays, lecture-style notes,
            problem solutions, and reference materials.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {academicLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="university-card group rounded-3xl p-5 transition-transform duration-150 hover:-translate-y-1"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--color-bg-muted)]">
                <SiteIcon name={item.icon} alt="" className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {item.description}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <section className="university-card rounded-[2rem] p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                  Latest publication
                </p>
                <h3 className="mt-1 font-serif text-2xl font-normal text-[var(--color-text)]">
                  From the blog
                </h3>
              </div>
              <Link href="/blog" className="text-sm font-bold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
                All writing
              </Link>
            </div>

            {postsWithHtml.length > 0 ? (
              postsWithHtml.map((post) => (
                <article key={post.slug} className="group">
                  <Link href={`/blog/${post.slug}`} prefetch className="block">
                    <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                      <SiteIcon name="document" alt="" className="h-3.5 w-3.5" />
                      {post.category}
                    </p>
                    <h4
                      className="blog-card-title text-2xl font-bold leading-tight text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]"
                      dangerouslySetInnerHTML= __html: post.titleHtml 
                    />
                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                      {post.excerpt}
                    </p>
                  </Link>
                </article>
              ))
            ) : (
              <div>
                <p className="text-sm italic text-[var(--color-text-secondary)]">No publications yet.</p>
                {adminUser ? (
                  <Link href="/blog/admin" className="university-button-secondary mt-5">
                    Write the first post
                  </Link>
                ) : null}
              </div>
            )}
          </section>

          <section className="university-card rounded-[2rem] p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                  Latest exercise
                </p>
                <h3 className="mt-1 font-serif text-2xl font-normal text-[var(--color-text)]">
                  Problem with coffee
                </h3>
              </div>
              <Link href="/problems-with-coffee" className="text-sm font-bold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
                All problems
              </Link>
            </div>

            {latestProblem && latestProblemHtml ? (
              <article className="group">
                <Link href={`/problems-with-coffee/${latestProblem.slug}`} prefetch className="block">
                  <p className="mb-3 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                    <span className="inline-flex items-center gap-2">
                      <SiteIcon name="math" alt="" className="h-3.5 w-3.5" />
                      {latestProblem.tags[0] ?? latestProblem.difficulty}
                    </span>
                    {latestProblem.estimatedTime ? <span>{latestProblem.estimatedTime}</span> : null}
                  </p>
                  <h4
                    className="latest-problem-title text-2xl font-bold leading-tight text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]"
                    dangerouslySetInnerHTML= __html: latestProblemHtml.title 
                  />
                  <p
                    className="latest-problem-summary mt-4 line-clamp-3 text-sm leading-7 text-[var(--color-text-secondary)]"
                    dangerouslySetInnerHTML= __html: latestProblemHtml.shortDescription 
                  />
                </Link>
              </article>
            ) : (
              <p className="text-sm italic text-[var(--color-text-secondary)]">No published problems yet.</p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
