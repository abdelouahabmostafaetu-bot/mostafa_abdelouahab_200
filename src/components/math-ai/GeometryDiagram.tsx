'use client';

import { useMemo } from 'react';

/**
 * Renders a `geometry` fenced block as a clean, auto-scaled SVG diagram.
 *
 * Spec is line-based (one command per line). Supported commands:
 *   point NAME x y            define a labeled point
 *   segment P1 P2 [label]     a segment between two points (optional side label)
 *   line P1 P2 [label]        alias of segment
 *   dashed segment P1 P2      a dashed segment
 *   polygon P1 P2 P3 ...      a closed, lightly filled polygon
 *   triangle P1 P2 P3         alias of polygon
 *   circle cx cy r [label]    a circle by center and radius
 *   angle P1 V P2 [label]     mark the angle at vertex V (label, or "right")
 *   right P1 V P2             mark a right angle at vertex V
 *   label x y text...         free-floating text at a coordinate
 * Lines starting with # are comments.
 */

const W = 460;
const H = 360;
const PAD = 42;

const SHAPE = '#6366f1';
const ANGLE_COLOR = '#f43f5e';
const CIRCLE_COLOR = '#10b981';

type Pt = { x: number; y: number };
type Seg = { a: string; b: string; label?: string; dashed?: boolean };
type Poly = { names: string[] };
type Circ = { x: number; y: number; r: number; label?: string };
type Ang = { p1: string; v: string; p2: string; label?: string; right?: boolean };
type FreeLabel = { x: number; y: number; text: string };
type Parsed = {
  points: Record<string, Pt>;
  order: string[];
  segs: Seg[];
  polys: Poly[];
  circles: Circ[];
  angles: Ang[];
  labels: FreeLabel[];
};

const r1 = (v: number) => Math.round(v * 10) / 10;

function parse(spec: string): Parsed {
  const points: Record<string, Pt> = {};
  const order: string[] = [];
  const segs: Seg[] = [];
  const polys: Poly[] = [];
  const circles: Circ[] = [];
  const angles: Ang[] = [];
  const labels: FreeLabel[] = [];

  for (const raw of spec.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const tok = line.split(/\s+/);
    const cmd = tok[0].toLowerCase();

    if (cmd === 'point' && tok.length >= 4) {
      const x = Number(tok[2]);
      const y = Number(tok[3]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        points[tok[1]] = { x, y };
        if (!order.includes(tok[1])) order.push(tok[1]);
      }
    } else if ((cmd === 'segment' || cmd === 'line') && tok.length >= 3) {
      segs.push({ a: tok[1], b: tok[2], label: tok.slice(3).join(' ') || undefined });
    } else if (cmd === 'dashed' && (tok[1] === 'segment' || tok[1] === 'line') && tok.length >= 4) {
      segs.push({ a: tok[2], b: tok[3], label: tok.slice(4).join(' ') || undefined, dashed: true });
    } else if ((cmd === 'polygon' || cmd === 'triangle') && tok.length >= 4) {
      polys.push({ names: tok.slice(1) });
    } else if (cmd === 'circle' && tok.length >= 4) {
      const x = Number(tok[1]);
      const y = Number(tok[2]);
      const r = Number(tok[3]);
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(r) && r > 0) {
        circles.push({ x, y, r, label: tok.slice(4).join(' ') || undefined });
      }
    } else if (cmd === 'angle' && tok.length >= 4) {
      const rest = tok.slice(4).join(' ');
      const isRight = rest.toLowerCase() === 'right';
      angles.push({ p1: tok[1], v: tok[2], p2: tok[3], label: isRight ? undefined : rest || undefined, right: isRight });
    } else if (cmd === 'right' && tok.length >= 4) {
      angles.push({ p1: tok[1], v: tok[2], p2: tok[3], right: true });
    } else if (cmd === 'label' && tok.length >= 4) {
      const x = Number(tok[1]);
      const y = Number(tok[2]);
      if (Number.isFinite(x) && Number.isFinite(y)) labels.push({ x, y, text: tok.slice(3).join(' ') });
    }
  }
  return { points, order, segs, polys, circles, angles, labels };
}

function unit(dx: number, dy: number): Pt {
  const m = Math.hypot(dx, dy) || 1;
  return { x: dx / m, y: dy / m };
}

export default function GeometryDiagram({ spec }: { spec: string }) {
  const data = useMemo(() => parse(spec), [spec]);

  const xs: number[] = [];
  const ys: number[] = [];
  for (const n of data.order) {
    xs.push(data.points[n].x);
    ys.push(data.points[n].y);
  }
  for (const c of data.circles) {
    xs.push(c.x - c.r, c.x + c.r);
    ys.push(c.y - c.r, c.y + c.r);
  }
  for (const l of data.labels) {
    xs.push(l.x);
    ys.push(l.y);
  }

  if (xs.length === 0) {
    return (
      <div className="my-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-2 text-[13px] text-[var(--color-text-secondary)]">
        Could not read this diagram.
      </div>
    );
  }

  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const scale = Math.min((W - 2 * PAD) / rangeX, (H - 2 * PAD) / rangeY);
  const offX = (W - 2 * PAD - rangeX * scale) / 2;
  const offY = (H - 2 * PAD - rangeY * scale) / 2;
  const sx = (x: number) => PAD + offX + (x - minX) * scale;
  const sy = (y: number) => H - PAD - offY - (y - minY) * scale;

  let cx = 0;
  let cy = 0;
  for (const n of data.order) {
    cx += data.points[n].x;
    cy += data.points[n].y;
  }
  const cnt = data.order.length || 1;
  cx /= cnt;
  cy /= cnt;

  const nodes: React.ReactNode[] = [];

  // Circles.
  data.circles.forEach((c, i) => {
    nodes.push(
      <circle key={'c' + i} cx={r1(sx(c.x))} cy={r1(sy(c.y))} r={r1(c.r * scale)} fill={CIRCLE_COLOR} fillOpacity={0.06} stroke={CIRCLE_COLOR} strokeWidth={2} />,
    );
    if (c.label) {
      nodes.push(
        <text key={'cl' + i} x={r1(sx(c.x))} y={r1(sy(c.y) - c.r * scale - 6)} fontSize={12} textAnchor="middle" fill="currentColor" fillOpacity={0.85}>{c.label}</text>,
      );
    }
  });

  // Polygons.
  data.polys.forEach((p, i) => {
    const pts = p.names.filter((n) => data.points[n]).map((n) => r1(sx(data.points[n].x)) + ',' + r1(sy(data.points[n].y)));
    if (pts.length >= 3) {
      nodes.push(<polygon key={'pg' + i} points={pts.join(' ')} fill={SHAPE} fillOpacity={0.08} stroke={SHAPE} strokeWidth={2} strokeLinejoin="round" />);
    }
  });

  // Segments.
  data.segs.forEach((s, i) => {
    const A = data.points[s.a];
    const B = data.points[s.b];
    if (!A || !B) return;
    const ax = sx(A.x);
    const ay = sy(A.y);
    const bx = sx(B.x);
    const by = sy(B.y);
    nodes.push(
      <line
        key={'s' + i}
        x1={r1(ax)}
        y1={r1(ay)}
        x2={r1(bx)}
        y2={r1(by)}
        stroke={SHAPE}
        strokeWidth={2}
        strokeDasharray={s.dashed ? '6 4' : undefined}
      />,
    );
    if (s.label) {
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const nrm = unit(-(by - ay), bx - ax);
      nodes.push(
        <text key={'sl' + i} x={r1(mx + nrm.x * 12)} y={r1(my + nrm.y * 12 + 3)} fontSize={11.5} textAnchor="middle" fill="currentColor" fillOpacity={0.85}>{s.label}</text>,
      );
    }
  });

  // Angle markers.
  data.angles.forEach((a, i) => {
    const V = data.points[a.v];
    const A = data.points[a.p1];
    const B = data.points[a.p2];
    if (!V || !A || !B) return;
    const v = { x: sx(V.x), y: sy(V.y) };
    const pa = { x: sx(A.x), y: sy(A.y) };
    const pb = { x: sx(B.x), y: sy(B.y) };
    const u1 = unit(pa.x - v.x, pa.y - v.y);
    const u2 = unit(pb.x - v.x, pb.y - v.y);
    if (a.right) {
      const q = 14;
      const c1 = { x: v.x + u1.x * q, y: v.y + u1.y * q };
      const c2 = { x: v.x + (u1.x + u2.x) * q, y: v.y + (u1.y + u2.y) * q };
      const c3 = { x: v.x + u2.x * q, y: v.y + u2.y * q };
      nodes.push(
        <polyline key={'an' + i} points={r1(c1.x) + ',' + r1(c1.y) + ' ' + r1(c2.x) + ',' + r1(c2.y) + ' ' + r1(c3.x) + ',' + r1(c3.y)} fill="none" stroke={ANGLE_COLOR} strokeWidth={1.6} />,
      );
    } else {
      const rad = 20;
      const a1 = Math.atan2(pa.y - v.y, pa.x - v.x);
      const a2 = Math.atan2(pb.y - v.y, pb.x - v.x);
      let delta = a2 - a1;
      while (delta <= -Math.PI) delta += 2 * Math.PI;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      const start = { x: v.x + rad * Math.cos(a1), y: v.y + rad * Math.sin(a1) };
      const end = { x: v.x + rad * Math.cos(a2), y: v.y + rad * Math.sin(a2) };
      const large = Math.abs(delta) > Math.PI ? 1 : 0;
      const sweep = delta > 0 ? 1 : 0;
      nodes.push(
        <path key={'an' + i} d={'M ' + r1(start.x) + ' ' + r1(start.y) + ' A ' + rad + ' ' + rad + ' 0 ' + large + ' ' + sweep + ' ' + r1(end.x) + ' ' + r1(end.y)} fill="none" stroke={ANGLE_COLOR} strokeWidth={1.6} />,
      );
      if (a.label) {
        const am = a1 + delta / 2;
        nodes.push(
          <text key={'all' + i} x={r1(v.x + (rad + 13) * Math.cos(am))} y={r1(v.y + (rad + 13) * Math.sin(am) + 3)} fontSize={11.5} textAnchor="middle" fill={ANGLE_COLOR}>{a.label}</text>,
        );
      }
    }
  });

  // Points + their labels.
  data.order.forEach((n, i) => {
    const P = data.points[n];
    const px = sx(P.x);
    const py = sy(P.y);
    let dirx = P.x - cx;
    let diry = -(P.y - cy);
    if (Math.hypot(dirx, diry) < 1e-6) {
      dirx = 1;
      diry = -1;
    }
    const u = unit(dirx, diry);
    nodes.push(<circle key={'pt' + i} cx={r1(px)} cy={r1(py)} r={3.2} fill={SHAPE} stroke="var(--color-bg)" strokeWidth={1.5} />);
    nodes.push(
      <text key={'ptl' + i} x={r1(px + u.x * 14)} y={r1(py + u.y * 14 + 4)} fontSize={12.5} fontWeight={600} textAnchor="middle" fill="currentColor">{n}</text>,
    );
  });

  // Free labels.
  data.labels.forEach((l, i) => {
    nodes.push(
      <text key={'fl' + i} x={r1(sx(l.x))} y={r1(sy(l.y))} fontSize={12} textAnchor="middle" fill="currentColor" fillOpacity={0.9}>{l.text}</text>,
    );
  });

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-[var(--color-text)]">
      <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" preserveAspectRatio="xMidYMid meet" role="img" className="h-auto w-full">
        {nodes}
      </svg>
    </div>
  );
}
