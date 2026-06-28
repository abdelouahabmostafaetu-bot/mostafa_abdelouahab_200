'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import { compileExpr, evalAt, type CompiledExpr } from '@/lib/math/plot';

/**
 * Interactive function graph for `plot` blocks.
 * Students can: drag to pan, scroll or pinch to zoom, use the buttons, hover
 * (or touch) anywhere to read the exact point on each curve, and save the
 * graph as a PNG image.
 */

const W = 660;
const H = 400;
const PAD = 40;
const INNER_W = W - 2 * PAD;
const INNER_H = H - 2 * PAD;
const PALETTE = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#0ea5e9', '#a855f7'];

type View = { xMin: number; xMax: number; yMin: number; yMax: number };
type Series = { label: string; color: string; compiled: CompiledExpr | null; error: boolean };
type Point = { x: number; y: number };

const r1 = (v: number) => Math.round(v * 10) / 10;

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '\u2014';
  const abs = Math.abs(n);
  let r: number;
  if (abs !== 0 && (abs < 0.01 || abs >= 100000)) return n.toExponential(2);
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

function autoScaleY(series: Series[], xMin: number, xMax: number): { yMin: number; yMax: number } {
  const ys: number[] = [];
  const N = 400;
  for (const s of series) {
    if (!s.compiled) continue;
    for (let p = 0; p <= N; p++) {
      const x = xMin + ((xMax - xMin) * p) / N;
      const y = evalAt(s.compiled, x);
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

export default function InteractivePlot({ expressions }: { expressions: string[] }) {
  const rawId = useId();
  const clipId = 'plotclip-' + rawId.replace(/:/g, '');

  const series = useMemo<Series[]>(() => {
    return expressions.map((expr, i) => {
      let compiled: CompiledExpr | null = null;
      let error = false;
      try {
        compiled = compileExpr(expr);
      } catch {
        error = true;
      }
      const label = compiled ? 'y = ' + compiled.expr : expr;
      return { label, color: PALETTE[i % PALETTE.length], compiled, error };
    });
  }, [expressions]);

  const [view, setView] = useState<View>(() => {
    const ys = autoScaleY(series, -10, 10);
    return { xMin: -10, xMax: 10, yMin: ys.yMin, yMax: ys.yMax };
  });
  const [hover, setHover] = useState<{ x: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const viewRef = useRef(view);
  viewRef.current = view;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const dragRef = useRef<{ sx: number; sy: number; view: View } | null>(null);
  const pinchRef = useRef<{ dist: number } | null>(null);

  // Reset to a sensible view whenever the functions change.
  useEffect(() => {
    const ys = autoScaleY(series, -10, 10);
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
    if (xSpan < 1e-6 || ySpan < 1e-6) return;
    if (xSpan > 1e9 || ySpan > 1e9) return;
    setView({ xMin: nxMin, xMax: nxMax, yMin: nyMin, yMax: nyMax });
  }, []);

  // Wheel zoom needs a non-passive listener to call preventDefault.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const vbx = ((e.clientX - rect.left) / rect.width) * W;
      const vby = ((e.clientY - rect.top) / rect.height) * H;
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      doZoom(vbx, vby, factor);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [doZoom]);

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
      const rect = el.getBoundingClientRect();
      const vbx = ((e.clientX - rect.left) / rect.width) * W;
      setHover({ x: invX(vbx, viewRef.current) });
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
    const rect = el.getBoundingClientRect();
    const size = pointersRef.current.size;

    if (size >= 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (dist > 0) {
        const factor = pinchRef.current.dist / dist;
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;
        doZoom(((cx - rect.left) / rect.width) * W, ((cy - rect.top) / rect.height) * H, factor);
        pinchRef.current.dist = dist;
      }
      setHover(null);
      return;
    }

    if (dragRef.current && size === 1) {
      const d = dragRef.current;
      const dataDx = (((e.clientX - d.sx) / rect.width) * W) / INNER_W * (d.view.xMax - d.view.xMin);
      const dataDy = (((e.clientY - d.sy) / rect.height) * H) / INNER_H * (d.view.yMax - d.view.yMin);
      setView({
        xMin: d.view.xMin - dataDx,
        xMax: d.view.xMax - dataDx,
        yMin: d.view.yMin + dataDy,
        yMax: d.view.yMax + dataDy,
      });
      return;
    }

    const vbx = ((e.clientX - rect.left) / rect.width) * W;
    const vby = ((e.clientY - rect.top) / rect.height) * H;
    if (vbx < PAD || vbx > W - PAD || vby < PAD || vby > H - PAD) {
      setHover(null);
      return;
    }
    setHover({ x: invX(vbx, viewRef.current) });
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const size = pointersRef.current.size;
    if (size === 0) {
      dragRef.current = null;
      pinchRef.current = null;
      setDragging(false);
    } else if (size === 1) {
      pinchRef.current = null;
      const only = Array.from(pointersRef.current.values())[0];
      dragRef.current = { sx: only.x, sy: only.y, view: viewRef.current };
    }
  };

  const onPointerLeave = () => {
    if (pointersRef.current.size === 0) setHover(null);
  };

  const resetView = () => {
    const ys = autoScaleY(series, -10, 10);
    setView({ xMin: -10, xMax: 10, yMin: ys.yMin, yMax: ys.yMax });
  };

  // Export the current graph as a PNG. We clone the live SVG, bake in the
  // resolved theme colors (so CSS variables and currentColor render outside
  // the page), add a solid background, then rasterize via an off-screen canvas.
  const downloadImage = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const cs = getComputedStyle(svg);
    const pick = (name: string, fallback: string) => {
      const v = cs.getPropertyValue(name).trim();
      return v || fallback;
    };
    const bg = pick('--color-bg', '#ffffff');
    const text = pick('--color-text', '#111111');
    const elev = pick('--color-bg-elevated', bg);
    const border = pick('--color-border', '#cccccc');

    const ns = 'http://www.w3.org/2000/svg';
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', ns);
    clone.setAttribute('width', String(W));
    clone.setAttribute('height', String(H));
    clone.style.setProperty('--color-bg', bg);
    clone.style.setProperty('--color-text', text);
    clone.style.setProperty('--color-bg-elevated', elev);
    clone.style.setProperty('--color-border', border);
    clone.style.color = text;

    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', String(W));
    rect.setAttribute('height', String(H));
    rect.setAttribute('fill', bg);
    clone.insertBefore(rect, clone.firstChild);

    const svgStr = new XMLSerializer().serializeToString(clone);
    const scale = 2;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graph.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  };

  const paths = useMemo(() => {
    const N = 700;
    return series.map((s) => {
      if (!s.compiled) return { color: s.color, d: '' };
      let d = '';
      let pen = false;
      let prevY: number | null = null;
      for (let p = 0; p <= N; p++) {
        const x = view.xMin + ((view.xMax - view.xMin) * p) / N;
        const y = evalAt(s.compiled, x);
        if (!Number.isFinite(y)) {
          pen = false;
          prevY = null;
          continue;
        }
        const X = mapX(x, view);
        const Y = mapY(y, view);
        if (pen && prevY !== null && Math.abs(Y - prevY) > INNER_H * 3) pen = false;
        d += (pen ? 'L' : 'M') + r1(X) + ' ' + r1(Y) + ' ';
        pen = true;
        prevY = Y;
      }
      return { color: s.color, d: d.trim() };
    });
  }, [series, view]);

  const xticks = useMemo(() => ticks(view.xMin, view.xMax, 10), [view]);
  const yticks = useMemo(() => ticks(view.yMin, view.yMax, 8), [view]);

  const showXAxis = view.yMin < 0 && view.yMax > 0;
  const showYAxis = view.xMin < 0 && view.xMax > 0;

  let hoverNodes: React.ReactNode = null;
  if (hover) {
    const hx = hover.x;
    const vbx = mapX(hx, view);
    if (vbx >= PAD && vbx <= W - PAD) {
      const dots: React.ReactNode[] = [];
      const tipLines: Array<{ t: string; c: string }> = [{ t: 'x = ' + fmt(hx), c: 'currentColor' }];
      series.forEach((s, i) => {
        if (!s.compiled) return;
        const y = evalAt(s.compiled, hx);
        tipLines.push({ t: 'y = ' + fmt(y), c: s.color });
        if (!Number.isFinite(y)) return;
        const vy = mapY(y, view);
        if (vy < PAD || vy > H - PAD) return;
        dots.push(
          <circle
            key={i}
            cx={r1(vbx)}
            cy={r1(vy)}
            r={4}
            fill={s.color}
            stroke="var(--color-bg)"
            strokeWidth={1.5}
          />,
        );
      });
      const tw = 104;
      const th = tipLines.length * 15 + 8;
      let tx = vbx + 12;
      if (tx + tw > W - 4) tx = vbx - 12 - tw;
      const ty = PAD + 4;
      hoverNodes = (
        <g>
          <line
            x1={r1(vbx)}
            y1={PAD}
            x2={r1(vbx)}
            y2={H - PAD}
            stroke="currentColor"
            strokeOpacity={0.35}
            strokeDasharray="4 3"
          />
          {dots}
          <rect
            x={r1(tx)}
            y={ty}
            width={tw}
            height={th}
            rx={6}
            fill="var(--color-bg-elevated)"
            stroke="var(--color-border)"
          />
          {tipLines.map((l, i) => (
            <text key={i} x={r1(tx) + 9} y={ty + 16 + i * 15} fontSize={11} fill={l.c}>
              {l.t}
            </text>
          ))}
        </g>
      );
    }
  }

  const allError = series.length > 0 && series.every((s) => s.error);

  return (
    <div className="my-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-[var(--color-text)]">
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={'0 0 ' + W + ' ' + H}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          className={
            'block h-auto w-full touch-none select-none ' +
            (dragging ? 'cursor-grabbing' : 'cursor-crosshair')
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerLeave}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD} y={PAD} width={INNER_W} height={INNER_H} />
            </clipPath>
          </defs>

          {xticks.map((gx, i) => {
            const X = r1(mapX(gx, view));
            return (
              <g key={'xt' + i}>
                <line x1={X} y1={PAD} x2={X} y2={H - PAD} stroke="currentColor" strokeOpacity={0.1} />
                <text
                  x={X}
                  y={H - PAD + 14}
                  fontSize={9}
                  textAnchor="middle"
                  fill="currentColor"
                  fillOpacity={0.5}
                >
                  {fmt(gx)}
                </text>
              </g>
            );
          })}
          {yticks.map((gy, i) => {
            const Y = r1(mapY(gy, view));
            return (
              <g key={'yt' + i}>
                <line x1={PAD} y1={Y} x2={W - PAD} y2={Y} stroke="currentColor" strokeOpacity={0.1} />
                <text
                  x={PAD - 5}
                  y={Y + 3}
                  fontSize={9}
                  textAnchor="end"
                  fill="currentColor"
                  fillOpacity={0.5}
                >
                  {fmt(gy)}
                </text>
              </g>
            );
          })}

          {showXAxis && (
            <line
              x1={PAD}
              y1={r1(mapY(0, view))}
              x2={W - PAD}
              y2={r1(mapY(0, view))}
              stroke="currentColor"
              strokeOpacity={0.45}
              strokeWidth={1.2}
            />
          )}
          {showYAxis && (
            <line
              x1={r1(mapX(0, view))}
              y1={PAD}
              x2={r1(mapX(0, view))}
              y2={H - PAD}
              stroke="currentColor"
              strokeOpacity={0.45}
              strokeWidth={1.2}
            />
          )}

          <g clipPath={'url(#' + clipId + ')'}>
            {paths.map((p, i) =>
              p.d ? (
                <path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth={2.2} />
              ) : null,
            )}
          </g>

          {hoverNodes}

          {series.map((s, i) => {
            const ly = PAD + 4 + i * 16;
            return (
              <g key={'lg' + i}>
                <rect x={PAD + 6} y={ly} width={11} height={11} rx={2} fill={s.color} />
                <text x={PAD + 22} y={ly + 9.5} fontSize={11} fill="currentColor" fillOpacity={0.85}>
                  {s.error ? '\u26a0 ' + s.label : s.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => doZoom(W / 2, H / 2, 0.8)}
            title="Zoom in"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => doZoom(W / 2, H / 2, 1.25)}
            title="Zoom out"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            title="Reset view"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={downloadImage}
            title="Save as image"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-1 px-1 text-[11px] text-[var(--color-text-tertiary)]">
        {allError
          ? 'Could not read this function.'
          : 'Drag to move \u2022 Scroll or pinch to zoom \u2022 Hover to read \u2022 Save as image'}
      </div>
    </div>
  );
}
