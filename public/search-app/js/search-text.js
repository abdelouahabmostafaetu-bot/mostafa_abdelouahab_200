/* ================================================================
   search-text.js — Advanced multi-source text search with full Q&A
   ================================================================
   Phase 1a: 3 base queries (advanced, excerpts, similar)
   Phase 1b: Enhanced queries (synonym, tag, decompose, phrase,
             answer-body, cross-site MathOverflow)
   Phase 1c: Semantic query rewrites (intent-driven alternatives)
   Phase 1d: Intent-boosted tag search
   Phase 1e: Cross-concept bridge queries
   Phase 2a: Fetch full question bodies + all answers
   Phase 2b: Fetch related, linked & hot-by-tag questions
   Phase 2c: Fetch tag wikis for educational context
   Phase 2d: Google fallback if <10 results (was <5)
   Phase 2e: LaTeX-aware body scanning for math in text queries
   Phase 3:  Negation filter + smart relevance ranking
   Phase 4:  Intelligence layer — TF-IDF, dedup, snippets,
             intent scoring, confidence, suggestions, clustering
   Phase 4b: Adaptive recall expansion (if still too few results)
   Results are merged, deduplicated, scored, and ranked by relevance.
   Uses SearchCache for response caching + history tracking.
   ================================================================ */

let _textSearchId = 0;

function initTextSearch() {
  DOM.searchBtn.addEventListener('click', () => { State.currentPage = 1; searchText(); });
  DOM.query.addEventListener('keydown', e => {
    if (e.key === 'Enter') { State.currentPage = 1; searchText(); }
  });
}

async function searchText(forceOriginal) {
  let q = DOM.query.value.trim();
  if (!q) { showStatus('Please enter a search term.'); clearResults(); return; }

  // ── Autocorrect typos ──
  let acBanner = null;
  if (!forceOriginal && typeof SearchAutocorrect !== 'undefined') {
    const ac = SearchAutocorrect.autocorrect(q, 'text');
    if (ac.changed) {
      const originalQ = q;
      q = ac.text;
      acBanner = SearchAutocorrect.createSuggestionBanner(originalQ, ac.corrections, (orig) => {
        DOM.query.value = orig;
        State.currentPage = 1;
        searchText(true);
      });
    }
  }

  // ── Equivalence expansion (add synonyms for broader matching) ──
  let equivInfo = null;
  if (typeof SearchAutocorrect !== 'undefined' && SearchAutocorrect.expandEquivalences) {
    equivInfo = SearchAutocorrect.expandEquivalences(q);
  }

  // ── Intelligent intent detection & query rewriting ──
  let detectedIntents = [];
  let queryRewrites = [];
  let termWeights = null;
  if (typeof SearchIntelligence !== 'undefined') {
    detectedIntents = SearchIntelligence.detectIntent(q);
    const rw = SearchIntelligence.rewriteQuery(q);
    queryRewrites = rw.variants || [];
    termWeights = SearchIntelligence.computeTermWeights(q);
  }

  showLoader();
  const thisId = ++_textSearchId;
  const startTime = performance.now();

  // Show "Did you mean?" banner
  if (acBanner) {
    DOM.results.innerHTML = '';
    DOM.results.appendChild(acBanner);
  }

  SearchCache.addHistory('text', q);

  const baseParams = {
    order    : 'desc',
    sort     : DOM.sort.value,
    site     : Config.SITE,
    page     : State.currentPage,
    pagesize : DOM.pageSize.value,
    filter   : Config.SE_FILTER,
  };
  if (DOM.answered.value) baseParams.accepted = DOM.answered.value;

  // ── User-selected tags from tag selector ──
  const userTags = typeof TagSelector !== 'undefined' ? TagSelector.getSelected('text') : '';
  if (userTags) baseParams.tagged = userTags;
  const defaultTags = (!userTags && typeof SearchEnhance !== 'undefined')
    ? SearchEnhance.inferTags(q, 2)
    : [];
  if (!userTags && defaultTags.length > 0) {
    baseParams.tagged = defaultTags.join(';');
  }

  const stats = { sources: {}, timing: {}, totalResults: 0, cached: 0 };
  if (defaultTags.length > 0) stats.defaultTags = defaultTags;

  // ════════════════════════════════════════════════
  // PHASE 1a: Fire all base search engines in parallel
  // ════════════════════════════════════════════════
  const promises = [];

  // Strategy 1: /search/advanced — primary question search
  const advParams = new URLSearchParams({ ...baseParams, q });
  const advUrl = `${Config.SE_API}/search/advanced?${advParams}`;
  promises.push(
    SearchCache.cachedFetch(advUrl, Config.SEARCH_TIMEOUT_MS)
      .then(r => r.ok ? r.json().then(d => ({ engine: 'advanced', data: d, cached: r._cached })) : ({ engine: 'advanced', data: null }))
      .catch(() => ({ engine: 'advanced', data: null }))
  );

  // Strategy 2: /search/excerpts — searches Q+A body text
  const excParams = new URLSearchParams({
    order: 'desc', sort: 'relevance', site: Config.SITE,
    page: State.currentPage, pagesize: baseParams.pagesize, q
  });
  const excUrl = `${Config.SE_API}/search/excerpts?${excParams}`;
  promises.push(
    SearchCache.cachedFetch(excUrl, Config.SEARCH_TIMEOUT_MS)
      .then(r => r.ok ? r.json().then(d => ({ engine: 'excerpts', data: d, cached: r._cached })) : ({ engine: 'excerpts', data: null }))
      .catch(() => ({ engine: 'excerpts', data: null }))
  );

  // Strategy 3: /similar — similar titles
  const simParams = new URLSearchParams({
    order: 'desc', sort: 'relevance', site: Config.SITE,
    pagesize: '10', filter: Config.SE_FILTER, title: q,
  });
  const simUrl = `${Config.SE_API}/similar?${simParams}`;
  promises.push(
    SearchCache.cachedFetch(simUrl, Config.SEARCH_TIMEOUT_MS)
      .then(r => r.ok ? r.json().then(d => ({ engine: 'similar', data: d, cached: r._cached })) : ({ engine: 'similar', data: null }))
      .catch(() => ({ engine: 'similar', data: null }))
  );

  // Optional server-side Firecrawl web expansion. The API key stays on the Next.js server.
  promises.push(
    fetch('/api/search/web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: q,
        tags: (userTags || defaultTags.join(';')).split(';').filter(Boolean),
        limit: 5,
      }),
    })
      .then(r => r.ok ? r.json().then(d => ({ engine: 'firecrawl', data: { items: d.items || [] } })) : ({ engine: 'firecrawl', data: null }))
      .catch(() => ({ engine: 'firecrawl', data: null }))
  );

  // ════════════════════════════════════════════════
  // PHASE 1b: Enhanced queries (synonyms, tags, decompose, phrase, answer-body, cross-site)
  // ════════════════════════════════════════════════
  let _negatedTerms = [];
  if (typeof SearchEnhance !== 'undefined') {
    const enhanced = SearchEnhance.buildEnhancedQueries(q, State.currentPage, baseParams.pagesize);
    if (enhanced._negated) _negatedTerms = enhanced._negated;
    for (const eq of enhanced) {
      promises.push(
        SearchCache.cachedFetch(eq.url, Config.SEARCH_TIMEOUT_MS)
          .then(r => r.ok ? r.json().then(d => ({ engine: eq.engine, data: d, cached: r._cached })) : ({ engine: eq.engine, data: null }))
          .catch(() => ({ engine: eq.engine, data: null }))
      );
    }
    stats.enhancedQueries = enhanced.length;
  }

  // ════════════════════════════════════════════════
  // PHASE 1c: Semantic query rewrites (intent-driven alternate queries)
  // ════════════════════════════════════════════════
  if (queryRewrites.length > 0) {
    for (const rq of queryRewrites.slice(0, 2)) {
      const rwParams = new URLSearchParams({
        order: 'desc', sort: 'relevance', site: Config.SITE,
        page: '1', pagesize: '8', q: rq, filter: Config.SE_FILTER,
      });
      promises.push(
        SearchCache.cachedFetch(`${Config.SE_API}/search/advanced?${rwParams}`, Config.SEARCH_TIMEOUT_MS)
          .then(r => r.ok ? r.json().then(d => ({ engine: 'rewrite', data: d, cached: r._cached })) : ({ engine: 'rewrite', data: null }))
          .catch(() => ({ engine: 'rewrite', data: null }))
      );
    }
    stats.queryRewrites = queryRewrites.length;
  }

  // ════════════════════════════════════════════════
  // PHASE 1d: Intent-boosted tag search (search tags that match detected intent)
  // ════════════════════════════════════════════════
  if (detectedIntents.length > 0 && detectedIntents[0].intent !== 'generic' && detectedIntents[0].boostTags.length > 0) {
    const intentTags = detectedIntents[0].boostTags.slice(0, 2).join(';');
    const intentWords = q.split(/\s+/).filter(w => w.length > 3).slice(0, 3).join(' ');
    if (intentWords) {
      const intentParams = new URLSearchParams({
        order: 'desc', sort: 'relevance', site: Config.SITE,
        page: '1', pagesize: '6', tagged: intentTags,
        intitle: intentWords, filter: Config.SE_FILTER,
      });
      promises.push(
        SearchCache.cachedFetch(`${Config.SE_API}/search?${intentParams}`, Config.SEARCH_TIMEOUT_MS)
          .then(r => r.ok ? r.json().then(d => ({ engine: 'intent', data: d, cached: r._cached })) : ({ engine: 'intent', data: null }))
          .catch(() => ({ engine: 'intent', data: null }))
      );
    }
    stats.detectedIntent = detectedIntents[0].intent;
  }

  // ════════════════════════════════════════════════
  // PHASE 1e: Cross-concept bridge queries
  // ════════════════════════════════════════════════
  if (typeof SearchIntelligence !== 'undefined') {
    const bridges = SearchIntelligence.findConceptBridges(q);
    for (const bq of bridges.slice(0, 1)) {
      const brParams = new URLSearchParams({
        order: 'desc', sort: 'relevance', site: Config.SITE,
        page: '1', pagesize: '5', q: bq, filter: Config.SE_FILTER,
      });
      promises.push(
        SearchCache.cachedFetch(`${Config.SE_API}/search/advanced?${brParams}`, Config.SEARCH_TIMEOUT_MS)
          .then(r => r.ok ? r.json().then(d => ({ engine: 'bridge', data: d, cached: r._cached })) : ({ engine: 'bridge', data: null }))
          .catch(() => ({ engine: 'bridge', data: null }))
      );
    }
    if (bridges.length > 0) stats.conceptBridges = bridges;
  }

  try {
    const results = await Promise.all(promises);
    if (thisId !== _textSearchId) return;

    stats.timing.fetch = Math.round(performance.now() - startTime);

    let allItems = [];
    let quota = null;
    let hasMore = false;

    for (const res of results) {
      if (!res.data) continue;
      if (res.data.error_message) continue;
      if (quota === null && res.data.quota_remaining != null) quota = res.data.quota_remaining;
      if (res.data.has_more) hasMore = true;
      if (res.cached) stats.cached++;

      const items = (res.data.items || []).map(item => {
        // Normalize excerpts format
        if (item.item_type) {
          return {
            question_id      : item.question_id,
            title            : item.title || 'Untitled',
            link             : `https://math.stackexchange.com/questions/${item.question_id}`,
            score            : item.score ?? 0,
            answer_count     : item.answer_count ?? 0,
            view_count       : item.view_count ?? 0,
            creation_date    : item.creation_date,
            accepted_answer_id: item.accepted_answer_id,
            tags             : item.tags || [],
            owner            : item.owner || {},
            excerpt          : item.excerpt || '',
            item_type        : item.item_type,
            _source          : res.engine,
          };
        }
        return { ...item, _source: res.engine };
      });

      stats.sources[res.engine] = items.length;

      // Merge with dedup
      const seen = new Set(allItems.map(i => i.question_id));
      for (const it of items) {
        if (it.question_id && !seen.has(it.question_id)) {
          seen.add(it.question_id);
          allItems.push(it);
        }
      }
    }

    State.hasMore = hasMore;
    stats.totalResults = allItems.length;

    if (!allItems.length) {
      showStatus('No results found. Try a different query.');
      return;
    }

    // ════════════════════════════════════════════════
    // PHASE 2a: Fetch full Q bodies + answers
    // ════════════════════════════════════════════════
    if (allItems.length > 0) {
      showStatus('Loading full question bodies & answers…');
      const enrichStart = performance.now();
      allItems = await enrichWithBodiesAndAnswers(allItems, thisId, '_textSearchId');
      stats.timing.enrich = Math.round(performance.now() - enrichStart);
      if (thisId !== _textSearchId) return;
    }

    // ════════════════════════════════════════════════
    // PHASE 2b: Fetch related, linked & hot-by-tag questions
    // ════════════════════════════════════════════════
    if (typeof SearchEnhance !== 'undefined' && allItems.length > 0) {
      const topIds = allItems.slice(0, 3).map(i => i.question_id).filter(Boolean);
      const inferredTags = SearchEnhance.inferTags(q, 3);

      if (topIds.length > 0 || inferredTags.length > 0) {
        showStatus('Finding related, linked & trending questions…');
        const relStart = performance.now();

        const phase2bPromises = [];
        if (topIds.length > 0) {
          phase2bPromises.push(SearchEnhance.fetchRelated(topIds).catch(() => []));
          phase2bPromises.push(SearchEnhance.fetchLinked(topIds).catch(() => []));
        } else {
          phase2bPromises.push(Promise.resolve([]));
          phase2bPromises.push(Promise.resolve([]));
        }
        // Hot questions in inferred tags
        if (inferredTags.length > 0) {
          phase2bPromises.push(SearchEnhance.fetchHotByTag(inferredTags, 2).catch(() => []));
        } else {
          phase2bPromises.push(Promise.resolve([]));
        }

        const [relItems, lnkItems, hotItems] = await Promise.all(phase2bPromises);
        if (thisId !== _textSearchId) return;

        stats.sources['related'] = relItems.length;
        stats.sources['linked'] = lnkItems.length;
        stats.sources['hot'] = hotItems.length;

        const extraItems = [...relItems, ...lnkItems, ...hotItems];
        if (extraItems.length > 0) {
          const existingIds = new Set(allItems.map(i => i.question_id));
          const newItems = extraItems.filter(i => i.question_id && !existingIds.has(i.question_id));
          if (newItems.length > 0) {
            const enrichedNew = await enrichWithBodiesAndAnswers(newItems, thisId, '_textSearchId');
            if (thisId !== _textSearchId) return;
            allItems = allItems.concat(enrichedNew);
          }
        }

        stats.timing.related = Math.round(performance.now() - relStart);
      }
    }

    // ════════════════════════════════════════════════
    // PHASE 2c: Fetch tag wikis for context sidebar
    // ════════════════════════════════════════════════
    let tagWikis = [];
    if (typeof SearchEnhance !== 'undefined') {
      const inferredTags = SearchEnhance.inferTags(q, 3);
      if (inferredTags.length > 0) {
        tagWikis = await SearchEnhance.fetchTagWikis(inferredTags, 3).catch(() => []);
      }
    }

    // ════════════════════════════════════════════════
    // PHASE 2d: Google fallback — if fewer than 10 results found
    // ════════════════════════════════════════════════
    if (typeof SearchEnhance !== 'undefined' && allItems.length < 10) {
      showStatus(allItems.length < 5
        ? 'Few results — trying Google fallback…'
        : 'Supplementing with Google results…');
      const googleStart = performance.now();
      try {
        const googleItems = await SearchEnhance.fetchGoogleResults(q, 10);
        if (thisId !== _textSearchId) return;
        if (googleItems.length > 0) {
          const existingIds = new Set(allItems.map(i => i.question_id));
          const newGoogle = googleItems.filter(i => i.question_id && !existingIds.has(i.question_id));
          if (newGoogle.length > 0) {
            const enrichedGoogle = await enrichWithBodiesAndAnswers(newGoogle, thisId, '_textSearchId');
            if (thisId !== _textSearchId) return;
            allItems = allItems.concat(enrichedGoogle);
            stats.sources['google'] = newGoogle.length;
          }
        }
      } catch (_) {}
      stats.timing.google = Math.round(performance.now() - googleStart);
    }

    // ════════════════════════════════════════════════
    // PHASE 2e: LaTeX-aware body scanning (when query contains math)
    // ════════════════════════════════════════════════
    if (typeof MathSimilarity !== 'undefined' && /\$[^$]+\$|\\(frac|int|sum|sqrt)/.test(q)) {
      showStatus('Scanning for formula matches in results…');
      const latexScanStart = performance.now();
      try {
        // Extract LaTeX from the text query
        const queryFormulas = MathSimilarity.extractFormulas(q);
        if (queryFormulas.length > 0) {
          const queryTex = queryFormulas[0];
          const canonQuery = typeof LaTeXCanon !== 'undefined'
            ? LaTeXCanon.canonicalize(queryTex) : queryTex;
          const queryTree = MathSimilarity.parse(canonQuery);
          if (queryTree && queryTree.t !== 'empty') {
            for (const item of allItems) {
              const sim = MathSimilarity.scoreResult(
                queryTree,
                item.title || '',
                item.excerpt || '',
                item.body || ''
              );
              if (sim > 0) {
                item._formulaSimilarity = sim;
                // Boost relevance score proportional to formula similarity
                if (item._relevanceScore != null) {
                  item._relevanceScore += sim * 40;
                }
              }
            }
          }
        }
      } catch (_) {}
      stats.timing.latexScan = Math.round(performance.now() - latexScanStart);
    }

    // ════════════════════════════════════════════════
    // PHASE 3: Negation filter + smart relevance ranking
    // ════════════════════════════════════════════════
    if (typeof SearchEnhance !== 'undefined') {
      // Apply negation filter (remove items containing -excluded / NOT terms)
      if (_negatedTerms.length > 0) {
        const beforeCount = allItems.length;
        allItems = SearchEnhance.applyNegation(allItems, _negatedTerms);
        stats.negatedFiltered = beforeCount - allItems.length;
      }

      const inferredTags = SearchEnhance.inferTags(q);
      stats.inferredTags = inferredTags;
      const rankStart = performance.now();
      allItems = SearchEnhance.rankResults(allItems, q, inferredTags);
      stats.timing.rank = Math.round(performance.now() - rankStart);
    }

    // ════════════════════════════════════════════════
    // PHASE 4: Intelligence layer — TF-IDF, dedup, snippets, confidence
    // ════════════════════════════════════════════════
    if (typeof SearchIntelligence !== 'undefined') {
      const intelStart = performance.now();

      // 4a: TF-IDF rare term boost
      if (termWeights && termWeights.size > 0) {
        for (const item of allItems) {
          const boost = SearchIntelligence.rareTermBoost(item, termWeights);
          if (boost > 0 && item._relevanceScore != null) {
            item._relevanceScore += boost;
            item._rareTermBoost = boost;
          }
        }
        // Re-sort after TF-IDF boost
        allItems.sort((a, b) => (b._relevanceScore || 0) - (a._relevanceScore || 0));
      }

      // 4b: Intent-aware score adjustment
      if (detectedIntents.length > 0 && detectedIntents[0].intent !== 'generic') {
        const intentInfo = detectedIntents[0];
        for (const item of allItems) {
          // Boost items whose tags match the detected intent's tags
          const itemTags = new Set((item.tags || []).map(t => t.toLowerCase()));
          const intentTagMatches = intentInfo.boostTags.filter(t => itemTags.has(t)).length;
          if (intentTagMatches > 0 && item._relevanceScore != null) {
            item._relevanceScore += intentTagMatches * 6 * intentInfo.confidence;
          }
        }
        allItems.sort((a, b) => (b._relevanceScore || 0) - (a._relevanceScore || 0));
      }

      // 4c: Near-duplicate detection & grouping
      allItems = SearchIntelligence.detectDuplicates(allItems, 0.72);
      stats.duplicatesFound = allItems.filter(i => i._isDuplicate).length;

      // 4d: Smart snippet extraction for top results
      for (const item of allItems.slice(0, 15)) {
        if (item.body) {
          const snippet = SearchIntelligence.extractBestSnippet(item.body, q, 220);
          if (snippet && snippet.score >= 3) {
            item._smartSnippet = snippet.snippet;
          }
        }
        // 4e: Answer quality scoring
        if (item.answers && item.answers.length > 0) {
          for (const ans of item.answers) {
            ans._qualityScore = SearchIntelligence.scoreAnswerQuality(ans);
          }
          // Re-sort answers: accepted first, then by quality score
          item.answers.sort((a, b) => {
            if (a.is_accepted && !b.is_accepted) return -1;
            if (!a.is_accepted && b.is_accepted) return 1;
            return (b._qualityScore || 0) - (a._qualityScore || 0);
          });
        }
      }

      // 4f: Confidence estimation
      stats.confidence = SearchIntelligence.estimateConfidence(allItems, q);

      // 4g: Generate related search suggestions
      stats.suggestions = SearchIntelligence.generateSuggestions(q, allItems);

      // 4h: Result clustering
      stats.clusters = SearchIntelligence.clusterResults(allItems);

      stats.timing.intelligence = Math.round(performance.now() - intelStart);
    }

    // ════════════════════════════════════════════════
    // PHASE 4b: Adaptive recall expansion (if still too few results)
    // ════════════════════════════════════════════════
    if (typeof SearchIntelligence !== 'undefined' && allItems.length < 5) {
      const fallbackLevel = allItems.length === 0 ? 3 : allItems.length < 3 ? 2 : 1;
      const fallbacks = SearchIntelligence.generateFallbacks(q, fallbackLevel);
      if (fallbacks.length > 0) {
        showStatus('Expanding search with fallback strategies…');
        const fbStart = performance.now();
        for (const fb of fallbacks.slice(0, 2)) {
          try {
            const fbParams = new URLSearchParams({
              order: 'desc', sort: 'relevance', site: Config.SITE,
              page: '1', pagesize: '8', q: fb.q, filter: Config.SE_FILTER,
            });
            const fbResp = await SearchCache.cachedFetch(
              `${Config.SE_API}/search/advanced?${fbParams}`, Config.SEARCH_TIMEOUT_MS
            );
            if (thisId !== _textSearchId) return;
            if (fbResp && fbResp.ok) {
              const fbData = await fbResp.json();
              if (fbData.items && fbData.items.length > 0) {
                const existingIds = new Set(allItems.map(i => i.question_id));
                const newFb = fbData.items
                  .filter(i => i.question_id && !existingIds.has(i.question_id))
                  .map(i => ({ ...i, _source: 'fallback-' + fb.label }));
                if (newFb.length > 0) {
                  const enrichedFb = await enrichWithBodiesAndAnswers(newFb, thisId, '_textSearchId');
                  if (thisId !== _textSearchId) return;
                  allItems = allItems.concat(enrichedFb);
                  stats.sources['fb-' + fb.label] = newFb.length;
                }
              }
            }
          } catch (_) {}
        }
        // Re-rank after adding fallback results
        if (typeof SearchEnhance !== 'undefined') {
          allItems = SearchEnhance.rankResults(allItems, q, SearchEnhance.inferTags(q));
        }
        stats.timing.fallback = Math.round(performance.now() - fbStart);
      }
    }

    stats.timing.total = Math.round(performance.now() - startTime);
    stats.tagWikis = tagWikis;

    renderTextResults(allItems, quota, stats);
    refreshHistoryUI();
    typesetResults();
  } catch (err) {
    if (thisId !== _textSearchId) return;
    if (err.name === 'AbortError') showError('Request timed out. Try again.');
    else showError(err.message);
  }
}

/* ================================================================
   ENRICH: Fetch full question bodies + all answers
   ================================================================
   After initial search returns question IDs, this fetches:
     1. /questions/{ids} with body filter — full question HTML
     2. /questions/{ids}/answers with body filter — all answers
   Attaches body + answers[] to each result item.
   ================================================================ */

async function enrichWithBodiesAndAnswers(items, thisId, idField) {
  const ids = [...new Set(items.map(i => i.question_id).filter(Boolean))].slice(0, 30);
  if (!ids.length) return items;

  const idStr = ids.join(';');
  const bodyFilter  = Config.SE_BODY_FILTER || '!nNPvSNe7y9';
  const ansFilter   = Config.SE_ANS_FILTER  || '!-.mgQ5bBCuz1';

  // Fire both Q body + answers in parallel
  const [bodyResp, ansResp] = await Promise.all([
    // Fetch question bodies
    SearchCache.cachedFetch(
      `${Config.SE_API}/questions/${idStr}?site=${Config.SITE}&filter=${bodyFilter}&pagesize=30`,
      Config.SEARCH_TIMEOUT_MS
    ).catch(() => null),
    // Fetch all answers for these questions (up to 100)
    SearchCache.cachedFetch(
      `${Config.SE_API}/questions/${idStr}/answers?site=${Config.SITE}&filter=${ansFilter}&order=desc&sort=votes&pagesize=100`,
      Config.SEARCH_TIMEOUT_MS
    ).catch(() => null),
  ]);

  // Build question body map
  const bodyMap = new Map();
  if (bodyResp && bodyResp.ok) {
    try {
      const bodyData = await bodyResp.json();
      if (bodyData.items) {
        for (const q of bodyData.items) {
          bodyMap.set(q.question_id, {
            body: q.body || '',
            body_markdown: q.body_markdown || '',
            title: q.title || '',
            score: q.score,
            answer_count: q.answer_count,
            accepted_answer_id: q.accepted_answer_id,
          });
        }
      }
    } catch (_) {}
  }

  // Build answers map: question_id → [answer, answer, ...]
  const answersMap = new Map();
  if (ansResp && ansResp.ok) {
    try {
      const ansData = await ansResp.json();
      if (ansData.items) {
        for (const ans of ansData.items) {
          const qid = ans.question_id;
          if (!answersMap.has(qid)) answersMap.set(qid, []);
          answersMap.get(qid).push({
            answer_id: ans.answer_id,
            body: ans.body || '',
            score: ans.score ?? 0,
            is_accepted: ans.is_accepted || false,
            owner: ans.owner || {},
            creation_date: ans.creation_date,
          });
        }
      }
    } catch (_) {}
  }

  // Attach bodies and answers to items
  return items.map(item => {
    const qData = bodyMap.get(item.question_id);
    const answers = answersMap.get(item.question_id) || [];

    // Sort answers: accepted first, then by score descending
    answers.sort((a, b) => {
      if (a.is_accepted && !b.is_accepted) return -1;
      if (!a.is_accepted && b.is_accepted) return 1;
      return b.score - a.score;
    });

    return {
      ...item,
      body: (qData && qData.body) || item.body || '',
      title: (qData && qData.title) || item.title,
      score: (qData && qData.score != null) ? qData.score : item.score,
      answer_count: (qData && qData.answer_count != null) ? qData.answer_count : item.answer_count,
      accepted_answer_id: (qData && qData.accepted_answer_id) || item.accepted_answer_id,
      answers: answers,
    };
  });
}

/* ================================================================
   RENDER — Full Q&A content display
   ================================================================ */

function renderTextResults(items, quota, stats) {
  if (!items.length) { showStatus('No results found. Try a different query.'); return; }

  const quotaStr = quota != null ? ` (API quota: ${quota})` : '';
  const pageSize = Math.min(parseInt(DOM.pageSize?.value || '20', 10) || 20, 20);
  const visibleItems = items.slice(0, pageSize);
  if (typeof _lastSearchResults !== 'undefined') {
    _lastSearchResults = items;
    _lastSearchQuery = DOM.query ? DOM.query.value.trim() : '';
  }
  showStatus(`Page ${State.currentPage} - showing ${visibleItems.length} of ${items.length} results${quotaStr}`);

  const frag = document.createDocumentFragment();

  visibleItems.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'result-card';

    const date = item.creation_date
      ? new Date(item.creation_date * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : '';
    const tags     = (item.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    const accepted = item.accepted_answer_id ? '<span class="accepted">&#10003; Accepted</span>' : '';

    // Source badges
    let srcBadge = '';
    if (item._sources && item._sources.length > 1) {
      srcBadge = `<span class="source-badge source-multi" title="Found by ${item._sources.join(', ')}">${item._sources.length} sources</span> `;
    } else if (item._source === 'related') {
      srcBadge = '<span class="source-badge source-related" title="Related question">REL</span> ';
    } else if (item._source === 'linked') {
      srcBadge = '<span class="source-badge source-linked" title="Linked question">LNK</span> ';
    } else if (item._source === 'synonym') {
      srcBadge = '<span class="source-badge source-synonym" title="Found via synonym expansion">SYN</span> ';
    } else if (item._source === 'tagged') {
      srcBadge = '<span class="source-badge source-tagged" title="Found by tag search">TAG</span> ';
    } else if (item._source === 'decompose') {
      srcBadge = '<span class="source-badge source-decompose" title="Found by sub-query">SUB</span> ';
    } else if (item._source === 'phrase') {
      srcBadge = '<span class="source-badge source-phrase" title="Exact phrase match">PHR</span> ';
    } else if (item._source === 'ans-body') {
      srcBadge = '<span class="source-badge source-answer" title="Found in answer content">ANS</span> ';
    } else if (item._source === 'mathoverflow') {
      srcBadge = '<span class="source-badge source-mathoverflow" title="From MathOverflow">MO</span> ';
    } else if (item._source === 'hot') {
      srcBadge = '<span class="source-badge source-hot" title="Trending question">HOT</span> ';
    } else if (item._source === 'google') {
      srcBadge = '<span class="source-badge source-google" title="Found via Google">G</span> ';
    } else if (item._source === 'firecrawl') {
      srcBadge = '<span class="source-badge source-google" title="Found via web expansion">WEB</span> ';
    } else if (item._source === 'excerpts' && item.item_type === 'answer') {
      srcBadge = '<span class="source-badge source-answer" title="Found in an answer">ANS</span> ';
    } else if (item._source === 'rewrite') {
      srcBadge = '<span class="source-badge source-rewrite" title="Found by semantic rewrite">RW</span> ';
    } else if (item._source === 'intent') {
      srcBadge = '<span class="source-badge source-intent" title="Found by intent detection">INT</span> ';
    } else if (item._source === 'bridge') {
      srcBadge = '<span class="source-badge source-bridge" title="Cross-concept bridge">BRG</span> ';
    } else if ((item._source || '').startsWith('fallback-')) {
      srcBadge = '<span class="source-badge source-fallback" title="Adaptive recall fallback">FB</span> ';
    }

    // Duplicate indicator
    let dupBadge = '';
    if (item._duplicateGroup && item._duplicateGroup > 1) {
      dupBadge = `<span class="source-badge source-dup" title="${item._duplicateGroup} similar questions found">×${item._duplicateGroup}</span> `;
    }

    // Relevance score badge
    let relevanceBadge = '';
    if (item._relevanceScore != null) {
      const pct = Math.min(Math.round(item._relevanceScore), 200);
      const cls = pct >= 100 ? 'high' : pct >= 50 ? 'mid' : 'low';
      relevanceBadge = `<span class="relevance-badge relevance-${cls}" title="Relevance score: ${item._relevanceScore}">${pct}%</span> `;
    }

    // Smart snippet (AI-extracted best passage)
    let snippetHtml = '';
    if (item._smartSnippet) {
      snippetHtml = `<div class="smart-snippet"><span class="snippet-label">&#10024; Best match:</span> ${item._smartSnippet}</div>`;
    }

    // Question body (collapsible)
    let bodyHtml = '';
    if (item.body) {
      const bodyPreview = truncateHtml(item.body, 300);
      const isLong = item.body.length > 400;
      bodyHtml = `
        <div class="qa-body question-body" id="qbody-${idx}">
          <div class="qa-body-label">&#128221; Question</div>
          <div class="qa-body-content ${isLong ? 'collapsed' : ''}">${item.body}</div>
          ${isLong ? `<button class="qa-toggle" onclick="toggleQABody(this)" data-state="collapsed">Show full question &#9660;</button>` : ''}
        </div>`;
    } else if (item.excerpt) {
      bodyHtml = `<div class="result-snippet">${item.excerpt}</div>`;
    }

    // Answers section
    let answersHtml = '';
    if (item.answers && item.answers.length > 0) {
      const ansCards = item.answers.map((ans, ai) => {
        const ansAccepted = ans.is_accepted ? '<span class="accepted-answer-badge">&#10003; Accepted Answer</span>' : '';
        const ansDate = ans.creation_date
          ? new Date(ans.creation_date * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : '';
        const ansIsLong = ans.body.length > 400;
        const qualityBadge = ans._qualityScore != null
          ? `<span class="quality-badge quality-${ans._qualityScore >= 60 ? 'high' : ans._qualityScore >= 30 ? 'mid' : 'low'}" title="Answer quality: ${ans._qualityScore}/100">Q:${ans._qualityScore}</span>`
          : '';

        return `
          <div class="answer-card ${ans.is_accepted ? 'answer-accepted' : ''}">
            <div class="answer-header">
              ${ansAccepted}
              ${qualityBadge}
              <span class="answer-score">&#9650; ${ans.score}</span>
              ${ans.owner?.display_name ? `<span class="answer-author">by ${ans.owner.display_name}</span>` : ''}
              ${ansDate ? `<span class="answer-date">${ansDate}</span>` : ''}
            </div>
            <div class="qa-body-content ${ansIsLong ? 'collapsed' : ''}">${ans.body}</div>
            ${ansIsLong ? `<button class="qa-toggle" onclick="toggleQABody(this)" data-state="collapsed">Show full answer &#9660;</button>` : ''}
          </div>`;
      }).join('');

      const countLabel = item.answers.length === 1 ? '1 Answer' : `${item.answers.length} Answers`;
      answersHtml = `
        <div class="answers-section" id="answers-${idx}">
          <div class="answers-header" onclick="toggleAnswers(this)">
            <span>&#128172; ${countLabel}</span>
            <span class="answers-toggle-icon">&#9660;</span>
          </div>
          <div class="answers-list collapsed">${ansCards}</div>
        </div>`;
    }

    card.innerHTML = `
      <h3>${relevanceBadge}${srcBadge}${dupBadge}<a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h3>
      ${snippetHtml}
      ${bodyHtml}
      ${answersHtml}
      <div class="meta">
        <span>&#9650; ${item.score}</span>
        <span>&#128172; ${item.answer_count ?? '?'} answers</span>
        ${accepted}
        ${item.view_count ? `<span>&#128065; ${item.view_count} views</span>` : ''}
        ${date ? `<span>&#128197; ${date}</span>` : ''}
        ${item.owner?.display_name ? `<span>by ${item.owner.display_name}</span>` : ''}
      </div>
      ${tags ? `<div class="tags">${tags}</div>` : ''}`;

    frag.appendChild(card);
  });

  DOM.results.innerHTML = '';
  DOM.results.appendChild(frag);

  renderPagination(searchText);

  // ← أضف هذا فقط
  requestAnimationFrame(() => {
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([DOM.results]).catch(() => {});
    }
  });
}

/** Truncate HTML safely (for previews) */
function truncateHtml(html, maxLen) {
  if (html.length <= maxLen) return html;
  // Strip tags for length calc, then return original up to a safe point
  const text = html.replace(/<[^>]*>/g, '');
  return text.length <= maxLen ? html : text.slice(0, maxLen) + '…';
}

/** Toggle expand/collapse of Q/A body content */// ✅ الجديد — أضف تأخير صغير
function toggleQABody(btn) {
  const content = btn.previousElementSibling;
  if (!content) return;
  const isCollapsed = btn.dataset.state === 'collapsed';
  content.classList.toggle('collapsed', !isCollapsed);
  btn.dataset.state = isCollapsed ? 'expanded' : 'collapsed';
  btn.innerHTML = isCollapsed
    ? 'Show less &#9650;'
    : (btn.textContent.includes('answer') ? 'Show full answer &#9660;' : 'Show full question &#9660;');

  // ← الإصلاح: typeset بعد أن يظهر المحتوى
  if (isCollapsed) {
    setTimeout(() => {
      if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([content]).catch(() => {});
      }
    }, 50);
  }
}

function renderTextAnalytics(stats) {
  const old = document.getElementById('searchAnalytics');
  if (old) old.remove();
  const oldWiki = document.getElementById('tagWikiPanel');
  if (oldWiki) oldWiki.remove();
  const oldSugg = document.getElementById('searchSuggestions');
  if (oldSugg) oldSugg.remove();
  const oldConf = document.getElementById('confidenceBar');
  if (oldConf) oldConf.remove();

  const sources = Object.entries(stats.sources)
    .map(([k, v]) => `<span class="analytics-chip">${k}: ${v}</span>`)
    .join('');

  const panel = document.createElement('div');
  panel.id = 'searchAnalytics';
  panel.className = 'search-analytics';
  const enhancedStr = stats.enhancedQueries ? `+${stats.enhancedQueries} enhanced` : '';
  const negStr = stats.negatedFiltered ? ` | ${stats.negatedFiltered} filtered by NOT` : '';
  const rwStr = stats.queryRewrites ? ` +${stats.queryRewrites} rewrites` : '';
  const intentStr = stats.detectedIntent ? ` | intent: <em>${stats.detectedIntent}</em>` : '';
  const dupStr = stats.duplicatesFound ? ` | ${stats.duplicatesFound} duplicates grouped` : '';
  const tagsStr = (stats.inferredTags && stats.inferredTags.length)
    ? `<div class="analytics-row"><strong>Inferred tags:</strong> ${stats.inferredTags.map(t => `<span class="analytics-chip tag-chip">${t}</span>`).join('')}</div>` : '';
  const defaultTagsStr = (stats.defaultTags && stats.defaultTags.length)
    ? `<div class="analytics-row"><strong>Default tags:</strong> ${stats.defaultTags.map(t => `<span class="analytics-chip tag-chip">${t}</span>`).join('')}</div>` : '';
  const bridgeStr = (stats.conceptBridges && stats.conceptBridges.length)
    ? `<div class="analytics-row"><strong>Concept bridges:</strong> ${stats.conceptBridges.map(b => `<span class="analytics-chip">${b}</span>`).join('')}</div>` : '';

  panel.innerHTML = `
    <div class="analytics-toggle" onclick="this.parentElement.classList.toggle('expanded')">
      &#9881; Search Analytics
      <span class="analytics-summary">${stats.totalResults} results in ${stats.timing.total}ms ${enhancedStr}${rwStr}${negStr}${intentStr}${dupStr}</span>
    </div>
    <div class="analytics-body">
      <div class="analytics-row">
        <strong>Sources:</strong> ${sources || 'none'}
      </div>
      ${tagsStr}
      ${defaultTagsStr}
      ${bridgeStr}
      <div class="analytics-row">
        <strong>Timing:</strong> fetch ${stats.timing.fetch}ms, enrich ${stats.timing.enrich || 0}ms${stats.timing.related ? `, related ${stats.timing.related}ms` : ''}${stats.timing.google ? `, google ${stats.timing.google}ms` : ''}${stats.timing.latexScan ? `, formula-scan ${stats.timing.latexScan}ms` : ''}${stats.timing.rank ? `, rank ${stats.timing.rank}ms` : ''}${stats.timing.intelligence ? `, intelligence ${stats.timing.intelligence}ms` : ''}${stats.timing.fallback ? `, fallback ${stats.timing.fallback}ms` : ''}, total ${stats.timing.total}ms
        &middot; <strong>Cache hits:</strong> ${stats.cached || 0}
      </div>
    </div>`;

  DOM.results.parentNode.insertBefore(panel, DOM.results);

  // ── Confidence bar ──
  if (stats.confidence && stats.confidence.level) {
    const conf = stats.confidence;
    const confBar = document.createElement('div');
    confBar.id = 'confidenceBar';
    confBar.className = `confidence-bar confidence-${conf.level}`;
    const icons = { high: '&#9733;', medium: '&#9888;', low: '&#10060;' };
    confBar.innerHTML = `
      <span class="confidence-icon">${icons[conf.level] || ''}</span>
      <span class="confidence-text">${conf.reason}</span>
      <span class="confidence-score">${conf.score}%</span>
      <div class="confidence-meter"><div class="confidence-fill" style="width:${conf.score}%"></div></div>`;
    DOM.results.parentNode.insertBefore(confBar, DOM.results);
  }

  // ── Search suggestions ("People also search for") ──
  if (stats.suggestions && stats.suggestions.length > 0) {
    const suggPanel = document.createElement('div');
    suggPanel.id = 'searchSuggestions';
    suggPanel.className = 'search-suggestions';
    const chips = stats.suggestions.map(s =>
      `<button class="suggestion-chip" title="${s.reason}" onclick="document.getElementById('query').value='${s.text.replace(/'/g, "\\'")}';searchText()">${s.text}</button>`
    ).join('');
    suggPanel.innerHTML = `
      <span class="suggestions-label">&#128270; Related searches:</span>
      ${chips}`;
    DOM.results.parentNode.insertBefore(suggPanel, DOM.results);
  }

  // ── Tag Wiki "Did You Know?" panel ──
  if (stats.tagWikis && stats.tagWikis.length > 0) {
    const wikiPanel = document.createElement('div');
    wikiPanel.id = 'tagWikiPanel';
    wikiPanel.className = 'tag-wiki-panel';
    const wikiCards = stats.tagWikis.map(w => `
      <div class="tag-wiki-card">
        <span class="tag-wiki-tag">${w.tag}</span>
        <span class="tag-wiki-excerpt">${w.excerpt}</span>
      </div>
    `).join('');
    wikiPanel.innerHTML = `
      <div class="tag-wiki-header" onclick="this.parentElement.classList.toggle('expanded')">
        &#128218; Topic Context <span class="tag-wiki-toggle">&#9660;</span>
      </div>
      <div class="tag-wiki-body">${wikiCards}</div>`;
    DOM.results.parentNode.insertBefore(wikiPanel, DOM.results);
  }
}

