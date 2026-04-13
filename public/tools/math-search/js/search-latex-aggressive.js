/* ================================================================
   search-latex-aggressive.js — Aggressive parallel search override
   
   Replaces the wave-based searchLatex() with a BLITZ mode that:
   1. Fires ALL search queries in parallel (no wave delays)
   2. Adds direct SE question lookup by ID from Google results
   3. Adds SE /search/excerpts with raw LaTeX body fragments
   4. Adds SE /search with title-matching patterns
   5. Adds a direct question fetch for IDs found across all sources
   6. Completes within ~30s–60s (API response time only, no artificial delays)
   ================================================================ */

// Override searchLatex with aggressive blitz mode
// (this function declaration replaces the one from search-latex.js)
async function searchLatex(forceOriginal) {
  let rawTex   = DOM.latexInput.value.trim();
  let keywords = DOM.latexKeywords.value.trim();

  // ── Normalize LaTeX spacing
  if (rawTex && typeof LaTeXCanon !== 'undefined') {
    rawTex = LaTeXCanon.normalizeSpacing(rawTex);
  }

  // ── Normalize bare \frac without braces
  if (rawTex) {
    rawTex = normalizeBareFrags(rawTex);
  }

  if (!rawTex && !keywords) {
    showStatus('Please enter a LaTeX formula or keywords.');
    clearResults();
    return;
  }

  // ── Autocorrect typos
  let acBanner = null;
  if (!forceOriginal && typeof SearchAutocorrect !== 'undefined') {
    const allCorrections = [];
    const originalRawTex = rawTex;
    const originalKeywords = keywords;
    if (rawTex) {
      const acTex = SearchAutocorrect.correctLatex(rawTex);
      if (acTex.corrections.length) {
        rawTex = acTex.text;
        allCorrections.push(...acTex.corrections);
      }
    }
    if (keywords) {
      const acKw = SearchAutocorrect.autocorrect(keywords, 'text');
      if (acKw.changed) {
        keywords = acKw.text;
        allCorrections.push(...acKw.corrections);
      }
    }
    if (allCorrections.length) {
      const origStr = originalRawTex + (originalKeywords ? ' ' + originalKeywords : '');
      acBanner = SearchAutocorrect.createSuggestionBanner(origStr, allCorrections, (orig) => {
        DOM.latexInput.value = originalRawTex;
        DOM.latexKeywords.value = originalKeywords;
        State.currentPage = 1;
        searchLatex(true);
      });
    }
    if (keywords && SearchAutocorrect.expandEquivalences) {
      const eqResult = SearchAutocorrect.expandEquivalences(keywords);
      if (eqResult.additions.length > 0) keywords = eqResult.expanded;
    }
  }

  showLoader();
  const thisId = ++_latexSearchId;
  const startTime = performance.now();

  if (acBanner) {
    DOM.results.innerHTML = '';
    DOM.results.appendChild(acBanner);
  }

  // ── Canonicalize
  const tex = rawTex && typeof LaTeXCanon !== 'undefined'
    ? LaTeXCanon.normalizeForSearch(rawTex)
    : rawTex;

  SearchCache.addHistory('latex', rawTex || keywords);

  // ════════════════════════════════════════════════
  // BLITZ MODE: Fire EVERYTHING in parallel, no delays
  // ════════════════════════════════════════════════
  const stats = { sources: {}, timing: {}, totalResults: 0, cached: 0, waves: 0 };
  let allItems = [];
  let quota = null;
  let anyHasMore = false;
  let rateLimited = false;

  // Build all query plans
  const queryPlan = tex
    ? buildSearchQueries(tex, keywords)
    : [{ type: 'natural', q: keywords }];

  if (rawTex && tex !== rawTex) {
    const origQueries = buildSearchQueries(rawTex, keywords);
    for (const oq of origQueries) {
      if (!queryPlan.find(q => q.q === oq.q)) {
        queryPlan.push({ ...oq, type: 'orig-' + oq.type });
      }
    }
  }

  // ARQMath tokenizer queries
  if (tex && typeof FormulaTokenizer !== 'undefined') {
    try {
      const tree = MathSimilarity.parse(
        typeof LaTeXCanon !== 'undefined' ? LaTeXCanon.canonicalize(tex) : tex
      );
      if (tree && tree.t !== 'empty') {
        const impQ = FormulaTokenizer.buildImportantTokensQuery(tree);
        if (impQ.length > 5 && !queryPlan.find(q => q.q === impQ)) {
          queryPlan.push({ type: 'tfidf', q: impQ });
        }
        const subQueries = FormulaTokenizer.extractSubexprQueries(tree, 3);
        for (const sq of subQueries.slice(0, 3)) {
          if (!queryPlan.find(q => q.q === sq.query)) {
            queryPlan.push({ type: 'subexpr', q: sq.query });
          }
        }
      }
    } catch (_) {}
  }

  // Build notation variant queries
  const allVariants = tex ? generateNotationVariants(tex) : [];
  const variantQueries = [];
  for (const variant of allVariants.slice(0, 6)) {
    const vNatural = latexToNatural(variant);
    if (vNatural.length > 8 && !queryPlan.find(q => q.q === vNatural) && !variantQueries.find(q => q.q === vNatural)) {
      variantQueries.push({ type: 'variant-rewrite', q: vNatural });
    }
    const vReadable = latexToReadable(variant);
    if (vReadable.length > 5 && vReadable !== vNatural && !queryPlan.find(q => q.q === vReadable) && !variantQueries.find(q => q.q === vReadable)) {
      variantQueries.push({ type: 'variant-readable', q: vReadable });
    }
  }

  // User-selected tags
  const userTags = typeof TagSelector !== 'undefined' ? TagSelector.getSelected('latex') : '';

  // Helper: build SE fetch promise
  function buildSEPromise(entry) {
    let url;
    if (entry.type === 'tagged' || entry.type === 'intitle') {
      const params = new URLSearchParams({
        order: 'desc', sort: 'relevance', site: Config.SITE,
        page: entry.sePage || State.currentPage, pagesize: '15',
        filter: Config.SE_FILTER, q: entry.q,
      });
      const combinedTags = entry.type === 'tagged'
        ? mergeTags(entry.tags || '', userTags)
        : mergeTags(extractTags(tex), userTags);
      if (combinedTags) params.set('tagged', combinedTags);
      url = `${Config.SE_API}/search/advanced?${params}`;
    } else {
      if (userTags) {
        const params = new URLSearchParams({
          order: 'desc', sort: 'relevance', site: Config.SITE,
          page: entry.sePage || State.currentPage, pagesize: '15',
          filter: Config.SE_FILTER, q: entry.q, tagged: userTags,
        });
        url = `${Config.SE_API}/search/advanced?${params}`;
      } else {
        const params = new URLSearchParams({
          order: 'desc', sort: 'relevance', site: Config.SITE,
          page: entry.sePage || State.currentPage, pagesize: '15', q: entry.q,
        });
        url = `${Config.SE_API}/search/excerpts?${params}`;
      }
    }
    return SearchCache.cachedFetch(url, Config.SEARCH_TIMEOUT_MS)
      .then(r => {
        if (r.status === 429) return { engine: 'se-' + entry.type, data: null, rateLimited: true };
        return r.ok
          ? r.json().then(d => ({ engine: 'se-' + entry.type, data: d, cached: r._cached }))
          : { engine: 'se-' + entry.type, data: null };
      })
      .catch(() => ({ engine: 'se-' + entry.type, data: null }));
  }

  // Helper: merge raw results
  function mergeWaveResults(rawResults) {
    for (const res of rawResults) {
      if (!res || !res.data) {
        if (res && res.rateLimited) rateLimited = true;
        continue;
      }
      if (res.engine === 'approach-zero' || res.engine === 'approach-zero-raw') {
        const azItems = normalizeAZResults(res.data);
        stats.sources['Approach Zero'] = (stats.sources['Approach Zero'] || 0) + azItems.length;
        allItems = mergeResults(allItems, azItems);
        continue;
      }
      if (res.engine === 'google') {
        const gItems = (res.data.items || []).map(item => ({
          ...item, _source: item._source || 'google',
        }));
        stats.sources['Google'] = (stats.sources['Google'] || 0) + gItems.length;
        allItems = mergeResults(allItems, gItems);
        continue;
      }
      if (res.engine === 'se-mathoverflow') {
        const moItems = (res.data.items || []).map(item => {
          const norm = normalizeResult(item);
          norm._source = 'mathoverflow';
          norm.link = `https://mathoverflow.net/questions/${norm.question_id}`;
          return norm;
        });
        stats.sources['MathOverflow'] = (stats.sources['MathOverflow'] || 0) + moItems.length;
        allItems = mergeResults(allItems, moItems);
        continue;
      }
      if (res.engine === 'se-direct-ids') {
        const items = (res.data.items || []).map(item => ({
          ...normalizeResult(item), _source: 'direct-lookup',
        }));
        stats.sources['Direct Lookup'] = (stats.sources['Direct Lookup'] || 0) + items.length;
        allItems = mergeResults(allItems, items);
        continue;
      }
      const data = res.data;
      if (data.error_message) continue;
      if (quota === null && data.quota_remaining != null) quota = data.quota_remaining;
      if (data.has_more) anyHasMore = true;
      if (res.cached) stats.cached++;
      const items = (data.items || []).map(normalizeResult);
      const eng = res.engine.replace('se-', '');
      stats.sources[eng] = (stats.sources[eng] || 0) + items.length;
      allItems = mergeResults(allItems, items);
    }
  }

  // ──────────────────────────────────────────────
  // NEW STRATEGY 1: SE /search with intitle parameter
  // SE's /search endpoint supports intitle: which matches against
  // question titles. MSE titles contain LaTeX — stripping backslashes
  // from LaTeX gives terms SE can match in titles.
  // e.g. \int_0^1 \frac{\ln x}{1+x^2} → intitle:"int_0^1 frac ln x"
  // This is THE most reliable way to find LaTeX questions on SE.
  // ──────────────────────────────────────────────
  function buildIntitleQueries(texInput) {
    const queries = [];
    if (!texInput || texInput.length < 5) return queries;

    // Strip backslashes to get raw title-searchable terms
    // \int_0^1 \frac{\ln x}{1+x^2} → int_0^1 frac ln x 1+x^2
    const stripped = texInput
      .replace(/\\/g, '')              // remove backslashes
      .replace(/[{}]/g, ' ')            // remove braces
      .replace(/\s+/g, ' ')             // normalize spaces
      .replace(/mathrm/g, '')           // remove mathrm
      .replace(/\s*d\s*x/g, '')         // remove dx
      .trim();

    // Build multiple intitle variations for maximum coverage
    // 1. Full stripped formula
    if (stripped.length > 5) {
      queries.push({ type: 'intitle-full', intitle: stripped });
    }

    // 2. Key distinctive terms from the formula
    // Extract the most unique parts (function names + arguments)
    const parts = stripped.split(/\s+/).filter(p => p.length > 1);
    if (parts.length >= 3) {
      // Take the most distinctive 3-4 parts
      queries.push({ type: 'intitle-parts', intitle: parts.slice(0, 4).join(' ') });
    }

    // 3. Fraction content: numerator + denominator terms
    const deepFracs = extractFractionsDeep(texInput);
    if (deepFracs.length) {
      const numStripped = deepFracs[0].numerator.replace(/\\/g, '').replace(/[{}]/g, ' ').trim();
      const denStripped = deepFracs[0].denominator.replace(/\\/g, '').replace(/[{}]/g, ' ').trim();
      if (numStripped.length > 1 && denStripped.length > 1) {
        queries.push({ type: 'intitle-frac', intitle: numStripped + ' ' + denStripped });
      }
    }

    // 4. Function names + key arguments
    const funcNames = [];
    const fnRe = /\\(ln|log|sin|cos|tan|exp|arcsin|arccos|arctan|sec|csc|cot|sinh|cosh|tanh)/g;
    let fnm;
    while ((fnm = fnRe.exec(texInput)) !== null) funcNames.push(fnm[1]);
    if (funcNames.length) {
      const denText = deepFracs.length ? deepFracs[0].denominator.replace(/\\/g, '').replace(/[{}]/g, ' ').trim() : '';
      const funcQ = funcNames.join(' ') + (denText ? ' ' + denText : '');
      if (funcQ.length > 3) {
        queries.push({ type: 'intitle-func', intitle: funcQ });
      }
    }

    return queries;
  }

  // Build SE /search promise with intitle parameter
  function buildIntitleSEPromise(entry) {
    const params = new URLSearchParams({
      sort: 'relevance', order: 'desc', site: Config.SITE,
      pagesize: '50', filter: Config.SE_FILTER,
      intitle: entry.intitle,
    });
    // Add auto-detected tags for better filtering
    const tags = extractTags(tex);
    const combinedTags = mergeTags(tags, userTags);
    if (combinedTags) params.set('tagged', combinedTags);
    const url = `${Config.SE_API}/search?${params}`;
    return SearchCache.cachedFetch(url, Config.SEARCH_TIMEOUT_MS)
      .then(r => {
        if (r.status === 429) return { engine: 'se-' + entry.type, data: null, rateLimited: true };
        return r.ok
          ? r.json().then(d => ({ engine: 'se-' + entry.type, data: d, cached: r._cached }))
          : { engine: 'se-' + entry.type, data: null };
      })
      .catch(() => ({ engine: 'se-' + entry.type, data: null }));
  }

  // ──────────────────────────────────────────────
  // STRATEGY 1B: Raw LaTeX body search queries
  // ──────────────────────────────────────────────
  function buildRawLatexQueries(texInput) {
    const rawQueries = [];
    if (!texInput || texInput.length < 5) return rawQueries;

    // The full LaTeX as-is
    rawQueries.push({ type: 'raw-latex-body', q: texInput });

    // Key LaTeX fragments
    const deepFracs = extractFractionsDeep(texInput);
    if (deepFracs.length) {
      rawQueries.push({ type: 'raw-latex-frac', q: deepFracs[0].full });
      if (deepFracs[0].denominator.length > 3) {
        rawQueries.push({ type: 'raw-latex-denom', q: deepFracs[0].denominator });
      }
    }

    // Strip \mathrm{d}x → dx for variation
    const simplified = texInput
      .replace(/\\mathrm\{d\}/g, 'd')
      .replace(/\\,d/g, ' d')
      .replace(/\s+/g, ' ')
      .trim();
    if (simplified !== texInput) {
      rawQueries.push({ type: 'raw-latex-simplified', q: simplified });
    }

    return rawQueries;
  }

  // ──────────────────────────────────────────────
  // NEW STRATEGY 2: Google search with multiple query formulations
  // Google is great at finding MSE questions — use many query variations
  // ──────────────────────────────────────────────
  function buildGoogleQueries(texInput) {
    const gQueries = [];
    if (!texInput) return gQueries;

    const naturalQ = latexToNatural(texInput);
    const readableQ = latexToReadable(texInput);

    // Google with natural language
    if (naturalQ.length > 8) gQueries.push(naturalQ);

    // Google with readable form
    if (readableQ.length > 5 && readableQ !== naturalQ) gQueries.push(readableQ);

    // Google with raw LaTeX (Google actually indexes LaTeX from MSE)
    if (texInput.length >= 10 && texInput.length <= 150) gQueries.push(texInput);

    // Google with specific phrases users use in titles
    const opWord = /\\int/.test(texInput) ? 'integral' : /\\sum/.test(texInput) ? 'sum' : '';
    if (opWord && naturalQ.length > 5) {
      gQueries.push('finding ' + naturalQ);
      gQueries.push('evaluate ' + naturalQ);
    }

    // Google with distinctive sub-expressions
    const distExprs = extractDistinctiveSubexprs(texInput);
    if (distExprs.length) {
      gQueries.push(opWord + ' ' + distExprs.slice(0, 3).join(' '));
    }

    // Google with LaTeX fragments
    const frags = extractLatexFragments(texInput);
    for (const frag of frags.slice(0, 2)) {
      if (frag.length > 6) gQueries.push(frag);
    }

    return gQueries;
  }

  // ──────────────────────────────────────────────
  // NEW STRATEGY 3: Direct question fetch by IDs found from any source
  // After initial search, extract all question IDs and batch-fetch full data
  // ──────────────────────────────────────────────
  async function directQuestionFetch(questionIds) {
    if (!questionIds.length) return { engine: 'se-direct-ids', data: null };
    const idStr = questionIds.slice(0, 30).join(';');
    try {
      const resp = await SearchCache.cachedFetch(
        `${Config.SE_API}/questions/${idStr}?site=${Config.SITE}&filter=${Config.SE_FILTER}&pagesize=30`,
        Config.SEARCH_TIMEOUT_MS
      );
      if (resp && resp.ok) {
        const data = await resp.json();
        return { engine: 'se-direct-ids', data };
      }
    } catch (_) {}
    return { engine: 'se-direct-ids', data: null };
  }

  // ── Timer UI ──
  const TOTAL_PHASES = 3;
  let _timerEl = document.getElementById('deepTimer');
  if (_timerEl) _timerEl.remove();
  _timerEl = document.createElement('div');
  _timerEl.id = 'deepTimer';
  _timerEl.className = 'deep-timer';
  _timerEl.innerHTML = `
    <span class="dt-clock">⚡ Blitz</span>
    <div class="dt-bar-wrap"><div class="dt-bar" style="width:0%"></div></div>
    <span class="dt-wave">Phase 1/${TOTAL_PHASES}</span>`;
  const statusEl = document.querySelector('.status');
  if (statusEl && statusEl.parentNode) {
    statusEl.parentNode.insertBefore(_timerEl, statusEl.nextSibling);
  } else {
    DOM.results.parentNode.insertBefore(_timerEl, DOM.results);
  }
  const _timerStart = Date.now();
  const _timerInterval = setInterval(() => {
    const elapsed = (Date.now() - _timerStart) / 1000;
    const secs = Math.floor(elapsed);
    const clockEl = _timerEl.querySelector('.dt-clock');
    if (clockEl) clockEl.textContent = `⚡ ${secs}s`;
  }, 500);
  function updatePhase(phase, label) {
    const waveEl = _timerEl.querySelector('.dt-wave');
    const barEl = _timerEl.querySelector('.dt-bar');
    if (waveEl) waveEl.textContent = `Phase ${phase}/${TOTAL_PHASES} — ${label}`;
    if (barEl) barEl.style.width = Math.round((phase / TOTAL_PHASES) * 100) + '%';
  }
  function stopTimer() {
    clearInterval(_timerInterval);
    const clockEl = _timerEl.querySelector('.dt-clock');
    const barEl = _timerEl.querySelector('.dt-bar');
    if (clockEl) clockEl.textContent = '✓ Done';
    if (barEl) barEl.style.width = '100%';
    _timerEl.classList.add('done');
    const elapsed = Math.round((Date.now() - _timerStart) / 1000);
    const waveEl = _timerEl.querySelector('.dt-wave');
    if (waveEl) waveEl.textContent = `${elapsed}s`;
    setTimeout(() => { if (_timerEl.parentNode) _timerEl.style.opacity = '0.5'; }, 3000);
  }

  try {
    // ════════════════════════════════════════════════
    // PHASE 1: BLITZ — Fire ALL queries simultaneously
    // SE queries + AZ + Google + Raw LaTeX + Title patterns
    // ════════════════════════════════════════════════
    updatePhase(1, 'Blitz search');
    showStatus(`⚡ Phase 1/${TOTAL_PHASES} — Blitz: firing all search engines simultaneously…`);

    const allPromises = [];

    // A) ALL SE queries from the full plan (no wave splitting)
    const allSEQueries = [...queryPlan, ...variantQueries];
    // Limit to top 25 most diverse queries to avoid hitting rate limits
    const seQueries = allSEQueries.slice(0, 25);
    allPromises.push(...seQueries.map(buildSEPromise));

    // B) SE page 2 for top 3 queries
    allPromises.push(...seQueries.slice(0, 3).map(e => buildSEPromise({ ...e, sePage: 2 })));

    // C) Approach Zero — original + variants (all in parallel)
    if (tex) {
      allPromises.push(
        searchApproachZeroMultiPage(tex, 3)
          .then(data => ({ engine: 'approach-zero', data }))
      );
      // AZ with variants
      const azVariantList = [rawTex, ...allVariants.slice(0, 4)].filter(v => v && v !== tex);
      const azUnique = [...new Set(azVariantList)];
      for (const variant of azUnique.slice(0, 3)) {
        allPromises.push(
          searchApproachZeroMultiPage(variant, 2)
            .then(data => ({ engine: 'approach-zero', data }))
        );
      }
    }

    // D) SE /similar
    if (tex) {
      const simTitle = latexToNatural(tex);
      if (simTitle.length > 8) {
        const simParams = new URLSearchParams({
          order: 'desc', sort: 'relevance', site: Config.SITE,
          pagesize: '10', filter: Config.SE_FILTER, title: simTitle,
        });
        allPromises.push(
          SearchCache.cachedFetch(`${Config.SE_API}/similar?${simParams}`, Config.SEARCH_TIMEOUT_MS)
            .then(r => r.ok ? r.json().then(d => ({ engine: 'se-similar', data: d })) : { engine: 'se-similar', data: null })
            .catch(() => ({ engine: 'se-similar', data: null }))
        );
      }
    }

    // E) NEW: SE /search with intitle parameter — THE KEY STRATEGY
    // This is the most reliable way to find LaTeX questions on SE
    if (tex) {
      const intitleQueries = buildIntitleQueries(tex);
      if (rawTex && rawTex !== tex) {
        intitleQueries.push(...buildIntitleQueries(rawTex));
      }
      // Deduplicate by intitle value
      const itSeen = new Set();
      const uniqueIT = intitleQueries.filter(q => {
        if (itSeen.has(q.intitle)) return false;
        itSeen.add(q.intitle);
        return true;
      });
      console.log(`⚡ Intitle queries: ${uniqueIT.length}`, uniqueIT.map(q => q.intitle));
      allPromises.push(...uniqueIT.slice(0, 6).map(buildIntitleSEPromise));

      // Also fire intitle without tags for broader results
      for (const itq of uniqueIT.slice(0, 3)) {
        const params = new URLSearchParams({
          sort: 'relevance', order: 'desc', site: Config.SITE,
          pagesize: '50', filter: Config.SE_FILTER,
          intitle: itq.intitle,
        });
        const url = `${Config.SE_API}/search?${params}`;
        allPromises.push(
          SearchCache.cachedFetch(url, Config.SEARCH_TIMEOUT_MS)
            .then(r => r.ok ? r.json().then(d => ({ engine: 'se-intitle-notag', data: d })) : { engine: 'se-intitle-notag', data: null })
            .catch(() => ({ engine: 'se-intitle-notag', data: null }))
        );
      }
    }

    // F) Raw LaTeX body search queries
    if (tex) {
      const rawLatexQueries = buildRawLatexQueries(tex);
      if (rawTex && rawTex !== tex) {
        rawLatexQueries.push(...buildRawLatexQueries(rawTex));
      }
      const seen = new Set();
      const uniqueRawQ = rawLatexQueries.filter(q => {
        if (seen.has(q.q)) return false;
        seen.add(q.q);
        return true;
      });
      allPromises.push(...uniqueRawQ.slice(0, 8).map(buildSEPromise));
    }

    // G) Google searches — multiple formulations in parallel
    if (tex) {
      const googleQueries = buildGoogleQueries(tex);
      if (rawTex && rawTex !== tex) {
        googleQueries.push(...buildGoogleQueries(rawTex));
      }
      // Deduplicate
      const gSeen = new Set();
      const uniqueGQ = googleQueries.filter(q => {
        if (gSeen.has(q)) return false;
        gSeen.add(q);
        return true;
      });
      // Fire up to 6 Google queries in parallel
      for (const gq of uniqueGQ.slice(0, 6)) {
        allPromises.push(
          fetchGoogleForLatex(gq)
            .then(items => ({ engine: 'google', data: items && items.length ? { items } : null }))
            .catch(() => ({ engine: 'google', data: null }))
        );
      }
    }

    // H) MathOverflow search
    if (tex) {
      const moNatural = latexToNatural(tex);
      if (moNatural.length > 10) {
        const moParams = new URLSearchParams({
          order: 'desc', sort: 'relevance', site: 'mathoverflow',
          pagesize: '8', q: moNatural,
        });
        allPromises.push(
          SearchCache.cachedFetch(`${Config.SE_API}/search/excerpts?${moParams}`, Config.SEARCH_TIMEOUT_MS)
            .then(r => r.ok ? r.json().then(d => ({ engine: 'se-mathoverflow', data: d })) : { engine: 'se-mathoverflow', data: null })
            .catch(() => ({ engine: 'se-mathoverflow', data: null }))
        );
      }
    }

    // I) Cross-site: physics, stats
    if (tex) {
      const crossNatural = latexToNatural(tex);
      if (crossNatural.length > 10) {
        for (const site of ['physics', 'stats']) {
          const csParams = new URLSearchParams({
            order: 'desc', sort: 'relevance', site,
            pagesize: '5', q: crossNatural,
          });
          allPromises.push(
            SearchCache.cachedFetch(`${Config.SE_API}/search/excerpts?${csParams}`, Config.SEARCH_TIMEOUT_MS)
              .then(r => r.ok ? r.json().then(d => ({ engine: 'se-' + site, data: d })) : { engine: 'se-' + site, data: null })
              .catch(() => ({ engine: 'se-' + site, data: null }))
          );
        }
      }
    }

    // FIRE EVERYTHING AT ONCE
    console.log(`⚡ BLITZ: Firing ${allPromises.length} parallel queries`);
    const phase1Results = await Promise.all(allPromises);
    if (thisId !== _latexSearchId) { stopTimer(); return; }

    mergeWaveResults(phase1Results);
    stats.waves = 1;
    stats.timing.fetch = Math.round(performance.now() - startTime);

    // Display Phase 1 results
    if (allItems.length > 0) {
      if (tex) {
        showStatus(`⚡ Phase 1 — Ranking ${allItems.length} results…`);
        const rankStart = performance.now();
        allItems = await enrichAndRank(tex, allItems, thisId);
        stats.timing.rank = Math.round(performance.now() - rankStart);
        if (thisId !== _latexSearchId) { stopTimer(); return; }
      }
      stats.timing.total = Math.round(performance.now() - startTime);
      stats.seQueryCount = allPromises.length;
      _lastSearchStats = stats;
      renderLatexResults(allItems, quota);
      renderSearchAnalytics(stats);
      refreshHistoryUI();
      lazyTypeset();
    }

    // ════════════════════════════════════════════════
    // PHASE 2: REINFORCE — Extract question IDs found so far,
    // fetch full data for any we haven't enriched yet, plus
    // run additional targeted queries based on what we found
    // ════════════════════════════════════════════════
    updatePhase(2, 'Reinforce');
    showStatus(`🔄 Phase 2/${TOTAL_PHASES} — Reinforcing with ${allItems.length} results…`);

    const phase2Promises = [];

    // Collect all unique question IDs we found
    const foundIds = [...new Set(allItems.map(i => i.question_id).filter(Boolean))];

    // Fetch full question data for IDs we found (ensures we have complete info)
    if (foundIds.length > 0) {
      // Batch fetch in groups of 30
      for (let i = 0; i < foundIds.length; i += 30) {
        const batch = foundIds.slice(i, i + 30);
        phase2Promises.push(directQuestionFetch(batch));
      }
    }

    // SE page 2-3 for top 5 queries if has_more
    if (anyHasMore) {
      for (const entry of seQueries.slice(0, 5)) {
        phase2Promises.push(buildSEPromise({ ...entry, sePage: 2 }));
        phase2Promises.push(buildSEPromise({ ...entry, sePage: 3 }));
      }
    }

    // Additional Google with broader terms
    if (tex) {
      const readable = latexToReadable(tex);
      if (readable.length > 5) {
        const broadQueries = [
          'solve ' + readable,
          'prove ' + readable,
          'closed form ' + readable,
        ];
        for (const bq of broadQueries) {
          phase2Promises.push(
            fetchGoogleForLatex(bq)
              .then(items => ({ engine: 'google', data: items && items.length ? { items } : null }))
              .catch(() => ({ engine: 'google', data: null }))
          );
        }
      }
    }

    if (phase2Promises.length > 0) {
      const phase2Results = await Promise.all(phase2Promises);
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      mergeWaveResults(phase2Results);
      stats.waves = 2;
    }

    // Re-rank with all results
    if (tex && allItems.length > 0) {
      showStatus(`🔄 Phase 2 — Re-ranking ${allItems.length} results…`);
      allItems = await enrichAndRank(tex, allItems, thisId);
      if (thisId !== _latexSearchId) { stopTimer(); return; }
    }

    stats.timing.total = Math.round(performance.now() - startTime);
    stats.seQueryCount = allPromises.length + phase2Promises.length;
    _lastSearchStats = stats;
    renderLatexResults(allItems, quota);
    renderSearchAnalytics(stats);
    refreshHistoryUI();
    lazyTypeset();

    // ════════════════════════════════════════════════
    // PHASE 3: SWEEP — Final targeted queries for anything missed
    // Try integral-specific rewrites and aggressive notation variants
    // ════════════════════════════════════════════════
    updatePhase(3, 'Final sweep');
    showStatus(`🏁 Phase 3/${TOTAL_PHASES} — Final sweep (${allItems.length} results)…`);

    const phase3Promises = [];

    if (tex) {
      // Integral rewrites
      if (typeof advancedIntegralRewrites === 'function') {
        const intRewrites = advancedIntegralRewrites(tex);
        for (const rw of intRewrites.slice(0, 8)) {
          if (/\\/.test(rw) && rw.length >= 8) {
            phase3Promises.push(buildSEPromise({ type: 'integral-rewrite', q: rw }));
          } else if (rw.length > 8) {
            phase3Promises.push(buildSEPromise({ type: 'method-query', q: rw }));
          }
        }
        // AZ with rewrites
        const azRewrites = intRewrites.filter(r => r.startsWith('\\') && r.length > 10);
        for (const azR of azRewrites.slice(0, 2)) {
          phase3Promises.push(
            searchApproachZeroMultiPage(azR, 2)
              .then(data => ({ engine: 'approach-zero', data }))
          );
        }
      }

      // Deep aggressive rewrites
      if (typeof deepAggressiveRewrites === 'function') {
        const aggrRewrites = deepAggressiveRewrites(tex);
        for (const rw of aggrRewrites.slice(0, 8)) {
          if (/\\/.test(rw) && rw.length >= 8) {
            phase3Promises.push(buildSEPromise({ type: 'aggressive-rewrite', q: rw }));
          }
        }
      }
    }

    if (phase3Promises.length > 0) {
      const phase3Results = await Promise.all(phase3Promises);
      if (thisId !== _latexSearchId) { stopTimer(); return; }
      mergeWaveResults(phase3Results);
      stats.waves = 3;
    }

    // ════════════════════ FINAL DISPLAY ════════════════════
    if (!allItems.length && rateLimited) {
      throw new Error('API rate limit reached. Please wait or add an SE API key in config.js.');
    }
    if (!allItems.length) {
      throw new Error('No results found after exhaustive blitz search. Try different LaTeX or keywords.');
    }

    // Final rank
    if (tex && allItems.length > 0) {
      allItems = await enrichAndRank(tex, allItems, thisId);
      if (thisId !== _latexSearchId) { stopTimer(); return; }
    }

    stats.timing.total = Math.round(performance.now() - startTime);
    stats.totalResults = allItems.length;
    State.hasMore = anyHasMore;
    _lastSearchStats = stats;

    renderLatexResults(allItems, quota);
    renderSearchAnalytics(stats);
    refreshHistoryUI();
    lazyTypeset();

    stopTimer();
    showStatus(`✅ Blitz search complete — ${allItems.length} results from ${Object.keys(stats.sources).length} sources in ${Math.round((performance.now() - startTime)/1000)}s`);

  } catch (err) {
    stopTimer();
    if (thisId !== _latexSearchId) return;
    if (err.name === 'AbortError') showError('Request timed out. Try again.');
    else showError(err.message);
  }
}
