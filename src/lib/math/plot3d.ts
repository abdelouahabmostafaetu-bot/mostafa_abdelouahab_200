/**
 * Tiny, dependency-free math compiler for two-variable expressions z = f(x, y).
 * Used by the interactive 3D surface plot. Mirrors the single-variable engine
 * in plot.ts but evaluates over (x, y). Pure functions, no external deps.
 */

export type RpnItem =
  | { t: 'num'; v: number }
  | { t: 'var'; v: 'x' | 'y' }
  | { t: 'op'; v: string }
  | { t: 'fn'; v: string };

export type CompiledSurface = { expr: string; rpn: RpnItem[] };

const FUNCS: Record<string, (a: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  exp: Math.exp,
  ln: Math.log,
  log: (a: number) => Math.log(a) / Math.LN10,
  log10: (a: number) => Math.log(a) / Math.LN10,
  log2: (a: number) => Math.log(a) / Math.LN2,
  abs: Math.abs,
  sign: Math.sign,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
};

const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

type Tok =
  | { t: 'num'; v: number }
  | { t: 'var'; v: 'x' | 'y' }
  | { t: 'op'; v: string }
  | { t: 'fn'; v: string }
  | { t: 'lp' }
  | { t: 'rp' };

function tokenize(src: string): Tok[] {
  const s = src.replace(/\s+/g, '');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[0-9.eE]/.test(s[j])) {
        if ((s[j] === 'e' || s[j] === 'E') && (s[j + 1] === '+' || s[j + 1] === '-')) j++;
        j++;
      }
      const num = Number(s.slice(i, j));
      if (!Number.isFinite(num)) throw new Error('bad number');
      out.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z0-9]/.test(s[j])) j++;
      const name = s.slice(i, j).toLowerCase();
      i = j;
      if (name === 'x' || name === 'y') out.push({ t: 'var', v: name });
      else if (name in CONSTS) out.push({ t: 'num', v: CONSTS[name] });
      else if (name in FUNCS) out.push({ t: 'fn', v: name });
      else throw new Error('unknown name: ' + name);
      continue;
    }
    if (ch === '(') {
      out.push({ t: 'lp' });
      i++;
      continue;
    }
    if (ch === ')') {
      out.push({ t: 'rp' });
      i++;
      continue;
    }
    if ('+-*/^'.indexOf(ch) >= 0) {
      out.push({ t: 'op', v: ch });
      i++;
      continue;
    }
    throw new Error('bad char: ' + ch);
  }
  return out;
}

// Insert implicit multiplication and turn leading +/- into (0 +/- ...).
function normalize(tokens: Tok[]): Tok[] {
  const out: Tok[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const prev = out[out.length - 1];
    if (tok.t === 'op' && (tok.v === '-' || tok.v === '+')) {
      const atStart = !prev || prev.t === 'op' || prev.t === 'lp';
      if (atStart) {
        out.push({ t: 'num', v: 0 });
        out.push({ t: 'op', v: tok.v });
        continue;
      }
    }
    if (prev && (prev.t === 'num' || prev.t === 'var' || prev.t === 'rp')) {
      if (tok.t === 'num' || tok.t === 'var' || tok.t === 'fn' || tok.t === 'lp') {
        out.push({ t: 'op', v: '*' });
      }
    }
    out.push(tok);
  }
  return out;
}

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
const RIGHT: Record<string, boolean> = { '^': true };

function toRPN(tokens: Tok[]): RpnItem[] {
  const output: RpnItem[] = [];
  const stack: Tok[] = [];
  for (const tok of tokens) {
    if (tok.t === 'num') {
      output.push({ t: 'num', v: tok.v });
    } else if (tok.t === 'var') {
      output.push({ t: 'var', v: tok.v });
    } else if (tok.t === 'fn') {
      stack.push(tok);
    } else if (tok.t === 'op') {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.t === 'fn') {
          output.push({ t: 'fn', v: top.v });
          stack.pop();
          continue;
        }
        if (top.t === 'op') {
          const p1 = PREC[tok.v];
          const p2 = PREC[top.v];
          if (p2 > p1 || (p2 === p1 && !RIGHT[tok.v])) {
            output.push({ t: 'op', v: top.v });
            stack.pop();
            continue;
          }
        }
        break;
      }
      stack.push(tok);
    } else if (tok.t === 'lp') {
      stack.push(tok);
    } else if (tok.t === 'rp') {
      while (stack.length && stack[stack.length - 1].t !== 'lp') {
        const top = stack.pop() as Tok;
        if (top.t === 'op') output.push({ t: 'op', v: top.v });
        else if (top.t === 'fn') output.push({ t: 'fn', v: top.v });
      }
      if (!stack.length) throw new Error('mismatched parentheses');
      stack.pop();
      const top2 = stack[stack.length - 1];
      if (top2 && top2.t === 'fn') {
        output.push({ t: 'fn', v: top2.v });
        stack.pop();
      }
    }
  }
  while (stack.length) {
    const top = stack.pop() as Tok;
    if (top.t === 'lp' || top.t === 'rp') throw new Error('mismatched parentheses');
    if (top.t === 'op') output.push({ t: 'op', v: top.v });
    else if (top.t === 'fn') output.push({ t: 'fn', v: top.v });
  }
  return output;
}

function evalRPN(rpn: RpnItem[], x: number, y: number): number {
  const st: number[] = [];
  for (const item of rpn) {
    if (item.t === 'num') {
      st.push(item.v);
    } else if (item.t === 'var') {
      st.push(item.v === 'x' ? x : y);
    } else if (item.t === 'fn') {
      const a = st.pop();
      if (a === undefined) return NaN;
      const fn = FUNCS[item.v];
      st.push(fn ? fn(a) : NaN);
    } else {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) return NaN;
      let r: number;
      switch (item.v) {
        case '+':
          r = a + b;
          break;
        case '-':
          r = a - b;
          break;
        case '*':
          r = a * b;
          break;
        case '/':
          r = a / b;
          break;
        case '^':
          r = Math.pow(a, b);
          break;
        default:
          r = NaN;
      }
      st.push(r);
    }
  }
  return st.length === 1 ? st[0] : NaN;
}

export function compileSurface(expr: string): CompiledSurface {
  let e = expr.trim();
  const eq = e.indexOf('=');
  if (eq >= 0) {
    const lhs = e.slice(0, eq).replace(/\s+/g, '').toLowerCase();
    if (lhs === 'z' || lhs === 'f' || lhs === 'f(x,y)') {
      e = e.slice(eq + 1).trim();
    }
  }
  const rpn = toRPN(normalize(tokenize(e)));
  if (!rpn.length) throw new Error('empty expression');
  return { expr: e, rpn };
}

export function evalSurface(c: CompiledSurface, x: number, y: number): number {
  return evalRPN(c.rpn, x, y);
}
