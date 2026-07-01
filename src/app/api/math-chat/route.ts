import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { MATH_AI_SYSTEM_PROMPT } from '@/lib/prompts/math-ai-prompt';
import { PROOF_TECHNIQUES } from '@/lib/prompts/proof-techniques';
import { PROBLEM_SOLVING_TECHNIQUES } from '@/lib/prompts/problem-solving-techniques';
import {
  runChat,
  streamChat,
  getModelById,
  getApiKey,
  type ProviderMessage,
  type ChatImage,
} from '@/lib/ai/providers';
import {
  DEFAULT_MODEL_ID,
  PRIMARY_VISION_MODEL_ID,
  VISION_FALLBACK_MODEL_ID,
} from '@/lib/ai/models';
import { checkDailyLimit } from '@/lib/ai/daily-limit';
import { queryWolfram } from '@/lib/ai/wolfram';
import { searchMathDataset } from '@/lib/ai/math-dataset';
import { recognizeImage } from '@/lib/ai/ocr';
import {
  searchMathStackExchange,
  searchArxiv,
  searchSemanticScholar,
  searchOpenAlex,
  searchWeb,
  type KnowledgeResult,
  type KnowledgeSource,
} from '@/lib/ai/knowledge';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const DAILY_LIMIT = 50;
const MAX_IMAGE_CHARS = 9_000_000;
const EMPTY: KnowledgeResult = { context: '', sources: [] };

const SYSTEM_BASE =
  MATH_AI_SYSTEM_PROMPT + '\n\n' + PROOF_TECHNIQUES + '\n\n' + PROBLEM_SOLVING_TECHNIQUES;

// Deep mode runs this as a strict, INDEPENDENT referee pass over the first
// answer. The point is a genuine second opinion (re-derive by a different
// method), not a re-read of the same reasoning.
const VERIFY_INSTRUCTION =
  'You are now acting as a strict, independent referee checking the solution ' +
  'above for errors. Work rigorously: (1) re-derive the key steps INDEPENDENTLY, ' +
  'ideally by a DIFFERENT method than the one used above (for example substitution ' +
  'vs. formula, algebraic vs. geometric, or direct vs. a limiting case), and confirm ' +
  'the approaches agree; (2) substitute the final result back into the original ' +
  'problem and check it satisfies every condition; (3) check edge cases, domains, ' +
  'signs, units, and orders of magnitude — for probabilities confirm values lie in ' +
  '[0,1], for counts a sensible non-negative integer, and for series or integrals ' +
  'confirm convergence; (4) confirm every theorem you used actually had its ' +
  'hypotheses satisfied, and look for a counterexample to each general claim. If ' +
  'everything is correct, return the SAME full solution, cleanly formatted, and ' +
  'append a final line exactly: Verified ✓. If you find any error, silently correct ' +
  'it and return the complete corrected solution ending with the verified final ' +
  'answer. Keep all mathematics in LaTeX. Do not mention that you are verifying or ' +
  'that anything was changed — just return the polished, correct solution.';

function parseDataUrl(dataUrl: string): ChatImage | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], dataBase64: match[2], dataUrl };
}

function settledKnowledge(r: PromiseSettledResult<KnowledgeResult>): KnowledgeResult {
  return r.status === 'fulfilled' ? r.value : EMPTY;
}

function wantsResearch(q: string): boolean {
  return /\b(paper|papers|research|arxiv|preprint|reference|references|citation|cite|journal|publication|survey|literature|state of the art|open problem|who proved|history of|latest|recent)\b/i.test(
    q,
  );
}

function wantsComputation(q: string): boolean {
  return (
    /\b(solve|simplify|factor|expand|integrate|integral|differentiate|derivative|evaluate|compute|calculate|roots?|limit|determinant|eigen|matrix|sum|product)\b/i.test(
      q,
    ) || /[=]/.test(q)
  );
}

export async function POST(req: NextRequest) {
  await auth.protect();
  const { userId } = await auth();
  const identity = userId || 'anonymous';

  const limited = checkDailyLimit(identity, 'math-chat', DAILY_LIMIT);
  if (limited) return limited;

  let body: { messages?: ChatMessage[]; model?: string; image?: string; deep?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (rawMessages.length === 0) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
  }

  const messages: ProviderMessage[] = rawMessages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || ''),
  }));

  let image: ChatImage | undefined;
  if (typeof body.image === 'string' && body.image) {
    if (body.image.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ error: 'Image is too large. Please use one under 5 MB.' }, { status: 400 });
    }
    const parsed = parseDataUrl(body.image);
    if (!parsed) {
      return NextResponse.json({ error: 'Could not read the attached image.' }, { status: 400 });
    }
    image = parsed;
  }

  // The model the user picked (used for text and for OCR-recognized images).
  let requestedModelId = typeof body.model === 'string' && body.model ? body.model : DEFAULT_MODEL_ID;
  if (!getModelById(requestedModelId)) requestedModelId = DEFAULT_MODEL_ID;

  const deep = body.deep === true;

  try {
    let systemPrompt = SYSTEM_BASE;
    let sources: KnowledgeSource[] = [];

    if (!image) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const question = lastUser ? lastUser.content.slice(0, 600) : '';

      if (question) {
        const research = deep || wantsResearch(question);
        const computeOnly = !research && wantsComputation(question);
        const skip = (): Promise<KnowledgeResult> => Promise.resolve(EMPTY);

        const [wolframRes, seRes, dsRes, axRes, s2Res, oaRes, webRes] = await Promise.allSettled([
          queryWolfram(question),
          computeOnly ? skip() : searchMathStackExchange(question),
          research ? skip() : searchMathDataset(question),
          research ? searchArxiv(question) : skip(),
          research ? searchSemanticScholar(question) : skip(),
          research ? searchOpenAlex(question) : skip(),
          research ? searchWeb(question) : skip(),
        ]);

        const parts: string[] = [];

        if (wolframRes.status === 'fulfilled' && wolframRes.value) {
          parts.push(
            'WOLFRAM|ALPHA VERIFIED COMPUTATION (trust these numeric/symbolic results):\n' +
              wolframRes.value,
          );
        }

        const se = settledKnowledge(seRes);
        if (se.context) {
          parts.push('MATH STACKEXCHANGE DISCUSSIONS:\n' + se.context);
          sources = sources.concat(se.sources);
        }

        const ds = settledKnowledge(dsRes);
        if (ds.context) {
          parts.push(
            'SOLVED MATH EXAMPLES FROM A CURATED DATASET (use as grounding to guide your method; adapt and explain in your own words, never copy verbatim):\n' +
              ds.context,
          );
          sources = sources.concat(ds.sources);
        }

        const ax = settledKnowledge(axRes);
        if (ax.context) {
          parts.push('ARXIV MATH PAPERS:\n' + ax.context);
          sources = sources.concat(ax.sources);
        }

        const s2 = settledKnowledge(s2Res);
        if (s2.context) {
          parts.push('SEMANTIC SCHOLAR PAPERS:\n' + s2.context);
          sources = sources.concat(s2.sources);
        }

        const oa = settledKnowledge(oaRes);
        if (oa.context) {
          parts.push('OPENALEX PAPERS:\n' + oa.context);
          sources = sources.concat(oa.sources);
        }

        const web = settledKnowledge(webRes);
        if (web.context) {
          parts.push('LIVE WEB SEARCH RESULTS:\n' + web.context);
          sources = sources.concat(web.sources);
        }

        if (parts.length > 0) {
          systemPrompt =
            SYSTEM_BASE +
            '\n\n==================================================================\n' +
            'SECTION 15 — LIVE REFERENCE MATERIAL (retrieved for THIS question)\n' +
            '==================================================================\n' +
            'The app retrieved the material below to help you answer more accurately.\n' +
            '- Trust the Wolfram|Alpha computation for the numeric/symbolic result, but still\n' +
            '  show the full human reasoning and explanation.\n' +
            '- When you use a discussion, paper, or web page, cite it inline as a Markdown\n' +
            '  link, for example [source](URL).\n' +
            '- If a reference is irrelevant, simply ignore it. Never invent references.\n\n' +
            parts.join('\n\n');
        }
      }
    }

    // Reading uploaded images. Order of preference:
    //   1. Unlimited-OCR on Modal (if configured) -> solve text with chosen model.
    //   2. Free Qwen2.5-VL vision model reads AND answers the image.
    //   3. Gemini vision as an automatic backup (handled in the catch below).
    let solveModelId = requestedModelId;
    let visionImage: ChatImage | undefined;
    if (image) {
      const ocrText = await recognizeImage(image);
      if (ocrText) {
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'user') {
            messages[i] = {
              ...messages[i],
              content:
                messages[i].content +
                '\n\n[High-accuracy OCR of the attached image — treat this as the exact ' +
                'problem statement, LaTeX preserved; the photo may be handwritten or low ' +
                'quality, so prefer this text when it is clearer than the picture]:\n' +
                ocrText,
            };
            break;
          }
        }
      } else {
        // No OCR -> let a free vision model read the image directly.
        solveModelId = PRIMARY_VISION_MODEL_ID;
        visionImage = image;
      }
    }

    // Fail fast with a friendly message if the chosen model has no key.
    const chosenModel = getModelById(solveModelId);
    if (chosenModel && !getApiKey(chosenModel)) {
      return NextResponse.json(
        {
          error:
            'The model "' +
            chosenModel.label +
            '" is not set up yet. Add ' +
            chosenModel.envKey +
            ' in your Vercel environment variables, then redeploy.',
        },
        { status: 500 },
      );
    }

    // Non-streaming path: image vision (with backup) or Deep mode (2nd verify pass).
    if (visionImage || deep) {
      let reply: string;
      try {
        reply = await runChat(solveModelId, systemPrompt, messages, visionImage);
      } catch (visionErr) {
        // If the free vision model is unavailable, fall back to Gemini vision.
        if (visionImage && solveModelId !== VISION_FALLBACK_MODEL_ID) {
          solveModelId = VISION_FALLBACK_MODEL_ID;
          reply = await runChat(solveModelId, systemPrompt, messages, visionImage);
        } else {
          throw visionErr;
        }
      }

      if (deep) {
        const verifyMessages: ProviderMessage[] = [
          ...messages,
          { role: 'assistant', content: reply },
          { role: 'user', content: VERIFY_INSTRUCTION },
        ];
        try {
          // Pass the image too, so an image problem is re-checked WITH the
          // picture visible instead of verifying blind.
          const verified = await runChat(solveModelId, systemPrompt, verifyMessages, visionImage);
          if (verified && verified.trim()) reply = verified;
        } catch {
          // keep the first answer if verification fails
        }
      }

      return NextResponse.json({ reply, sources });
    }

    // Streaming path: normal text questions AND OCR-recognized images.
    const encoder = new TextEncoder();
    const streamModelId = solveModelId;
    const streamSystem = systemPrompt;
    const streamMessages = messages;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of streamChat(streamModelId, streamSystem, streamMessages)) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Streaming error';
          controller.enqueue(encoder.encode('\n\n[Error: ' + msg + ']'));
        } finally {
          controller.close();
        }
      },
    });

    const headers = new Headers();
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('x-stream', '1');
    headers.set(
      'x-sources',
      Buffer.from(encodeURIComponent(JSON.stringify(sources))).toString('base64'),
    );
    return new Response(stream, { headers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
