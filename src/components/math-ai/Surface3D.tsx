'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download, Grid3x3, Play, Pause } from 'lucide-react';
import { compileSurface, evalSurface, type CompiledSurface } from '@/lib/math/plot3d';

/**
 * Interactive 3D surface plot for `plot3d` blocks: z = f(x, y).
 * Drag to rotate, scroll to zoom, change the x/y range, toggle wireframe,
 * auto-spin, and save as a PNG. Rendered as depth-sorted, shaded SVG quads
 * (painter's algorithm) with a height colour scale.
 */

const W = 540;
const H = 440;
const BASE_SCALE = 150;
const N = 22;
const HEIGHT = 1.05;

type P3 = { sx: number; sy: number; depth: number };
type Face = { pts: string; fill: string; stroke: string; depth: number };

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '\u2014';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 0.001 || abs >= 100000)) return n.toExponential(1);
  return String(Math.round(n * 100) / 100);
}

export default function Surface3D({ expression }: { expression: string }) {
  const rawId = useId();
  const gradId = 'surfgrad-' + rawId.replace(/:/g, '');

  const compiled = useMemo<CompiledSurface | null>(() => {
    try {
      return compileSurface(expression);
    } catch {
      return null;
    }
  }, [expression]);

  const [domain, setDomain] = useState(4);
  const [azimuth, setAzimuth] = useState(0.7);
  const [elevation, setElevation] = useState(0.62);
  const [zoom, setZoom] = useState(1);
  const [wire, setWire] = useState(false);
  const [spin, setSpin] = useState(false);
  const [dragging, setDragging] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; az: number; el: number } | null>(null);

  // ---- Sample the surface on a grid (with robust z range) ----
  const grid = useMemo(() => {
    const zs: number[][] = [];
    const flat: number[] = [];
    if (compiled) {
      for (let i = 0; i <= N; i++) {
        const row: number[] = [];
        const x = -domain + (2 * domain * i) / N;
        for (let j = 0; j <= N; j++) {
          const y = -domain + (2 * domain * j) / N;
          const z = evalSurface(compiled, x, y);
          if (Number.isFinite(z)) flat.push(z);
          row.push(Number.isFinite(z) ? z : NaN);
        }
        zs.push(row);
      }
    }
    flat.sort((a, b) => a - b);
    let zMin = flat.length ? flat[Math.floor(flat.length * 0.02)] : -1;
    let zMax = flat.length ? flat[Math.floor(flat.length * 0.98)] : 1;
    if (!(zMax > zMin)) {
      zMin -= 1;
      zMax += 1;
    }
    return { zs, zMin, zMax };
  }, [compiled, domain]);

  // ---- Build depth-sorted, shaded faces ----
  const faces = useMemo<Face[]>(() => {
    const { zs, zMin, zMax } = grid;
    if (!zs.length) return [];
    const zMid = (zMin + zMax) / 2;
    const zHalf = Math.max((zMax - zMin) / 2, 1e-9);
    const cosA = Math.cos(azimuth);
    const sinA = Math.sin(azimuth);
    const cosE = Math.cos(elevation);
    const sinE = Math.sin(elevation);
    const scale = BASE_SCALE * zoom;
    const cx = W / 2;
    const cy = H / 2 + 10;
    const norm = (z: number) => ((clamp(z, zMin, zMax) - zMid) / zHalf) * HEIGHT;
    const project = (X: number, Y: number, Z: number): P3 => {
      const px = -X * sinA + Y * cosA;
      const py = Z * cosE - (X * cosA + Y * sinA) * sinE;
      const depth = (X * cosA + Y * sinA) * cosE + Z * sinE;
      return { sx: cx + scale * px, sy: cy - scale * py, depth };
    };
    let lx = 0.45;
    let ly = 0.35;
    let lz = 0.82;
    const lmag = Math.hypot(lx, ly, lz);
    lx /= lmag;
    ly /= lmag;
    lz /= lmag;
    const out: Face[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const z00 = zs[i][j];
        const z10 = zs[i + 1][j];
        const z11 = zs[i + 1][j + 1];
        const z01 = zs[i][j + 1];
        if (!Number.isFinite(z00) || !Number.isFinite(z10) || !Number.isFinite(z11) || !Number.isFinite(z01)) continue;
        const X0 = -1 + (2 * i) / N;
        const X1 = -1 + (2 * (i + 1)) / N;
        const Y0 = -1 + (2 * j) / N;
        const Y1 = -1 + (2 * (j + 1)) / N;
        const Z00 = norm(z00);
        const Z10 = norm(z10);
        const Z11 = norm(z11);
        const Z01 = norm(z01);
        const p00 = project(X0, Y0, Z00);
        const p10 = project(X1, Y0, Z10);
        const p11 = project(X1, Y1, Z11);
        const p01 = project(X0, Y1, Z01);
        const depth = (p00.depth + p10.depth + p11.depth + p01.depth) / 4;
        // model-space normal for shading
        const ax = X1 - X0;
        const az1 = Z10 - Z00;
        const by = Y1 - Y0;
        const bz = Z01 - Z00;
        let nx = by * az1 * -1;
        let nyv = bz * ax * -1;
        let nz = ax * by;
        nx = -(0) + (0 * bz - az1 * 0);
        // cross product v1=(ax,0,az1) x v2=(0,by,bz)
        nx = 0 * bz - az1 * by;
        nyv = az1 * 0 - ax * bz;
        nz = ax * by - 0 * 0;
        const nmag = Math.hypot(nx, nyv, nz) || 1;
        const dot = (nx * lx + nyv * ly + nz * lz) / nmag;
        const bright = 0.45 + 0.55 * Math.abs(dot);
        const zc = (z00 + z10 + z11 + z01) / 4;
        const t = clamp((zc - zMin) / (zMax - zMin), 0, 1);
        const hue = Math.round(250 - 250 * t);
        const light = Math.round(clamp(34 + 36 * bright, 18, 88));
        const pts =
          r1(p00.sx) + ',' + r1(p00.sy) + ' ' +
          r1(p10.sx) + ',' + r1(p10.sy) + ' ' +
          r1(p11.sx) + ',' + r1(p11.sy) + ' ' +
          r1(p01.sx) + ',' + r1(p01.sy);
        if (wire) {
          out.push({ pts, fill: 'none', stroke: 'hsl(' + hue + ', 70%, 55%)', depth });
        } else {
          out.push({ pts, fill: 'hsl(' + hue + ', 72%, ' + light + '%)', stroke: 'hsl(' + hue + ', 60%, ' + clamp(light - 16, 10, 80) + '%)', depth });
        }
      }
    }
    out.sort((a, b) => a.depth - b.depth);
    return out;
  }, [grid, azimuth, elevation, zoom, wire]);

  // ---- Axes (drawn on top) ----
  const axes = useMemo(() => {
    const { zMin, zMax } = grid;
    const zMid = (zMin + zMax) / 2;
    const zHalf = Math.max((zMax - zMin) / 2, 1e-9);
    const cosA = Math.cos(azimuth);
    const sinA = Math.sin(azimuth);
    const cosE = Math.cos(elevation);
    const sinE = Math.sin(elevation);
    const scale = BASE_SCALE * zoom;
    const cx = W / 2;
    const cy = H / 2 + 10;
    const norm = (z: number) => ((clamp(z, zMin, zMax) - zMid) / zHalf) * HEIGHT;
    const project = (X: number, Y: number, Z: number): { sx: number; sy: number } => {
      const px = -X * sinA + Y * cosA;
      const py = Z * cosE - (X * cosA + Y * sinA) * sinE;
      return { sx: cx + scale * px, sy: cy - scale * py };
    };
    const zb = norm(zMin);
    const zt = norm(zMax);
    const o = project(-1, -1, zb);
    const xEnd = project(1, -1, zb);
    const yEnd = project(-1, 1, zb);
    const zEnd = project(-1, -1, zt);
    const xLab = project(1.16, -1, zb);
    const yLab = project(-1, 1.16, zb);
    const zLab = project(-1, -1, zt + 0.12);
    return { o, xEnd, yEnd, zEnd, xLab, yLab, zLab };
  }, [grid, azimuth, elevation, zoom]);

  // ---- Auto-spin ----
  useEffect(() => {
    if (!spin) return;
    let raf = 0;
    const tick = () => {
      setAzimuth((a) => a + 0.012);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spin]);

  // ---- Wheel zoom ----
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clamp(z * (e.deltaY > 0 ? 0.9 : 1.1), 0.3, 6));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    if (el) {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    dragRef.current = { x: e.clientX, y: e.clientY, az: azimuth, el: elevation };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    setAzimuth(d.az + dx * 0.01);
    setElevation(clamp(d.el - dy * 0.01, 0.05, 1.55));
  };
  const endPointer = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const resetView = useCallback(() => {
    setAzimuth(0.7);
    setElevation(0.62);
    setZoom(1);
    setDomain(4);
    setSpin(false);
  }, []);

  // ---- Save as PNG ----
  const downloadImage = useCallback(() => {
    const el = svgRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const bgColor = cs.getPropertyValue('--color-bg').trim() || '#ffffff';
    const textColor = cs.getPropertyValue('--color-text').trim() || '#111111';
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.style.color = textColor;
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', String(W));
    bg.setAttribute('height', String(H));
    bg.setAttribute('fill', bgColor);
    clone.insertBefore(bg, clone.firstChild);
    const markup = new XMLSerializer().serializeToString(clone);
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
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'surface.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, 'image/png');
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, []);

  const btnCls =
    'flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]';
  const chip = (active: boolean) =>
    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
    (active
      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
      : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]');

  if (!compiled) {
    return (
      <div className="my-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-3 text-[13px] text-[var(--color-text-secondary)]">
        Could not read this 3D surface. Use x and y, for example x^2 + y^2 or sin(x)*cos(y).
      </div>
    );
  }

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
          onPointerLeave={endPointer}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(0, 72%, 52%)" />
              <stop offset="50%" stopColor="hsl(125, 72%, 48%)" />
              <stop offset="100%" stopColor="hsl(250, 72%, 55%)" />
            </linearGradient>
          </defs>

          {faces.map((f, i) => (
            <polygon
              key={'f' + i}
              points={f.pts}
              fill={f.fill}
              stroke={f.stroke}
              strokeWidth={wire ? 1 : 0.5}
              strokeLinejoin="round"
            />
          ))}

          <g stroke="currentColor" strokeOpacity={0.5} strokeWidth={1}>
            <line x1={r1(axes.o.sx)} y1={r1(axes.o.sy)} x2={r1(axes.xEnd.sx)} y2={r1(axes.xEnd.sy)} />
            <line x1={r1(axes.o.sx)} y1={r1(axes.o.sy)} x2={r1(axes.yEnd.sx)} y2={r1(axes.yEnd.sy)} />
            <line x1={r1(axes.o.sx)} y1={r1(axes.o.sy)} x2={r1(axes.zEnd.sx)} y2={r1(axes.zEnd.sy)} />
          </g>
          <g fontSize={12} fill="currentColor" fillOpacity={0.8} textAnchor="middle">
            <text x={r1(axes.xLab.sx)} y={r1(axes.xLab.sy)}>x</text>
            <text x={r1(axes.yLab.sx)} y={r1(axes.yLab.sy)}>y</text>
            <text x={r1(axes.zLab.sx)} y={r1(axes.zLab.sy)}>z</text>
          </g>

          <g>
            <rect x={W - 24} y={46} width={12} height={H - 110} rx={3} fill={'url(#' + gradId + ')'} stroke="currentColor" strokeOpacity={0.2} />
            <text x={W - 18} y={40} fontSize={10} textAnchor="middle" fill="currentColor" fillOpacity={0.7}>{fmt(grid.zMax)}</text>
            <text x={W - 18} y={H - 50} fontSize={10} textAnchor="middle" fill="currentColor" fillOpacity={0.7}>{fmt(grid.zMin)}</text>
          </g>
        </svg>

        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button type="button" onClick={() => setZoom((z) => clamp(z * 1.2, 0.3, 6))} className={btnCls} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" onClick={() => setZoom((z) => clamp(z * 0.8, 0.3, 6))} className={btnCls} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
          <button type="button" onClick={resetView} className={btnCls} aria-label="Reset view"><RotateCcw className="h-4 w-4" /></button>
          <button type="button" onClick={downloadImage} className={btnCls} aria-label="Save as image"><Download className="h-4 w-4" /></button>
        </div>

        <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] shadow-sm">
          z = {compiled.expr}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setWire((v) => !v)} className={chip(wire)}><Grid3x3 className="h-3.5 w-3.5" />Wireframe</button>
        <button type="button" onClick={() => setSpin((v) => !v)} className={chip(spin)}>{spin ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{spin ? 'Stop' : 'Spin'}</button>
        <div className="ml-1 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <span>range \u00b1{domain}</span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={domain}
            onChange={(e) => setDomain(Number(e.target.value))}
            className="h-1 w-28 cursor-pointer accent-[var(--color-accent)]"
          />
        </div>
      </div>

      <div className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">Drag to rotate \u00b7 scroll to zoom \u00b7 adjust range \u00b7 toggle wireframe or spin</div>
    </div>
  );
}
