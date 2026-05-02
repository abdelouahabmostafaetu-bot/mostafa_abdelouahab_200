import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { getBlogPost } from '@/lib/content';
import { renderMDX, extractHeadings } from '@/lib/mdx';
import { formatDate } from '@/lib/utils';
import TableOfContents from '@/components/blog/TableOfContents';
import { TagList } from '@/components/blog/Tag';

export const dynamic = 'force-dynamic';
const SITE_URL = 'https://www.mostafaabdelouahab.me';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: 'Post Not Found' };
  const blogUrl = `${SITE_URL}/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: blogUrl,
      type: 'article',
      publishedTime: post.publishedAt || post.createdAt,
      modifiedTime: post.updatedAt,
      tags: post.tags,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl, alt: post.title }] : undefined,
    },
    twitter: {
      card: post.coverImageUrl ? 'summary_large_image' : 'summary',
      title: post.title,
      description: post.excerpt,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const content = await renderMDX(post.content);
  const headings = extractHeadings(post.content);

  return (
    <div className="bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.10),transparent_34rem)] pb-12 pt-16 md:pb-20 md:pt-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Link
          href="/blog"
          className="group mb-6 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-secondary)] transition-colors duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-text)] md:mb-10 md:text-xs"
        >
          <ArrowLeft size={12} />
          All Posts
        </Link>

        <div className="flex gap-10 xl:gap-14">
          <article className="min-w-0 flex-grow">
            <div className="mx-auto max-w-[52rem] border-none bg-transparent py-2 md:rounded-2xl md:border md:border-[var(--color-border)] md:bg-[var(--color-surface)] md:p-10 md:shadow-[0_24px_80px_rgba(0,0,0,0.22)] lg:p-12">
              <header className="mb-9 border-b border-[var(--color-border)]/70 pb-7 md:mb-12 md:pb-9">
                <div className="mb-5 flex flex-wrap items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)] md:text-xs">
                  <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-1 text-[var(--color-accent)]">
                    {post.category}
                  </span>
                  <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={12} />
                    {post.readingTime}
                  </span>
                </div>

                <h1
                  className="text-[clamp(2.25rem,11vw,3.35rem)] font-normal leading-[0.98] text-[var(--color-text)] md:text-[4.4rem]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {post.title}
                </h1>

                {post.excerpt && (
                  <p className="mt-5 max-w-3xl text-[14px] leading-6 text-[var(--color-text-secondary)] md:mt-6 md:text-lg md:leading-8">
                    {post.excerpt}
                  </p>
                )}

                {post.tags.length > 0 && (
                  <div className="mt-6">
                    <TagList tags={post.tags} size="md" />
                  </div>
                )}

                {post.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="mt-8 w-full rounded-2xl border border-[var(--color-border)] object-cover shadow-[0_20px_55px_rgba(0,0,0,0.25)]"
                  />
                ) : null}
              </header>

              <div className="blog-content prose-academic">
                {content}
              </div>

              <div className="mt-16 border-t border-[var(--color-border)]/60 pt-8">
                <Link
                  href="/blog"
                  className="group inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors duration-200 font-medium"
                >
                  <ArrowLeft size={14} />
                  Back to all posts
                </Link>
              </div>
            </div>
          </article>

          {headings.length > 0 && (
            <aside className="hidden xl:block w-48 flex-shrink-0">
              <TableOfContents headings={headings} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
