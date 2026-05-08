'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function buildSearchAppSrc(queryString: string) {
  return queryString ? `/search-app/index.html?${queryString}` : '/search-app/index.html';
}

export default function SearchFrameClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQueryString = useMemo(() => searchParams.toString(), [searchParams]);
  const [iframeSrc] = useState(() => buildSearchAppSrc(initialQueryString));

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'SEARCH_URL_UPDATE') return;

      const query = String(event.data.query ?? '').replace(/^\?/, '');
      router.replace(query ? `/search?${query}` : '/search', { scroll: false });
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 bg-[var(--color-bg)] md:top-16">
      <iframe
        src={iframeSrc}
        className="h-full w-full border-none"
        title="Search"
      />
    </div>
  );
}
