import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProblemSlugRedirectPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/problems-with-coffee/${slug}`);
}
