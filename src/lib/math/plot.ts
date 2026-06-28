// Dependency-free single-variable math expression evaluator + SVG plotter.
// Used to draw real function graphs from `plot` code blocks in chat answers.
// No external packages, no API keys.

type Token = { type: string; value: string };

const FUNCS: Record<string, (n: number) => number> = {
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
  log: (n: number) => Math.log10(n),
  log10: (n: number) => Math.log10(n),
  log2: (n: number) => Math.log2(n),
  abs: Math.abs,
  sign: Math.sign,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
};

const CONSTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t') {
      i++;
      continue;
    }
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i + 1;
      while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) j++;
      tokens.push({ type: 'num', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
      let j = i + 1;
      while (j < src.length && /[a-zA-Z0-9]/.test(src[j])) j++;
      const name = src.slice(i, j).toLowerCase();
      if (FUNCS[name]) tokens.push({ type: 'func', value: name });
      else if (CONSTS[name] !== undefined) tokens.push({ type: 'const', value: name });
      else if (name === 'x' || name === 'y') tokens.push({ type: 'var', value: 'x' });
      else throw new Error('Unknown name: ' + name);
      i = j;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(' || ch === '[') {
      tokens.push({ type: 'lp', value: '(' });
      i++;
      continue;
    }
    if (ch === ')' || ch === ']') {
      tokens.push({ type: 'rp', value: ')' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ',' });
      i++;
      continue;
    }
    throw new Error('Unexpected character: ' + ch);
  }
  return tokens;
}

function insertImplicitMul(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const cur = tokens[k];
    out.push(cur);
    const next = tokens[k + 1];
    if (!next) continue;
    const leftSide =
      cur.type === 'num' || cur.type === 'var' || cur.type === 'const' || cur.type === 'rp';
    const rightSide =
      next.type === 'num' ||
      next.type === 'var' ||
      next.type === 'const' ||
      next.type === 'func' ||
      next.type === 'lp';
    if (leftSide && rightSide) out.push({ type: 'op', value: '*' });
  }
  return out;
}

function toRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const ops: Token[] = [];
  const prec: Record<string, number> = { 'u-': 4, '^': 3, '*': 2, '/': 2, '+': 1, '-': 1 };
  const rightAssoc: Record<string, boolean> = { 'u-': true, '^': true };
  let prev: Token | null = null;

  for (let k = 0; k < tokens.length; k++) {
    const tk = tokens[k];
    if (tk.type === 'num' || tk.type === 'var' || tk.type === 'const') {
      output.push(tk);
      prev = tk;
      continue;
    }
    if (tk.type === 'func') {
      ops.push(tk);
      prev = tk;
      continue;
    }
    if (tk.type === 'comma') {
      while (ops.length && ops[ops.length - 1].type !== 'lp') output.push(ops.pop() as Token);
      prev = tk;
      continue;
    }
    if (tk.type === 'op') {
      let opval = tk.value;
      const unary =
        opval === '-' &&
        (prev === null || prev.type === 'op' || prev.type === 'lp' || prev.type === 'comma');
      if (unary) opval = 'u-';
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.type !== 'op') break;
        const better = rightAssoc[opval]
          ? prec[opval] < prec[top.value]
          : prec[opval] <= prec[top.value];
        if (better) output.push(ops.pop() as Token);
        else break;
      }
      const pushed: Token = { type: 'op', value: opval };
      ops.push(pushed);
      prev = pushed;
      continue;
    }
    if (tk.type === 'lp') {
      ops.push(tk);
      prev = tk;
      continue;
    }
    if (tk.type === 'rp') {
      while (ops.length && ops[ops.length - 1].type !== 'lp') output.push(ops.pop() as Token);
      if (!ops.length) throw new Error('Mismatched parentheses');
      ops.pop();
      if (ops.length && ops[ops.length - 1].type === 'func') output.push(ops.pop() as Token);
      prev = tk;
      continue;
    }
  }
  while (ops.length) {
    const top = ops.pop() as Token;
    if (top.type === 'lp') throw new Error('Mismatched parentheses');
    output.push(top);
  }
  return output;
}

function evalRPN(rpn: Token[], x: number): number {
  const st: number[] = [];
  for (let k = 0; k < rpn.length; k++) {
    const tk = rpn[k];
    if (tk.type === 'num') st.push(parseFloat(tk.value));
    else if (tk.type === 'var') st.push(x);
    else if (tk.type === 'const') st.push(CONSTS[tk.value]);
    else if (tk.type === 'func') {
      const a = st.pop() as number;
      st.push(FUNCS[tk.value](a));
    } else if (tk.type === 'op') {
      if (tk.value === 'u-') {
        const a = st.pop() as number;
        st.push(-a);
      } else {
        const b = st.pop() as number;
        const a = st.pop() as number;
        if (tk.value === '+') st.push(a + b);
        else if (tk.value === '-') st.push(a - b);
        else if (tk.value === '*') st.push(a * b);
        else if (tk.value === '/') st.push(a / b);
        else if (tk.value === '^') st.push(Math.pow(a, b));
      }
    }
  }
  return st.length ? st[st.length - 1] : NaN;
}

type Compiled = { expr: string; rpn: Token[] };

export function compileExpr(expr: string): Compiled {
  const cleaned = expr
    .replace(/^\s*y\s*=\s*/i, '')
    .replace(/^\s*f\s*\(\s*x\s*\)\s*=\s*/i, '')
    .trim();
  const rpn = toRPN(insertImplicitMul(tokenize(cleaned)));
  return { expr: cleaned, rpn };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n: number): string {
  const r = Math.round(n * 100) / 100;
  if (Object.is(r, -0)) return '0';
  return String(r);
}

function niceStep(rough: number): number {
  if (!isFinite(rough) || rough <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / pow;
  let step = 10;
  if (n < 1.5) step = 1;
  else if (n < 3) step = 2;
  else if (n < 7) step = 5;
  return step * pow;
}

const PALETTE = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#0ea5e9', '#a855f7'];
let clipCounter = 0;

function errorBox(message: string): string {
  return (
    '<div class="my-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-2 text-[13px] text-[var(--color-text-secondary)]">' +
    escapeXml(message) +
    '</div>'
  );
}

export function renderPlotSvg(
  expressions: string[],
  opts?: { xMin?: number; xMax?: number },
): string {
  const xMin = opts && typeof opts.xMin === 'number' ? opts.xMin : -10;
  const xMax = opts && typeof opts.xMax === 'number' ? opts.xMax : 10;
  if (!(xMax > xMin)) return errorBox('Invalid graph range.');

  const compiled: Compiled[] = [];
  for (let e = 0; e < expressions.length; e++) {
    try {
      compiled.push(compileExpr(expressions[e]));
    } catch {
      return errorBox('Could not read function: ' + expressions[e]);
    }
  }
  if (!compiled.length) return errorBox('Nothing to plot.');

  const W = 660;
  const H = 380;
  const pad = 36;
  const N = 600;

  const series: Array<Array<{ x: number; y: number }>> = [];
  const allY: number[] = [];
  for (let s = 0; s < compiled.length; s++) {
    const pts: Array<{ x: number; y: number }> = [];
    for (let p = 0; p <= N; p++) {
      const x = xMin + ((xMax - xMin) * p) / N;
      let y = NaN;
      try {
        y = evalRPN(compiled[s].rpn, x);
      } catch {
        y = NaN;
      }
      pts.push({ x, y });
      if (isFinite(y) && Math.abs(y) < 1e6) allY.push(y);
    }
    series.push(pts);
  }
  if (!allY.length) return errorBox('This function has no real values to plot here.');

  allY.sort((a, b) => a - b);
  let yMin = allY[Math.floor(allY.length * 0.02)];
  let yMax = allY[Math.floor(allY.length * 0.98)];
  if (!(yMax > yMin)) {
    yMin -= 1;
    yMax += 1;
  }
  const padY = (yMax - yMin) * 0.12;
  yMin -= padY;
  yMax += padY;

  const mapX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const mapY = (y: number) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad);
  const r1 = (v: number) => Math.round(v * 10) / 10;

  const clipId = 'plotclip' + clipCounter++;
  const parts: string[] = [];
  parts.push(
    '<svg viewBox="0 0 ' +
      W +
      ' ' +
      H +
      '" width="100%" preserveAspectRatio="xMidYMid meet" role="img" style="max-width:660px;height:auto">',
  );
  parts.push(
    '<defs><clipPath id="' +
      clipId +
      '"><rect x="' +
      pad +
      '" y="' +
      pad +
      '" width="' +
      (W - 2 * pad) +
      '" height="' +
      (H - 2 * pad) +
      '"/></clipPath></defs>',
  );

  // Grid + tick labels.
  const xStep = niceStep((xMax - xMin) / 10);
  const yStep = niceStep((yMax - yMin) / 8);
  for (let gx = Math.ceil(xMin / xStep) * xStep; gx <= xMax + 1e-9; gx += xStep) {
    const X = r1(mapX(gx));
    parts.push(
      '<line x1="' +
        X +
        '" y1="' +
        pad +
        '" x2="' +
        X +
        '" y2="' +
        (H - pad) +
        '" stroke="currentColor" stroke-opacity="0.10"/>',
    );
    parts.push(
      '<text x="' +
        X +
        '" y="' +
        (H - pad + 13) +
        '" font-size="9" text-anchor="middle" fill="currentColor" fill-opacity="0.5">' +
        fmt(gx) +
        '</text>',
    );
  }
  for (let gy = Math.ceil(yMin / yStep) * yStep; gy <= yMax + 1e-9; gy += yStep) {
    const Y = r1(mapY(gy));
    parts.push(
      '<line x1="' +
        pad +
        '" y1="' +
        Y +
        '" x2="' +
        (W - pad) +
        '" y2="' +
        Y +
        '" stroke="currentColor" stroke-opacity="0.10"/>',
    );
    parts.push(
      '<text x="' +
        (pad - 5) +
        '" y="' +
        (Y + 3) +
        '" font-size="9" text-anchor="end" fill="currentColor" fill-opacity="0.5">' +
        fmt(gy) +
        '</text>',
    );
  }

  // Axes.
  if (yMin < 0 && yMax > 0) {
    const Y0 = r1(mapY(0));
    parts.push(
      '<line x1="' +
        pad +
        '" y1="' +
        Y0 +
        '" x2="' +
        (W - pad) +
        '" y2="' +
        Y0 +
        '" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2"/>',
    );
  }
  if (xMin < 0 && xMax > 0) {
    const X0 = r1(mapX(0));
    parts.push(
      '<line x1="' +
        X0 +
        '" y1="' +
        pad +
        '" x2="' +
        X0 +
        '" y2="' +
        (H - pad) +
        '" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2"/>',
    );
  }

  // Curves (clipped so asymptotes do not escape the frame).
  parts.push('<g clip-path="url(#' + clipId + ')">');
  for (let s = 0; s < series.length; s++) {
    const color = PALETTE[s % PALETTE.length];
    let d = '';
    let penDown = false;
    let prevPix: number | null = null;
    const pts = series[s];
    for (let p = 0; p < pts.length; p++) {
      const y = pts[p].y;
      if (!isFinite(y)) {
        penDown = false;
        prevPix = null;
        continue;
      }
      const X = r1(mapX(pts[p].x));
      const Y = r1(mapY(y));
      if (penDown && prevPix !== null && Math.abs(Y - prevPix) > H * 2) {
        penDown = false;
      }
      d += (penDown ? 'L' : 'M') + X + ' ' + Y + ' ';
      penDown = true;
      prevPix = Y;
    }
    parts.push(
      '<path d="' + d.trim() + '" fill="none" stroke="' + color + '" stroke-width="2.2"/>',
    );
  }
  parts.push('</g>');

  // Legend.
  for (let s = 0; s < compiled.length; s++) {
    const color = PALETTE[s % PALETTE.length];
    const ly = pad + 4 + s * 16;
    parts.push(
      '<rect x="' + (pad + 6) + '" y="' + ly + '" width="11" height="11" rx="2" fill="' + color + '"/>',
    );
    parts.push(
      '<text x="' +
        (pad + 22) +
        '" y="' +
        (ly + 9.5) +
        '" font-size="11" fill="currentColor" fill-opacity="0.8">' +
        escapeXml('y = ' + compiled[s].expr) +
        '</text>',
    );
  }

  parts.push('</svg>');

  return (
    '<div class="my-3 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-[var(--color-text)]">' +
    parts.join('') +
    '</div>'
  );
}
