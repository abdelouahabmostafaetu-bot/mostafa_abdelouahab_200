#!/usr/bin/env python3
"""server.py — FastAPI backend for AI-powered math search features.
Uses Claude Opus 4.6 for answer summarization, quality checking, and query suggestions.
"""

import asyncio
import json
import time
from contextlib import asynccontextmanager

from anthropic import Anthropic
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

client = Anthropic()

# Simple in-memory cache for AI responses
ai_cache: dict[str, dict] = {}
CACHE_TTL = 300  # 5 minutes

@asynccontextmanager
async def lifespan(app):
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class SummarizeRequest(BaseModel):
    question_title: str
    question_body: str
    answers: list[dict]  # [{body, score, is_accepted}]
    query: str


class QualityCheckRequest(BaseModel):
    results: list[dict]  # [{title, snippet, score, answer_count, tags}]
    query: str


class SuggestRequest(BaseModel):
    query: str
    current_results_count: int = 0
    mode: str = "text"  # text or latex


class ExplainRequest(BaseModel):
    latex: str
    context: str = ""


class RefreshRequest(BaseModel):
    query: str
    existing_titles: list[str]
    mode: str = "text"


def get_cached(key: str):
    if key in ai_cache:
        entry = ai_cache[key]
        if time.time() - entry["ts"] < CACHE_TTL:
            return entry["data"]
        del ai_cache[key]
    return None


def set_cached(key: str, data):
    ai_cache[key] = {"ts": time.time(), "data": data}
    # Evict old entries if cache grows too large
    if len(ai_cache) > 200:
        oldest = sorted(ai_cache.items(), key=lambda x: x[1]["ts"])[:50]
        for k, _ in oldest:
            del ai_cache[k]


@app.get("/api/health")
def health():
    return {"status": "ok", "model": "claude_opus_4_6"}


@app.post("/api/ai/summarize")
async def summarize(req: SummarizeRequest):
    """Summarize a Q&A thread — extract the key mathematical insight."""
    cache_key = f"sum:{req.question_title[:80]}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    answers_text = ""
    for i, a in enumerate(req.answers[:5]):  # Limit to 5 answers
        status = " [ACCEPTED]" if a.get("is_accepted") else ""
        answers_text += f"\n--- Answer {i+1} (Score: {a.get('score', 0)}{status}) ---\n{a.get('body', '')[:2000]}\n"

    message = client.messages.create(
        model="claude_opus_4_6",
        max_tokens=800,
        messages=[{
            "role": "user",
            "content": f"""You are a mathematics expert. Summarize this Math StackExchange Q&A concisely.
Focus on: the core mathematical concept, the key solution approach, and any important formulas.
Use LaTeX notation (with $...$ for inline, $$...$$ for display).
Keep it under 200 words.

QUESTION: {req.question_title}
{req.question_body[:3000]}

ANSWERS:
{answers_text}

USER'S SEARCH QUERY: {req.query}

Provide a clear, concise mathematical summary focusing on what's most relevant to the search query."""
        }]
    )

    result = {
        "summary": message.content[0].text,
        "model": "claude_opus_4_6",
        "tokens_used": message.usage.input_tokens + message.usage.output_tokens
    }
    set_cached(cache_key, result)
    return result


@app.post("/api/ai/quality-check")
async def quality_check(req: QualityCheckRequest):
    """Analyze search results quality and suggest improvements."""
    cache_key = f"qc:{req.query[:60]}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    results_text = ""
    for i, r in enumerate(req.results[:10]):
        results_text += f"\n{i+1}. [{r.get('score', 0)} votes] {r.get('title', '')} — Tags: {', '.join(r.get('tags', []))}\n   Snippet: {r.get('snippet', '')[:200]}\n"

    message = client.messages.create(
        model="claude_opus_4_6",
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": f"""Analyze these math search results for the query: "{req.query}"

RESULTS:
{results_text}

Respond in JSON format:
{{
  "quality_score": 0-100,
  "assessment": "one sentence about result quality",
  "best_result_index": number (1-based),
  "best_result_reason": "why this is the best match",
  "missing_topics": ["topics the results don't cover well"],
  "refined_queries": ["2-3 better search queries to try"],
  "sort_recommendation": "relevance|votes|newest|activity — which sort would work best"
}}"""
        }]
    )

    try:
        text = message.content[0].text
        # Extract JSON from response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(text[start:end])
        else:
            result = {"quality_score": 50, "assessment": text[:200]}
    except (json.JSONDecodeError, IndexError):
        result = {"quality_score": 50, "assessment": message.content[0].text[:200]}

    result["model"] = "claude_opus_4_6"
    set_cached(cache_key, result)
    return result


@app.post("/api/ai/suggest")
async def suggest_queries(req: SuggestRequest):
    """Generate intelligent search suggestions based on current query."""
    cache_key = f"sug:{req.query[:60]}:{req.mode}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    mode_hint = "LaTeX formula search" if req.mode == "latex" else "text search"

    message = client.messages.create(
        model="claude_opus_4_6",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"""The user is searching a mathematics Q&A database using {mode_hint}.
Their query: "{req.query}"
They found {req.current_results_count} results.

Suggest 5 related mathematical queries they might want to try. Consider:
- Related theorems/concepts
- Alternative formulations
- Prerequisite or advanced topics
- Common follow-up questions

{"For LaTeX mode, include actual LaTeX formulas." if req.mode == "latex" else "Use natural language."}

Respond in JSON format:
{{
  "suggestions": [
    {{"query": "...", "reason": "brief explanation", "difficulty": "basic|intermediate|advanced"}}
  ]
}}"""
        }]
    )

    try:
        text = message.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(text[start:end])
        else:
            result = {"suggestions": []}
    except (json.JSONDecodeError, IndexError):
        result = {"suggestions": []}

    result["model"] = "claude_opus_4_6"
    set_cached(cache_key, result)
    return result


@app.post("/api/ai/explain-formula")
async def explain_formula(req: ExplainRequest):
    """Explain a LaTeX formula in plain language."""
    cache_key = f"expl:{req.latex[:80]}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    message = client.messages.create(
        model="claude_opus_4_6",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"""Explain this mathematical formula/expression in clear language:

$$
{req.latex}
$$

{"Context: " + req.context if req.context else ""}

Provide:
1. A plain English explanation (2-3 sentences)
2. What each symbol/variable represents
3. Where this formula typically appears (which branch of mathematics)
4. Any important special cases

Use LaTeX ($...$) when referencing specific parts of the formula. Be concise."""
        }]
    )

    result = {
        "explanation": message.content[0].text,
        "model": "claude_opus_4_6"
    }
    set_cached(cache_key, result)
    return result


@app.post("/api/ai/refresh-analysis")
async def refresh_analysis(req: RefreshRequest):
    """Analyze if results need refreshing and suggest new angles."""
    cache_key = f"ref:{req.query[:60]}:{len(req.existing_titles)}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    titles = "\n".join(f"- {t}" for t in req.existing_titles[:15])

    message = client.messages.create(
        model="claude_opus_4_6",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"""The user searched for: "{req.query}"
They already found these results:
{titles}

Analyze the coverage and suggest:
1. What mathematical angles are MISSING from these results?
2. 3 alternative search queries that would find different/complementary results
3. Which StackExchange tags would help narrow the search?

Respond in JSON:
{{
  "coverage_score": 0-100,
  "missing_angles": ["list of uncovered topics"],
  "alternative_queries": ["query1", "query2", "query3"],
  "recommended_tags": ["tag1", "tag2"],
  "tip": "one helpful search tip"
}}"""
        }]
    )

    try:
        text = message.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(text[start:end])
        else:
            result = {"coverage_score": 50, "tip": text[:200]}
    except (json.JSONDecodeError, IndexError):
        result = {"coverage_score": 50, "tip": message.content[0].text[:200]}

    result["model"] = "claude_opus_4_6"
    set_cached(cache_key, result)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
