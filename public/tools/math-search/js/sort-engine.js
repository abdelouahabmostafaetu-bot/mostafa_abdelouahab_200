/* ================================================================
   sort-engine.js — Advanced sorting & filtering for search results
   Provides 10+ sorting strategies beyond basic relevance/votes.
   ================================================================ */

const SortEngine = (function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     SORTING STRATEGIES
     ═══════════════════════════════════════════════════════════════ */

  const STRATEGIES = {
    relevance: {
      label: 'Relevance',
      icon: '🎯',
      desc: 'Default multi-signal ranking',
      fn: (a, b) => (b._relevanceScore || 0) - (a._relevanceScore || 0)
    },
    votes: {
      label: 'Most Votes',
      icon: '⬆',
      desc: 'Highest community score',
      fn: (a, b) => (b.score || 0) - (a.score || 0)
    },
    newest: {
      label: 'Newest',
      icon: '🕐',
      desc: 'Most recently asked',
      fn: (a, b) => (b.creation_date || 0) - (a.creation_date || 0)
    },
    oldest: {
      label: 'Oldest',
      icon: '📜',
      desc: 'Classic questions first',
      fn: (a, b) => (a.creation_date || 0) - (b.creation_date || 0)
    },
    activity: {
      label: 'Recent Activity',
      icon: '🔄',
      desc: 'Most recently updated',
      fn: (a, b) => (b.last_activity_date || 0) - (a.last_activity_date || 0)
    },
    answers: {
      label: 'Most Answers',
      icon: '💬',
      desc: 'Questions with most answers',
      fn: (a, b) => (b.answer_count || 0) - (a.answer_count || 0)
    },
    unanswered: {
      label: 'Unanswered First',
      icon: '❓',
      desc: 'Questions needing answers',
      fn: (a, b) => {
        const aUn = (a.answer_count || 0) === 0 ? 1 : 0;
        const bUn = (b.answer_count || 0) === 0 ? 1 : 0;
        if (aUn !== bUn) return bUn - aUn;
        return (b._relevanceScore || 0) - (a._relevanceScore || 0);
      }
    },
    accepted: {
      label: 'Has Accepted',
      icon: '✅',
      desc: 'Questions with accepted answers first',
      fn: (a, b) => {
        const aAcc = a.accepted_answer_id ? 1 : 0;
        const bAcc = b.accepted_answer_id ? 1 : 0;
        if (aAcc !== bAcc) return bAcc - aAcc;
        return (b.score || 0) - (a.score || 0);
      }
    },
    hot: {
      label: 'Hot Score',
      icon: '🔥',
      desc: 'Weighted by recency + engagement',
      fn: (a, b) => computeHotScore(b) - computeHotScore(a)
    },
    quality: {
      label: 'Quality Score',
      icon: '⭐',
      desc: 'Composite quality metric',
      fn: (a, b) => computeQualityScore(b) - computeQualityScore(a)
    },
    controversy: {
      label: 'Controversial',
      icon: '⚡',
      desc: 'Most debated (many answers, mixed votes)',
      fn: (a, b) => computeControversyScore(b) - computeControversyScore(a)
    },
    formulaDensity: {
      label: 'Formula Rich',
      icon: 'Σ',
      desc: 'Most LaTeX-dense content',
      fn: (a, b) => estimateFormulaDensity(b) - estimateFormulaDensity(a)
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     SCORING FUNCTIONS
     ═══════════════════════════════════════════════════════════════ */

  function computeHotScore(item) {
    const age = (Date.now() / 1000 - (item.creation_date || 0)) / 3600; // hours
    const votes = Math.max(item.score || 0, 1);
    const answers = item.answer_count || 0;
    const views = item.view_count || 0;
    // Reddit-inspired hot score
    const order = Math.log10(Math.max(Math.abs(votes) * 10 + answers * 5 + views * 0.1, 1));
    const sign = votes > 0 ? 1 : votes < 0 ? -1 : 0;
    const seconds = (item.creation_date || 0) - 1134028003; // epoch offset
    return sign * order + seconds / 45000;
  }

  function computeQualityScore(item) {
    let score = 0;
    // Votes (log scale to not over-weight viral questions)
    score += Math.log2(Math.max(item.score || 0, 1) + 1) * 20;
    // Has accepted answer
    if (item.accepted_answer_id) score += 25;
    // Answer count (diminishing returns)
    score += Math.min(item.answer_count || 0, 10) * 5;
    // View count (log scale)
    score += Math.log10(Math.max(item.view_count || 0, 1)) * 8;
    // Tags bonus (more tags = more specific)
    score += Math.min((item.tags || []).length, 5) * 2;
    // Penalty for closed/duplicate
    if (item.closed_reason) score -= 15;
    // Relevance bonus
    score += (item._relevanceScore || 0) * 0.3;
    return score;
  }

  function computeControversyScore(item) {
    const answers = item.answer_count || 0;
    const votes = Math.abs(item.score || 0);
    // Controversial = many answers but moderate votes
    if (answers <= 1) return 0;
    return answers * 10 - votes * 2 + Math.min(item.view_count || 0, 5000) * 0.01;
  }

  function estimateFormulaDensity(item) {
    const body = item.body || item.excerpt || '';
    const latexMatches = body.match(/\$[^$]+\$|\\\(.*?\\\)|\\\[.*?\\\]/g);
    return latexMatches ? latexMatches.length : 0;
  }

  /* ═══════════════════════════════════════════════════════════════
     FILTERING
     ═══════════════════════════════════════════════════════════════ */

  function filterResults(results, filters) {
    let filtered = [...results];

    // Min votes
    if (filters.minVotes != null) {
      filtered = filtered.filter(r => (r.score || 0) >= filters.minVotes);
    }

    // Has accepted answer
    if (filters.hasAccepted) {
      filtered = filtered.filter(r => !!r.accepted_answer_id);
    }

    // Answered/Unanswered
    if (filters.answeredStatus === 'answered') {
      filtered = filtered.filter(r => (r.answer_count || 0) > 0);
    } else if (filters.answeredStatus === 'unanswered') {
      filtered = filtered.filter(r => (r.answer_count || 0) === 0);
    }

    // Date range
    if (filters.fromDate) {
      const ts = new Date(filters.fromDate).getTime() / 1000;
      filtered = filtered.filter(r => (r.creation_date || 0) >= ts);
    }
    if (filters.toDate) {
      const ts = new Date(filters.toDate).getTime() / 1000;
      filtered = filtered.filter(r => (r.creation_date || 0) <= ts);
    }

    // Tags filter
    if (filters.requiredTags && filters.requiredTags.length > 0) {
      filtered = filtered.filter(r => {
        const tags = r.tags || [];
        return filters.requiredTags.some(t => tags.includes(t));
      });
    }

    // Exclude tags
    if (filters.excludeTags && filters.excludeTags.length > 0) {
      filtered = filtered.filter(r => {
        const tags = r.tags || [];
        return !filters.excludeTags.some(t => tags.includes(t));
      });
    }

    // Min answers
    if (filters.minAnswers != null) {
      filtered = filtered.filter(r => (r.answer_count || 0) >= filters.minAnswers);
    }

    return filtered;
  }

  /* ═══════════════════════════════════════════════════════════════
     SORT + FILTER PIPELINE
     ═══════════════════════════════════════════════════════════════ */

  function sortResults(results, strategyKey) {
    const strategy = STRATEGIES[strategyKey];
    if (!strategy) return results;
    return [...results].sort(strategy.fn);
  }

  function sortAndFilter(results, strategyKey, filters) {
    let processed = filters ? filterResults(results, filters) : [...results];
    processed = sortResults(processed, strategyKey);
    return processed;
  }

  function getStrategies() {
    return Object.entries(STRATEGIES).map(([key, val]) => ({
      key,
      label: val.label,
      icon: val.icon,
      desc: val.desc
    }));
  }

  /* ═══════════════════════════════════════════════════════════════
     GROUP BY (cluster results)
     ═══════════════════════════════════════════════════════════════ */

  function groupByTag(results) {
    const groups = {};
    results.forEach(r => {
      const primaryTag = (r.tags || ['misc'])[0];
      if (!groups[primaryTag]) groups[primaryTag] = [];
      groups[primaryTag].push(r);
    });
    // Sort groups by count descending
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([tag, items]) => ({ tag, items, count: items.length }));
  }

  function groupBySource(results) {
    const groups = {};
    results.forEach(r => {
      const source = r._source || 'stackexchange';
      if (!groups[source]) groups[source] = [];
      groups[source].push(r);
    });
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([source, items]) => ({ source, items, count: items.length }));
  }

  return {
    sortResults,
    filterResults,
    sortAndFilter,
    getStrategies,
    groupByTag,
    groupBySource,
    computeHotScore,
    computeQualityScore
  };
})();
