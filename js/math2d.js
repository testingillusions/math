const EPS = 1e-6;

function v(x, y) {
  return { x, y };
}

function clone(p) {
  return { x: p.x, y: p.y };
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(a, s) {
  return { x: a.x * s, y: a.y * s };
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

function len(a) {
  return Math.hypot(a.x, a.y);
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function norm(a) {
  const l = len(a);
  return l < EPS ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

function perp(a) {
  return { x: -a.y, y: a.x };
}

function rotate(p, angle, origin = { x: 0, y: 0 }) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const q = sub(p, origin);
  return add(origin, { x: q.x * c - q.y * s, y: q.x * s + q.y * c });
}

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function projectOnLine(p, origin, direction) {
  const d = norm(direction);
  if (len(d) < EPS) return clone(origin);
  const t = dot(sub(p, origin), d);
  return add(origin, scale(d, t));
}

function reflectAcrossLine(p, origin, direction) {
  const proj = projectOnLine(p, origin, direction);
  return add(proj, sub(proj, p));
}

function angleAt(prev, vertex, next) {
  const u = sub(prev, vertex);
  const w = sub(next, vertex);
  const lu = len(u);
  const lw = len(w);
  if (lu < EPS || lw < EPS) return 0;
  const cos = clamp(dot(u, w) / (lu * lw), -1, 1);
  return Math.acos(cos);
}

function heading(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function angleBetween(a, b) {
  const la = len(a);
  const lb = len(b);
  if (la < EPS || lb < EPS) return 0;
  return Math.acos(clamp(dot(a, b) / (la * lb), -1, 1));
}

function acuteAngleBetween(a, b) {
  const t = angleBetween(a, b);
  return Math.min(t, Math.PI - t);
}

function nearlyEqual(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

function nearlyParallel(u, v, tol = 0.06) {
  const a = norm(u);
  const b = norm(v);
  if (len(a) < EPS || len(b) < EPS) return false;
  return Math.abs(cross(a, b)) <= tol;
}

function nearlyPerp(u, v, tol = 0.08) {
  const a = norm(u);
  const b = norm(v);
  if (len(a) < EPS || len(b) < EPS) return false;
  return Math.abs(dot(a, b)) <= tol;
}

function lineIntersection(p1, p2, p3, p4) {
  const r = sub(p2, p1);
  const s = sub(p4, p3);
  const denom = cross(r, s);
  if (Math.abs(denom) < EPS) return null;
  const t = cross(sub(p3, p1), s) / denom;
  return add(p1, scale(r, t));
}

function shoelace(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function pointInQuad(p, pts) {
  let inside = false;
  for (let i = 0, j = 3; i < 4; j = i++) {
    const a = pts[i];
    const b = pts[j];
    const crosses = (a.y > p.y) !== (b.y > p.y);
    if (crosses && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y + EPS) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function keepInBounds(p, bounds, pad = 28) {
  return {
    x: clamp(p.x, bounds.x + pad, bounds.x + bounds.w - pad),
    y: clamp(p.y, bounds.y + pad, bounds.y + bounds.h - pad),
  };
}

function formatPx(n) {
  return `${Math.round(n)} px`;
}

function formatDeg(rad) {
  return `${(rad * 180 / Math.PI).toFixed(1)}°`;
}

function formatRatio(a, b) {
  return `${Math.round(a)} / ${Math.round(b)}`;
}
