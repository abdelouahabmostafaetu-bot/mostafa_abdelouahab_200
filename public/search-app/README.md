Search App Notes

This is the live search app used by the Next.js route at `/search`.

What is actually used

- `src/app/search/page.tsx`
- `public/search-app/index.html`
- `public/search-app/css/styles.css`
- `public/search-app/js/config.js`
- `public/search-app/js/ui.js`
- `public/search-app/js/search-cache.js`
- `public/search-app/js/search-autocorrect.js`
- `public/search-app/js/search-enhance.js`
- `public/search-app/js/search-intelligence.js`
- `public/search-app/js/tag-selector-live.js`
- `public/search-app/js/latex-editor.js`
- `public/search-app/js/search-text.js`
- `public/search-app/js/latex-canonicalize.js`
- `public/search-app/js/math-similarity.js`
- `public/search-app/js/formula-tokenizer.js`
- `public/search-app/js/search-latex.js`

Important

- No AI backend is required.
- No private API key is required.
- The app uses the public StackExchange API directly.
- `Math Q&A Search - AI Enhanced (1)` in the repo root is only a separate reference copy and is not the folder served by the website.

If search rate limits happen

- Wait a bit and retry.
- The app already keeps a local browser cache to reduce repeated requests.
- Optional StackExchange keys can increase rate limits, but the app is configured to work without one.
