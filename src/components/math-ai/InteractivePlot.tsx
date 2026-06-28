'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import { compileExpr, evalAt, detectParams, type CompiledExpr } from '@/lib/math/plot';

/**
 * Interactive function graph for `plot` blocks.
 * Pan (drag), zoom (scroll / pinch / buttons), hover readout, save as PNG,
 * parameter sliders, auto key points (roots, intercept, extrema),
 * intersection points, tangent line with slope, and area under the curve.
 */

const W = 660;
const H = 400;
const PAD = 40;
const INNER_W = W - 2 * PAD;
const INNER_H = H - 2 * PAD;
const PALETTE = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#0ea5e9', '#a855f7'];
const ACCENT_HEX = '#f59e0b';
const AREA_FILL = '#6366f1';

type View = { xMin: number; xMax: number; yMin: number; yMax: number };
type Series = { label: string; color: string; compiled: CompiledExpr | null; error: boolean };
type Point = { x: number; y: number };
type KeyPoint = { x: number; y: number; color: string; kind: string };
type Params = Record<string, number>;

const r1 = (v: number) => Math.round(v * 10) / 10;

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '\u2014';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 0.001 || abs >= 100000)) return n.toExponential(2);
  let r: number;
  if (abs >= 100) r = Math.round(n * 10) / 10;
  else r = Math.round(n * 1000) / 1000;
  if (Object.is(r, -0)) return '0';
  return String(r);
}

function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / pow;
  let step = 10;
  if (n < 1.5) step = 1;
  else if (n < 3) step = 2;
  else if (n < 7) step = 5;
  return step * pow;
}

function mapX(x: number, v: View): number {
  return PAD + ((x - v.xMin) / (v.xMax - v.xMin)) * INNER_W;
}
function mapY(y: number, v: View): number {
  return H - PAD - ((y - v.yMin) / (v.yMax - v.yMin)) * INNER_H;
}
function invX(vbx: number, v: View): number {
  return v.xMin + ((vbx - PAD) / INNER_W) * (v.xMax - v.xMin);
}
function invY(vby: number, v: View): number {
  return v.yMin + ((H - PAD - vby) / INNER_H) * (v.yMax - v.yMin);
}

function ticks(min: number, max: number, target: number): number[] {
  const step = niceStep((max - min) / target);
  const out: number[] = [];
  let g = Math.ceil(min / step) * step;
  let guard = 0;
  while (g <= max + 1e-9 && guard < 200) {
    out.push(g);
    g += step;
    guard++;
  }
  return out;
}

function autoScaleY(list: Series[], xMin: number, xMax: number, params: Params): { yMin: number; yMax: number } {
  const ys: number[] = [];
  const N = 400;
  for (const s of list) {
    if (!s.compiled) continue;
    for (let p = 0; p <= N; p++) {
      const x = xMin + ((xMax - xMin) * p) / N;
      const y = evalAt(s.compiled, x, params);
      if (Number.isFinite(y) && Math.abs(y) < 1e6) ys.push(y);
    }
  }
  if (!ys.length) return { yMin: -10, yMax: 10 };
  ys.sort((a, b) => a - b);
  let yMin = ys[Math.floor(ys.length * 0.02)];
  let yMax = ys[Math.floor(ys.length * 0.98)];
  if (!(yMax > yMin)) {
    yMin -= 1;
    yMax += 1;
  }
  const pad = (yMax - yMin) * 0.12;
  return { yMin: yMin - pad, yMax: yMax + pad };
}

function derivAt(c: CompiledExpr, x: number, params: Params, span: number): number {
  const h = Math.max(1e-7, span * 1e-5);
  return (evalAt(c, x + h, params) - evalAt(c, x - h, params)) / (2 * h);
}

function bisect(f: (x: number) => number, a0: number, b0: number): number {
  let a = a0;
  let b = b0;
  let fa = f(a);
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (fm === 0 || !Number.isFinite(fm)) return m;
    if ((fa < 0 && fm < 0) || (fa > 0 && fm > 0)) {
      a = m;
      fa = fm;
    } else {
      b = m;
    }
    if (Math.abs(b - a) < 1e-10) break;
  }
  return (a + b) / 2;
}

function findRoots(c: CompiledExpr, params: Params, xMin: number, xMax: number): number[] {
  const f = (x: number) => evalAt(c, x, params);
  const N = 800;
  const roots: number[] = [];
  let prevX = xMin;
  let prevY = f(xMin);
  for (let i = 1; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = f(x);
    if (Number.isFinite(prevY) && Number.isFinite(y) && ((prevY < 0 && y > 0) || (prevY > 0 && y < 0))) {
      roots.push(bisect(f, prevX, x));
      if (roots.length >= 24) break;
    }
    prevX = x;
    prevY = y;
  }
  return roots;
}

function findExtrema(c: CompiledExpr, params: Params, xMin: number, xMax: number): KeyPoint[] {
  const span = xMax - xMin;
  const d = (x: number) => derivAt(c, x, params, span);
  const N = 600;
  const out: KeyPoint[] = [];
  let prevX = xMin;
  let prevD = d(xMin);
  for (let i = 1; i <= N; i++) {
    const x = xMin + (span * i) / N;
    const cur = d(x);
    if (Number.isFinite(prevD) && Number.isFinite(cur) && ((prevD < 0 && cur > 0) || (prevD > 0 && cur < 0))) {
      const ex = bisect(d, prevX, x);
      const ey = evalAt(c, ex, params);
      if (Number.isFinite(ey)) {
        out.push({ x: ex, y: ey, color: '', kind: prevD > 0 && cur < 0 ? 'max' : 'min' });
        if (out.length >= 16) break;
      }
    }
    prevX = x;
    prevD = cur;
  }
  return out;
}

function findIntersections(c1: CompiledExpr, c2: CompiledExpr, params: Params, xMin: number, xMax: number): Point[] {
  const g = (x: number) => evalAt(c1, x, params) - evalAt(c2, x, params);
  const N = 800;
  const out: Point[] = [];
  let prevX = xMin;
  let prevY = g(xMin);
  for (let i = 1; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = g(x);
    if (Number.isFinite(prevY) && Number.isFinite(y) && ((prevY < 0 && y > 0) || (prevY > 0 && y < 0))) {
      const ix = bisect(g, prevX, x);
      const iy = evalAt(c1, ix, params);
      if (Number.isFinite(iy)) out.push({ x: ix, y: iy });
      if (out.length >= 24) break;
    }
    prevX = x;
    prevY = y;
  }
  return out;
}

function integrate(c: CompiledExpr, params: Params, a: number, b: number): number {
  let lo = a;
  let hi = b;
  let sign = 1;
  if (hi < lo) {
    const t = lo;
    lo = hi;
    hi = t;
    sign = -1;
  }
  const N = 1000;
  const h = (hi - lo) / N;
  if (!(h > 0)) return 0;
  let prev = evalAt(c, lo, params);
  let sum = 0;
  for (let i = 1; i <= N; i++) {
    const x = lo + h * i;
    const y = evalAt(c, x, params);
    if (Number.isFinite(prev) && Number.isFinite(y)) sum += ((prev + y) / 2) * h;
    prev = y;
  }
  return sign * sum;
}

export default function InteractivePlot({ expressions }: { expressions: string[] }) {
  const rawId = useId();
  const clipId = 'plotclip-' + rawId.replace(/:/g, '');

  const paramNames = useMemo(() => {
    const set = new Set<string>();
    for (const e of expressions) for (const p of detectParams(e)) set.add(p);
    return Array.from(set).sort();
  }, [expressions]);

  const [params, setParams] = useState<Params>(() => {
    const o: Params = {};
    for (const p of paramNames) o[p] = 1;
    return o;
  });
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const series = useMemo<Series[]>(() => {
    return expressions.map((expr, i) => {
      let compiled: CompiledExpr | null = null;
      let error = false;
      try {
        compiled = compileExpr(expr, paramNames);
      } catch {
        error = true;
      }
      const label = compiled ? 'y = ' + compiled.expr : expr;
      return { label, color: PALETTE[i % PALETTE.length], compiled, error };
    });
  }, [expressions, paramNames]);

  const primaryIndex = useMemo(() => series.findIndex((s) => s.compiled), [series]);
  const validCount = useMemo(() => series.filter((s) => s.compiled).length, [series]);

  const [view, setView] = useState<View>(() => {
    const ys = autoScaleY(series, -10, 10, paramsRef.current);
    return { xMin: -10, xMax: 10, yMin: ys.yMin, yMax: ys.yMax };
  });
  const viewRef = useRef(view);
  viewRef.current = view;

  const [hover, setHover] = useState<{ x: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const [showKeyPoints, setShowKeyPoints] = useState(false);
  const [showIntersections, setShowIntersections] = useState(false);
  const [tangentOn, setTangentOn] = useState(false);
  const [tangentX, setTangentX] = useState<number | null>(null);
  const [areaOn, setAreaOn] = useState(false);
  const [areaA, setAreaA] = useState(-1);
  const [areaB, setAreaB] = useState(2);
  const tangentOnRef = useRef(tangentOn);
  tangentOnRef.current = tangentOn;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const dragRef = useRef<{ sx: number; sy: number; view: View } | null>(null);
  const pinchRef = useRef<{ dist: number } | null>(null);

  // Reconcile param values when the set of params changes.
  useEffect(() => {
    setParams((prev) => {
      const o: Params = {};
      for (const p of paramNames) o[p] = prev[p] !== undefined ? prev[p] : 1;
      return o;
    });
  }, [paramNames]);

  // Reset the view whenever the functions change (not on param/slider change).
  useEffect(() => {
    const ys = autoScaleY(series, -10, 10, paramsRef.current);
    setView({ xMin: -10, xMax: 10, yMin: ys.yMin, yMax: ys.yMax });
  }, [series]);

  const doZoom = useCallback((vbx: number, vby: number, factor: number) => {
    const v = viewRef.current;
    const dx = invX(vbx, v);
    const dy = invY(vby, v);
    const nxMin = dx - (dx - v.xMin) * factor;
    const nxMax = dx + (v.xMax - dx) * factor;
    const nyMin = dy - (dy - v.yMin) * factor;
    const nyMax = dy + (v.yMax - dy) * factor;
    const xSpan = nxMax - nxMin;
    const ySpan = nyMax - nyMin;
    if (xSpan < 1e-6 || ySpan < 1e-6 || xSpan > 1e9 || ySpan > 1e9) return;
    setView({ xMin: nxMin, xMax: nxMax, yMin: nyMin, yMax: nyMax });
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const vbx = ((e.clientX - rect.left) / rect.width) * W;
      const vby = ((e.clientY - rect.top) / rect.height) * H;
      doZoom(vbx, vby, e.deltaY > 0 ? 1.12 : 0.89);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [doZoom]);

  const clientToData = (clientX: number) => {
    const el = svgRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const vbx = ((clientX - rect.left) / rect.width) * W;
    return invX(vbx, viewRef.current);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    if (!el) return;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const size = pointersRef.current.size;
    if (size === 1) {
      dragRef.current = { sx: e.clientX, sy: e.clientY, view: viewRef.current };
      pinchRef.current = null;
      setDragging(true);
      const dataX = clientToData(e.clientX);
      setHover({ x: dataX });
      if (tangentOnRef.current) setTangentX(dataX);
    } else if (size === 2) {
      dragRef.current = null;
      setDragging(false);
      const pts = Array.from(pointersRef.current.values());
      pinchRef.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) };
      setHover(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    if (!el) return;
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    const size = pointersRef.current.size;
    if (size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchRef.current.dist > 0) {
        const rect = el.getBoundingClientRect();
        const cx = ((pts[0].x + pts[1].x) / 2 - rect.left) / rect.width * W;
        const cy = ((pts[0].y + pts[1].y) / 2 - rect.top) / rect.height * H;
        const factor = pinchRef.current.dist / dist;
        if (Number.isFinite(factor) && factor > 0) doZoom(cx, cy, factor);
      }
      pinchRef.current = { dist };
      return;
    }
    if (dragRef.current) {
      const rect = el.getBoundingClientRect();
      const start = dragRef.current;
      const dxPix = (e.clientX - start.sx) / rect.width * W;
      const dyPix = (e.clientY - start.sy) / rect.height * H;
      const dxData = (dxPix / INNER_W) * (start.view.xMax - start.view.xMin);
      const dyData = (dyPix / INNER_H) * (start.view.yMax - start.view.yMin);
      setView({
        xMin: start.view.xMin - dxData,
        xMax: start.view.xMax - dxData,
        yMin: start.view.yMin + dyData,
        yMax: start.view.yMax + dyData,
      });
    } else {
      const dataX = clientToData(e.clientX);
      setHover({ x: dataX });
      if (tangentOnRef.current) setTangentX(dataX);
    }
  };

  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      setDragging(false);
    }
  };

  const resetView = useCallback(() => {
    const ys = autoScaleY(series, -10, 10, paramsRef.current);
    setView({ xMin: -10, xMax: 10, yMin: ys.yMin, yMax: ys.yMax });
  }, [series]);

  const zoomButton = (factor: number) => doZoom(W / 2, H / 2, factor);

  // ---- Curve paths ----
  const paths = useMemo(() => {
    const N = 600;
    return series.map((s) => {
      if (!s.compiled) return { d: '', color: s.color };
      let d = '';
      let penDown = false;
      let prevPix: number | null = null;
      for (let p = 0; p <= N; p++) {
        const x = view.xMin + ((view.xMax - view.xMin) * p) / N;
        const y = evalAt(s.compiled, x, params);
        if (!Number.isFinite(y)) {
          penDown = false;
          prevPix = null;
          continue;
        }
        const X = r1(mapX(x, view));
        const Y = r1(mapY(y, view));
        if (penDown && prevPix !== null && Math.abs(Y - prevPix) > H * 3) penDown = false;
        d += (penDown ? 'L' : 'M') + X + ' ' + Y + ' ';
        penDown = true;
        prevPix = Y;
      }
      return { d: d.trim(), color: s.color };
    });
  }, [series, view, params]);

  // ---- Hover readout ----
  const hoverData = useMemo(() => {
    if (!hover) return null;
    const X = mapX(hover.x, view);
    if (X < PAD - 1 || X > W - PAD + 1) return null;
    const dots = series.map((s) => {
      if (!s.compiled) return null;
      const y = evalAt(s.compiled, hover.x, params);
      if (!Number.isFinite(y)) return null;
      return { y, color: s.color, py: mapY(y, view) };
    });
    return { X, dots };
  }, [hover, series, view, params]);

  // ---- Key points ----
  const keyPoints = useMemo(() => {
    if (!showKeyPoints) return [] as KeyPoint[];
    const out: KeyPoint[] = [];
    series.forEach((s) => {
      if (!s.compiled) return;
      for (const rx of findRoots(s.compiled, params, view.xMin, view.xMax)) {
        out.push({ x: rx, y: 0, color: s.color, kind: 'root' });
      }
      if (view.xMin < 0 && view.xMax > 0) {
        const y0 = evalAt(s.compiled, 0, params);
        if (Number.isFinite(y0)) out.push({ x: 0, y: y0, color: s.color, kind: 'y-int' });
      }
      for (const ex of findExtrema(s.compiled, params, view.xMin, view.xMax)) {
        out.push({ ...ex, color: s.color });
      }
    });
    return out.filter((p) => Number.isFinite(p.y) && p.y >= view.yMin && p.y <= view.yMax);
  }, [showKeyPoints, series, params, view]);

  // ---- Intersections ----
  const intersections = useMemo(() => {
    if (!showIntersections || validCount < 2) return [] as Point[];
    const out: Point[] = [];
    for (let i = 0; i < series.length; i++) {
      for (let j = i + 1; j < series.length; j++) {
        const a = series[i].compiled;
        const b = series[j].compiled;
        if (!a || !b) continue;
        for (const pt of findIntersections(a, b, params, view.xMin, view.xMax)) out.push(pt);
      }
    }
    return out.filter((p) => p.y >= view.yMin && p.y <= view.yMax);
  }, [showIntersections, series, validCount, params, view]);

  // ---- Tangent line ----
  const tangent = useMemo(() => {
    if (!tangentOn || tangentX === null || primaryIndex < 0) return null;
    const c = series[primaryIndex].compiled;
    if (!c) return null;
    const x0 = tangentX;
    const y0 = evalAt(c, x0, params);
    if (!Number.isFinite(y0)) return null;
    const m = derivAt(c, x0, params, view.xMax - view.xMin);
    if (!Number.isFinite(m)) return null;
    const yL = m * (view.xMin - x0) + y0;
    const yR = m * (view.xMax - x0) + y0;
    return {
      x1: mapX(view.xMin, view),
      y1: mapY(yL, view),
      x2: mapX(view.xMax, view),
      y2: mapY(yR, view),
      px: mapX(x0, view),
      py: mapY(y0, view),
      m,
      x0,
      y0,
    };
  }, [tangentOn, tangentX, primaryIndex, series, params, view]);

  // ---- Area under the curve ----
  const area = useMemo(() => {
    if (!areaOn || primaryIndex < 0) return null;
    const c = series[primaryIndex].compiled;
    if (!c) return null;
    const lo = Math.min(areaA, areaB);
    const hi = Math.max(areaA, areaB);
    if (!(hi > lo)) return null;
    const N = 240;
    const zeroY = mapY(0, view);
    let d = 'M ' + r1(mapX(lo, view)) + ' ' + r1(zeroY) + ' ';
    for (let p = 0; p <= N; p++) {
      const x = lo + ((hi - lo) * p) / N;
      const y = evalAt(c, x, params);
      const yy = Number.isFinite(y) ? y : 0;
      d += 'L ' + r1(mapX(x, view)) + ' ' + r1(mapY(yy, view)) + ' ';
    }
    d += 'L ' + r1(mapX(hi, view)) + ' ' + r1(zeroY) + ' Z';
    const value = integrate(c, params, areaA, areaB);
    return { d, value };
  }, [areaOn, primaryIndex, series, params, view, areaA, areaB]);

  const xTicks = useMemo(() => ticks(view.xMin, view.xMax, 10), [view]);
  const yTicks = useMemo(() => ticks(view.yMin, view.yMax, 8), [view]);
  const showYAxis = view.xMin < 0 && view.xMax > 0;
  const showXAxis = view.yMin < 0 && view.yMax > 0;

  // ---- Save as PNG ----
  const downloadImage = useCallback(() => {
    const el = svgRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const vars: Record<string, string> = {
      '--color-bg': cs.getPropertyValue('--color-bg').trim() || '#ffffff',
      '--color-text': cs.getPropertyValue('--color-text').trim() || '#111111',
      '--color-bg-elevated': cs.getPropertyValue('--color-bg-elevated').trim() || '#ffffff',
      '--color-border': cs.getPropertyValue('--color-border').trim() || '#dddddd',
      '--color-accent': cs.getPropertyValue('--color-accent').trim() || ACCENT_HEX,
    };
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.style.color = vars['--color-text'];
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', String(W));
    bg.setAttribute('height', String(H));
    bg.setAttribute('fill', vars['--color-bg']);
    clone.insertBefore(bg, clone.firstChild);
    let markup = new XMLSerializer().serializeToString(clone);
    for (const key of Object.keys(vars)) {
      markup = markup.split('var(' + key + ')').join(vars[key]);
    }
    const svgBlob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = vars['--color-bg'];
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'graph.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, 'image/png');
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, []);

  const hasError = series.some((s) => s.error);
  const btnCls =
    'flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]';
  const chip = (active: boolean) =>
    'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
    (active
      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
      : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]');
  const numCls =
    'w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]';

  return (
    <div className="my-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-[var(--color-text)]">
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={'0 0 ' + W + ' ' + H}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          className={'h-auto w-full touch-none select-none ' + (dragging ? 'cursor-grabbing' : 'cursor-grab')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={(e) => {
            endPointer(e);
            if (!tangentOnRef.current) setHover(null);
          }}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD} y={PAD} width={INNER_W} height={INNER_H} />
            </clipPath>
          </defs>

          {xTicks.map((gx, i) => (
            <g key={'gx' + i}>
              <line x1={r1(mapX(gx, view))} y1={PAD} x2={r1(mapX(gx, view))} y2={H - PAD} stroke="currentColor" strokeOpacity={0.1} />
              <text x={r1(mapX(gx, view))} y={H - PAD + 14} fontSize={9} textAnchor="middle" fill="currentColor" fillOpacity={0.5}>{fmt(gx)}</text>
            </g>
          ))}
          {yTicks.map((gy, i) => (
            <g key={'gy' + i}>
              <line x1={PAD} y1={r1(mapY(gy, view))} x2={W - PAD} y2={r1(mapY(gy, view))} stroke="currentColor" strokeOpacity={0.1} />
              <text x={PAD - 6} y={r1(mapY(gy, view)) + 3} fontSize={9} textAnchor="end" fill="currentColor" fillOpacity={0.5}>{fmt(gy)}</text>
            </g>
          ))}

          {area ? (
            <g clipPath={'url(#' + clipId + ')'}>
              <path d={area.d} fill={AREA_FILL} fillOpacity={0.18} stroke="none" />
            </g>
          ) : null}

          {showXAxis ? <line x1={PAD} y1={r1(mapY(0, view))} x2={W - PAD} y2={r1(mapY(0, view))} stroke="currentColor" strokeOpacity={0.45} strokeWidth={1.2} /> : null}
          {showYAxis ? <line x1={r1(mapX(0, view))} y1={PAD} x2={r1(mapX(0, view))} y2={H - PAD} stroke="currentColor" strokeOpacity={0.45} strokeWidth={1.2} /> : null}

          <g clipPath={'url(#' + clipId + ')'}>
            {paths.map((p, i) => (p.d ? <path key={'p' + i} d={p.d} fill="none" stroke={p.color} strokeWidth={2.2} strokeLinejoin="round" /> : null))}
          </g>

          {tangent ? (
            <g clipPath={'url(#' + clipId + ')'}>
              <line x1={r1(tangent.x1)} y1={r1(tangent.y1)} x2={r1(tangent.x2)} y2={r1(tangent.y2)} stroke={ACCENT_HEX} strokeWidth={1.6} strokeDasharray="6 4" />
              <circle cx={r1(tangent.px)} cy={r1(tangent.py)} r={4} fill={ACCENT_HEX} />
            </g>
          ) : null}

          {keyPoints.map((kp, i) => {
            const px = mapX(kp.x, view);
            if (px < PAD - 1 || px > W - PAD + 1) return null;
            const py = mapY(kp.y, view);
            const label = kp.kind === 'root' ? 'x=' + fmt(kp.x) : '(' + fmt(kp.x) + ', ' + fmt(kp.y) + ')';
            const above = py > PAD + 18;
            return (
              <g key={'kp' + i}>
                <circle cx={r1(px)} cy={r1(py)} r={4} fill={kp.color} stroke="var(--color-bg)" strokeWidth={1.5} />
                <text x={r1(px)} y={r1(above ? py - 8 : py + 16)} fontSize={9.5} textAnchor="middle" fill="currentColor" fillOpacity={0.85}>{label}</text>
              </g>
            );
          })}

          {intersections.map((pt, i) => {
            const px = mapX(pt.x, view);
            if (px < PAD - 1 || px > W - PAD + 1) return null;
            const py = mapY(pt.y, view);
            return (
              <g key={'ix' + i}>
                <circle cx={r1(px)} cy={r1(py)} r={4.5} fill={ACCENT_HEX} stroke="var(--color-bg)" strokeWidth={1.5} />
                <text x={r1(px)} y={r1(py - 9)} fontSize={9.5} textAnchor="middle" fill="currentColor" fillOpacity={0.85}>{'(' + fmt(pt.x) + ', ' + fmt(pt.y) + ')'}</text>
              </g>
            );
          })}

          {hoverData ? (
            <g>
              <line x1={r1(hoverData.X)} y1={PAD} x2={r1(hoverData.X)} y2={H - PAD} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 4" />
              {hoverData.dots.map((d, i) => (d ? <circle key={'hd' + i} cx={r1(hoverData.X)} cy={r1(d.py)} r={3.5} fill={d.color} /> : null))}
            </g>
          ) : null}

          {series.map((s, i) => {
            const ly = PAD + 4 + i * 16;
            return (
              <g key={'lg' + i}>
                <rect x={PAD + 6} y={ly} width={11} height={11} rx={2} fill={s.color} />
                <text x={PAD + 22} y={ly + 9.5} fontSize={11} fill="currentColor" fillOpacity={0.85}>{s.label}</text>
              </g>
            );
          })}
        </svg>

        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button type="button" onClick={() => zoomButton(0.8)} className={btnCls} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" onClick={() => zoomButton(1.25)} className={btnCls} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
          <button type="button" onClick={resetView} className={btnCls} aria-label="Reset view"><RotateCcw className="h-4 w-4" /></button>
          <button type="button" onClick={downloadImage} className={btnCls} aria-label="Save as image"><Download className="h-4 w-4" /></button>
        </div>

        {hoverData ? (
          <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] shadow-sm">
            <div className="font-medium text-[var(--color-text)]">x = {fmt(hover ? hover.x : 0)}</div>
            {hoverData.dots.map((d, i) =>
              d ? (
                <div key={'ht' + i} className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm" />
                  <span>y = {fmt(d.y)}</span>
                </div>
              ) : null,
            )}
          </div>
        ) : null}
      </div>

      {hasError ? (
        <div className="mt-2 rounded-md bg-[var(--color-bg-muted)] px-2 py-1 text-[12px] text-[var(--color-text-secondary)]">Some functions could not be read and were skipped.</div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setShowKeyPoints((v) => !v)} className={chip(showKeyPoints)}>Key points</button>
        <button type="button" onClick={() => setTangentOn((v) => { const nv = !v; if (nv && tangentX === null) setTangentX((view.xMin + view.xMax) / 2); return nv; })} className={chip(tangentOn)}>Tangent</button>
        <button type="button" onClick={() => setAreaOn((v) => !v)} className={chip(areaOn)}>Area</button>
        {validCount >= 2 ? <button type="button" onClick={() => setShowIntersections((v) => !v)} className={chip(showIntersections)}>Intersections</button> : null}
      </div>

      {areaOn ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <span>from</span>
          <input type="number" step="0.5" value={areaA} onChange={(e) => setAreaA(Number(e.target.value))} className={numCls} />
          <span>to</span>
          <input type="number" step="0.5" value={areaB} onChange={(e) => setAreaB(Number(e.target.value))} className={numCls} />
          {area ? <span className="font-medium text-[var(--color-text)]">area \u2248 {fmt(area.value)}</span> : null}
        </div>
      ) : null}

      {tangent ? (
        <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
          Tangent at x = {fmt(tangent.x0)}: slope = {fmt(tangent.m)}, y = {fmt(tangent.m)}\u00b7(x \u2212 {fmt(tangent.x0)}) + {fmt(tangent.y0)}
        </div>
      ) : null}

      {paramNames.length > 0 ? (
        <div className="mt-2 space-y-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2">
          {paramNames.map((p) => (
            <div key={'pm' + p} className="flex items-center gap-2 text-xs">
              <span className="w-6 font-mono font-medium text-[var(--color-text)]">{p} =</span>
              <input
                type="range"
                min={-10}
                max={10}
                step={0.1}
                value={params[p] ?? 1}
                onChange={(e) => setParams((prev) => ({ ...prev, [p]: Number(e.target.value) }))}
                className="h-1 flex-1 cursor-pointer accent-[var(--color-accent)]"
              />
              <span className="w-12 text-right font-mono text-[var(--color-text-secondary)]">{fmt(params[p] ?? 1)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">Drag to pan \u00b7 scroll or pinch to zoom \u00b7 hover to read values \u00b7 toggle tools above</div>
    </div>
  );
}
