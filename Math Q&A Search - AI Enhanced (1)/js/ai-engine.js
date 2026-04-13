/* ================================================================
   ai-engine.js — AI-powered features via Claude Opus 4.6 backend
   Handles: summarization, quality checking, suggestions, formula
   explanation, and refresh analysis.
   ================================================================ */

const AIEngine = (function () {
  'use strict';

  const isEmbeddedInNextSite =
    window.location.pathname === '/search-app' ||
    window.location.pathname === '/search-app/' ||
    window.location.pathname.startsWith('/search-app/');

  const API = isEmbeddedInNextSite ? '/port/8000' : 'http://localhost:8000';

  let _enabled = true;  // User can toggle AI features
  let _busy = false;

  /* ── Helpers ── */
  async function post(endpoint, body) {
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`AI API error: ${res.status}`);
    return res.json();
  }

  async function healthCheck() {
    try {
      const res = await fetch(`${API}/api/health`);
      const data = await res.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }

  /* ── Summarize a Q&A thread ── */
  async function summarize(questionTitle, questionBody, answers, query) {
    if (!_enabled) return null;
    try {
      return await post('/api/ai/summarize', {
        question_title: questionTitle,
        question_body: questionBody,
        answers: answers.map(a => ({
          body: a.body || '',
          score: a.score || 0,
          is_accepted: a.is_accepted || false
        })),
        query
      });
    } catch (e) {
      console.warn('AI summarize failed:', e);
      return null;
    }
  }

  /* ── Quality check search results ── */
  async function qualityCheck(results, query) {
    if (!_enabled || results.length === 0) return null;
    try {
      return await post('/api/ai/quality-check', {
        results: results.slice(0, 10).map(r => ({
          title: r.title || '',
          snippet: r.excerpt || r.body?.substring(0, 300) || '',
          score: r.score || 0,
          answer_count: r.answer_count || 0,
          tags: r.tags || []
        })),
        query
      });
    } catch (e) {
      console.warn('AI quality check failed:', e);
      return null;
    }
  }

  /* ── Get AI-powered search suggestions ── */
  async function suggest(query, resultsCount, mode) {
    if (!_enabled) return null;
    try {
      return await post('/api/ai/suggest', {
        query,
        current_results_count: resultsCount,
        mode: mode || 'text'
      });
    } catch (e) {
      console.warn('AI suggest failed:', e);
      return null;
    }
  }

  /* ── Explain a LaTeX formula ── */
  async function explainFormula(latex, context) {
    if (!_enabled) return null;
    try {
      return await post('/api/ai/explain-formula', {
        latex,
        context: context || ''
      });
    } catch (e) {
      console.warn('AI explain failed:', e);
      return null;
    }
  }

  /* ── Refresh analysis ── */
  async function refreshAnalysis(query, existingTitles, mode) {
    if (!_enabled) return null;
    try {
      return await post('/api/ai/refresh-analysis', {
        query,
        existing_titles: existingTitles,
        mode: mode || 'text'
      });
    } catch (e) {
      console.warn('AI refresh failed:', e);
      return null;
    }
  }

  /* ── Toggle AI features ── */
  function setEnabled(val) { _enabled = !!val; }
  function isEnabled() { return _enabled; }
  function isBusy() { return _busy; }

  return {
    healthCheck,
    summarize,
    qualityCheck,
    suggest,
    explainFormula,
    refreshAnalysis,
    setEnabled,
    isEnabled,
    isBusy
  };
})();
